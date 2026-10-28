/**
 * Web Push payload encryption — RFC 8291 (Message Encryption for Web Push)
 * combined with RFC 8188 (aes128gcm content encoding).
 *
 * Sem isso o endpoint enviava `Content-Encoding: aes128gcm` com o payload em
 * texto claro: o push service devolvia 400 ou o navegador descartava a
 * mensagem por não conseguir descriptografar.
 *
 * Fluxo: ECDH efêmero (P-256) -> HKDF-SHA256 -> AES-128-GCM, com o corpo no
 * formato aes128gcm: salt(16) || rs(4) || idlen(1) || server_pubkey(65) ||
 * ciphertext.
 */

const encoder = new TextEncoder();

function concat(...arrays: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function base64UrlToBytes(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

/** HKDF-Extract: PRK = HMAC-Hash(salt, IKM) — RFC 5869 §2.2 */
async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  return hmacSha256(salt, ikm);
}

/**
 * HKDF-Expand para L <= 32 (um único bloco T(1) = HMAC(PRK, info || 0x01)).
 * CEK (16B) e NONCE (12B) e o IKM (32B) nunca passam de um bloco SHA-256.
 */
async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const t = await hmacSha256(prk, concat(info, new Uint8Array([1])));
  return t.slice(0, length);
}

/**
 * Criptografa o payload para uma subscription Web Push.
 * Retorna o corpo cifrado no formato aes128gcm.
 */
export async function encryptPushPayload(
  subscription: { p256dh: string; auth: string },
  payload: string,
  recordSize = 4096
): Promise<Uint8Array> {
  const uaPublic = base64UrlToBytes(subscription.p256dh);
  const authSecret = base64UrlToBytes(subscription.auth);

  // 1. Par ECDH efêmero do servidor
  const serverKeys = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const asPublic = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeys.publicKey)
  );

  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: uaKey },
      serverKeys.privateKey,
      256
    )
  );

  // 2. Cadeia de derivação (RFC 8291 §3.4)
  const prkKey = await hkdfExtract(authSecret, ecdhSecret);
  const keyInfo = concat(
    encoder.encode("WebPush: info"),
    new Uint8Array([0]),
    uaPublic,
    asPublic
  );
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfExpand(prk, encoder.encode("Content-Encoding: nonce\0"), 12);

  // 3. Padding do último record: plaintext || 0x02 (RFC 8188 §2)
  const plaintext = concat(encoder.encode(payload), new Uint8Array([2]));

  // 4. AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aesKey, plaintext)
  );

  // 5. Corpo aes128gcm: salt || rs(4 BE) || idlen(1) || server_pubkey || ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, recordSize, false);

  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, ciphertext);
}
