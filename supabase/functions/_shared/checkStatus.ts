/**
 * Vocabulario de status aceito pelo banco.
 *
 * `public.edge_health_history.status` tem CHECK ('pass','warn','fail'), mas o
 * `health-check` responde 'healthy' | 'degraded' | 'unhealthy'. Quem grava
 * precisa converter: sem isso o insert e rejeitado pelo CHECK e o valor nunca
 * chega a `get_system_status_summary()` (que fica sempre 'unknown').
 */
export type CheckStatus = "pass" | "warn" | "fail";

const STATUS_ALIASES: Record<string, CheckStatus> = {
  pass: "pass",
  healthy: "pass",
  ok: "pass",
  warn: "warn",
  warning: "warn",
  degraded: "warn",
  fail: "fail",
  error: "fail",
  unhealthy: "fail",
  outage: "fail",
};

/** Converte qualquer um dos dois vocabularios para pass/warn/fail. */
export function toCheckStatus(raw: unknown): CheckStatus {
  return STATUS_ALIASES[String(raw ?? "").trim().toLowerCase()] ?? "fail";
}