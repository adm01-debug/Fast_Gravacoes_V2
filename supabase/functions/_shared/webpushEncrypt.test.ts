import { encryptPushPayload } from "./webpushEncrypt.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(bytes: Uint8Array<ArrayBuffer>): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...arrays: Uint8Array<ArrayBuffer>[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(arrays.reduce((n, a) => n + a.length, 0));
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

async function hmacSha256(key: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

async function hkdfExtract(salt: Uint8Array<ArrayBuffer>, ikm: Uint8Array<ArrayBuffer>) {
  return hmacSha256(salt, ikm);
}

async function hkdfExpand(prk: Uint8Array<ArrayBuffer>, info: Uint8Array<ArrayBuffer>, length: number) {
  const t = await hmacSha256(prk, concat(info, new Uint8Array([1])));
  return t.slice(0, length);
}

Deno.test("encryptPushPayload produz corpo aes128gcm descriptografável (RFC 8291/8188)", async () => {
  // Subscription "do navegador": par P-256 + auth secret de 16B
  const uaKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey("raw", uaKeys.publicKey));
  const authSecret = crypto.getRandomValues(new Uint8Array(16));

  const subscription = { p256dh: base64UrlEncode(uaPublic), auth: base64UrlEncode(authSecret) };
  const payload = JSON.stringify({ title: "Teste", body: "corpo da notificação" });

  const body = await encryptPushPayload(subscription, payload);

  // Layout: salt(16) || rs(4) || idlen(1) || as_public(65) || ciphertext(>=17)
  assertEquals(body.length > 16 + 4 + 1 + 65 + 16, true);
  const salt = body.slice(0, 16);
  const rs = new DataView(body.buffer, 16, 4).getUint32(0, false);
  assertEquals(rs, 4096);
  const idlen = body[20];
  assertEquals(idlen, 65);
  const asPublic = body.slice(21, 21 + idlen);
  const ciphertext = body.slice(21 + idlen);

  // Descriptografa como o navegador faria: ECDH com a chave efêmera do corpo
  const asKey = await crypto.subtle.importKey("raw", asPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: asKey }, uaKeys.privateKey, 256)
  );

  const prkKey = await hkdfExtract(authSecret, ecdhSecret);
  const keyInfo = concat(encoder.encode("WebPush: info"), new Uint8Array([0]), uaPublic, asPublic);
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, encoder.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdfExpand(prk, encoder.encode("Content-Encoding: nonce\0"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["decrypt"]);
  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, aesKey, ciphertext)
  );

  // Último byte é o delimitador de fim de padding (0x02)
  assertEquals(plaintext[plaintext.length - 1], 2);
  assertEquals(decoder.decode(plaintext.slice(0, -1)), payload);
});

Deno.test("encryptPushPayload aceita p256dh/auth em base64url", async () => {
  const uaKeys = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey("raw", uaKeys.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));

  // bytes que produzem '+' e '/' em base64 normal — deve aceitar '-' e '_'
  const p256dh = base64UrlEncode(uaPublic);
  const authB64 = base64UrlEncode(auth);
  assert(!p256dh.includes("+") && !p256dh.includes("/"));

  const body = await encryptPushPayload({ p256dh, auth: authB64 }, "oi");
  assert(body.length > 100);
  void base64UrlToBytes;
});
