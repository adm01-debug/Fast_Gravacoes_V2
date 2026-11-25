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

/**
 * O que gravar em `push_notifications` depois de tentar (ou não) o envio.
 *
 * `confirmado` marca `cron_email_sent` e só existe para e-mail que o
 * provedor aceitou — é esse marcador que impede o reenvio. Sem ele, `aviso_no_app`
 * grava `cron_alert`, que alimenta a central de notificações do aplicativo sem
 * afirmar envio de e-mail; `nada` evita repetir o aviso a cada rodada.
 */
export type RegistroAlerta = "confirmado" | "aviso_no_app" | "nada";

export function decidirRegistroAlerta(emailSaiu: boolean, jaAvisadoNoApp: boolean): RegistroAlerta {
  if (emailSaiu) return "confirmado";
  return jaAvisadoNoApp ? "nada" : "aviso_no_app";
}

export type MarcadorRow = { data: unknown; user_id: string | null };

/**
 * `jobid` -> destinatários que já têm aquele marcador.
 *
 * Serve para os três marcadores lidos em `push_notifications`
 * (`cron_email_sent`, `cron_alert` e os avisos `cron_failure`/`cron_stale`
 * gravados por `snapshot_cron_health()`).
 */
export function agruparMarcadores(
  rows: MarcadorRow[] | null | undefined,
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const row of rows ?? []) {
    const jobid = String((row.data as Record<string, unknown> | null)?.jobid ?? "");
    if (!jobid) continue;
    const quem = map.get(jobid) ?? new Set<string>();
    if (row.user_id) quem.add(row.user_id);
    map.set(jobid, quem);
  }
  return map;
}

/**
 * O marcador só vale quando existe para TODOS os destinatários ativos.
 *
 * A RLS de `push_notifications` permite que cada usuário autenticado insira a
 * própria notificação, então uma linha isolada — inclusive uma forjada — não
 * pode servir de prova de que o aviso já foi dado ao grupo.
 */
export function marcadorParaTodos(
  map: Map<string, Set<string>>,
  jobid: string | number,
  recipientIds: string[],
): boolean {
  const quem = map.get(String(jobid));
  if (!quem || recipientIds.length === 0) return false;
  return recipientIds.every((id) => quem.has(id));
}
