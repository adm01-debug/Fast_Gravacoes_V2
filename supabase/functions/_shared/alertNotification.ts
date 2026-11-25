/**
 * Mensagem e metadados do aviso de rotina automática (`cron-alert-email`),
 * separados do handler para serem verificáveis por teste.
 *
 * Regra: o texto só afirma envio de e-mail quando o e-mail realmente saiu, e o
 * metadado `email_enviado` acompanha essa verdade. O marcador de deduplicação
 * (`cron_email_sent`) só é usado no envio concluído — aviso de envio não
 * realizado tem tipo próprio (`cron_alert_undelivered`) para não bloquear um
 * envio real dentro da janela de deduplicação.
 */
export type AlertKind = "failure" | "stale";

export interface AlertNotificationInput {
  /** Nome da rotina (ou `job <id>`) usado no texto. */
  label: string;
  kind: AlertKind;
  /** O provedor aceitou o envio? */
  delivered: boolean;
  /** Houve tentativa de envio recusada pelo provedor (distingue de "sem chave"). */
  providerRejected?: boolean;
}

export interface AlertNotification {
  title: string;
  body: string;
  data: {
    type: "cron_email_sent" | "cron_alert_undelivered";
    email_enviado: boolean;
    kind: AlertKind;
    route: string;
    severity: "critical" | "warning";
  };
}

export function buildAlertNotification(input: AlertNotificationInput): AlertNotification {
  const { label, kind, delivered, providerRejected = false } = input;
  const motivo = providerRejected
    ? "(o provedor de e-mail recusou o envio)"
    : "(serviço de e-mail não configurado)";

  return {
    title: kind === "failure" ? "Rotina automática falhando" : "Rotina automática silenciosa",
    body: delivered
      ? `E-mail de alerta enviado sobre ${label}.`
      : `Atenção: a rotina ${label} segue com problema e o e-mail de alerta não foi enviado ${motivo}.`,
    data: {
      type: delivered ? "cron_email_sent" : "cron_alert_undelivered",
      email_enviado: delivered,
      kind,
      route: "/admin/monitoring",
      severity: kind === "failure" ? "critical" : "warning",
    },
  };
}