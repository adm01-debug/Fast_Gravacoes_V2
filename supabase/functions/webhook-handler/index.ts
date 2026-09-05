import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { WebhookPayloadSchema, WebhookResponseSchema, validateContract } from "../_shared/contracts.ts";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { createLogger, getOrCreateRequestId, withRequestId } from "../_shared/logger.ts";

import { checkRateLimit } from "../_shared/rateLimit.ts";

export const handler = async (req: Request): Promise<Response> => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  const requestId = getOrCreateRequestId(req);
  const log = createLogger({ fn: "webhook-handler", requestId });
  const started = Date.now();
  const jsonHeaders = withRequestId({ ...getCorsHeaders(req), "Content-Type": "application/json" }, requestId);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Rate limit: 120 webhooks/min per source IP.
    const rateLimited = await checkRateLimit(supabase, {
      endpoint: "webhook-handler",
      identity: { ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") },
      max: 120,
      windowSeconds: 60,
      corsHeaders: withRequestId(getCorsHeaders(req), requestId),
      requestId,
    });
    if (rateLimited) {
      log.warn("rate_limited");
      return rateLimited;
    }

    const signature = req.headers.get("x-webhook-signature");
    const bodyText = await req.text();
    let payload;
    try {
      payload = JSON.parse(bodyText);
    } catch (_e) {
      log.warn("payload.invalid_json", { bytes: bodyText.length });
      return new Response(JSON.stringify({ error: "Invalid JSON payload", requestId }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const validation = await validateContract(WebhookPayloadSchema, payload);

    if (!validation.success) {
      log.warn("contract.validation_failed", { details: validation.details });
      return new Response(JSON.stringify({
        error: validation.error,
        details: validation.details,
        requestId,
      }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const { source, event, data } = validation.data;
    const sanitizedData = data;
    const scoped = log.child({ source, event });

    const secret = Deno.env.get(`WEBHOOK_SECRET_${source.toUpperCase()}`);
    if (!secret) {
      scoped.error("hmac.secret_missing");
      return new Response(JSON.stringify({ error: "Webhook source not configured", requestId }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const sigBuffer = new Uint8Array(
      signature?.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBuffer,
      encoder.encode(bodyText)
    );

    if (!isValid) {
      scoped.error("hmac.invalid_signature");
      return new Response(JSON.stringify({ error: "Invalid signature", requestId }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const { error: logError } = await supabase.from("webhook_logs").insert({
      source,
      event,
      payload: sanitizedData,
      created_at: new Date().toISOString(),
    });

    if (logError) {
      scoped.error("webhook_logs.insert_failed", logError);
    }

    let result = { processed: true };

    switch (source) {
      case "bitrix24":
        result = await processBitrix24Webhook(supabase, event, sanitizedData, scoped);
        break;
      case "stripe":
        result = await processStripeWebhook(supabase, event, sanitizedData, scoped);
        break;
      default:
        scoped.info("source.unknown");
    }

    const responsePayload = {
      ...result,
      source,
      event,
      timestamp: new Date().toISOString(),
      requestId,
    };

    const responseValidation = WebhookResponseSchema.safeParse(responsePayload);
    if (!responseValidation.success) {
      scoped.error("response.contract_failed", responseValidation.error);
    }

    scoped.info("webhook.processed", { latencyMs: Date.now() - started });
    return new Response(JSON.stringify(responsePayload), { headers: jsonHeaders });
  } catch (error) {
    log.error("unhandled_error", error, { latencyMs: Date.now() - started });
    return new Response(JSON.stringify({ error: "Internal server error", requestId }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
};

if (import.meta.main) {
  serve(handler);
}

// deno-lint-ignore no-explicit-any
type Supa = any;
// deno-lint-ignore no-explicit-any
type EventData = any;
interface ScopedLogger {
  info(m: string, e?: Record<string, unknown>): void;
  warn(m: string, e?: Record<string, unknown>): void;
  error(m: string, err?: unknown, e?: Record<string, unknown>): void;
}

async function processBitrix24Webhook(supabase: Supa, event: string, data: EventData, log: ScopedLogger) {
  log.info("bitrix24.event_received");

  const { error: logError } = await supabase.from("bitrix24_sync_history").insert({
    sync_type: 'webhook',
    status: 'partial',
    triggered_by: 'webhook',
    error_message: 'logged_only: Bitrix24 → jobs mapping not yet implemented',
    details: { event, data },
    completed_at: new Date().toISOString(),
  });
  if (logError) {
    log.error("bitrix24_sync_history.insert_failed", logError);
  }

  return {
    source: "bitrix24",
    event,
    processed: false,
    status: 'logged_only',
    detail: 'Bitrix24 → jobs mapping not yet implemented',
    timestamp: new Date().toISOString(),
  };
}

async function processStripeWebhook(_supabase: Supa, event: string, _data: EventData, log: ScopedLogger) {
  log.info("stripe.event_received");
  return {
    source: "stripe",
    event,
    processed: false,
    status: 'logged_only',
    detail: event === 'checkout.session.completed'
      ? 'Stripe checkout handler not yet implemented'
      : 'No handler for this Stripe event',
    timestamp: new Date().toISOString(),
  };
}
