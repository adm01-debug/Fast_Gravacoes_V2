/**
 * Decisão de "o e-mail realmente saiu?" separada do envio.
 *
 * Existe porque `resend.emails.send()` não lança em erro de API: devolve
 * `{ data: null, error }`. Código que só aguardava a promise gravava
 * `email_sent: true` mesmo com 403/422/429 do provedor, então o histórico
 * afirmava um contato que nunca aconteceu. O mesmo vale para o caminho HTTP
 * cru (fetch), onde `res.ok` era a única checagem e a falta da credencial
 * caía no ramo que marcava envio.
 */

export type EmailSendOutcome = {
  ok: boolean;
  /** Motivo legível quando `ok === false`; `null` quando saiu. */
  reason: string | null;
};

export const MOTIVO_SEM_CREDENCIAL = "RESEND_API_KEY ausente";

/** Classifica o retorno do SDK do Resend. */
export function classifyResendSend(
  result:
    | { data?: { id?: string | null } | null; error?: { message?: string | null } | null }
    | null
    | undefined,
): EmailSendOutcome {
  if (!result) return { ok: false, reason: "sem resposta do provedor" };
  if (result.error) {
    return { ok: false, reason: result.error.message ?? "erro do provedor" };
  }
  if (!result.data?.id) {
    return { ok: false, reason: "provedor não devolveu id da mensagem" };
  }
  return { ok: true, reason: null };
}

/** Classifica a resposta crua de `POST https://api.resend.com/emails`. */
export function classifyResendHttp(status: number, body: string): EmailSendOutcome {
  if (status >= 200 && status < 300) return { ok: true, reason: null };
  const detalhe = body.trim().slice(0, 200);
  return { ok: false, reason: detalhe ? `HTTP ${status}: ${detalhe}` : `HTTP ${status}` };
}
