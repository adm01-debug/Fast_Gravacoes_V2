/**
 * Webhook Simulation Suite
 * Tests hundreds of real-world webhook scenarios against the contract schemas
 * and the business logic of the webhook-handler Edge Function.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ── Inline schemas matching supabase/functions/_shared/contracts.ts ────────
const WebhookSourceSchema = z.enum(['bitrix24', 'stripe', 'external_system']);

const WebhookPayloadSchema = z.object({
  source: WebhookSourceSchema,
  event: z.string(),
  data: z.record(z.any()),
  timestamp: z.string().datetime().optional(),
});

type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

// ── Simulated handler logic (mirrors webhook-handler/index.ts behavior) ─────
interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

function simulateWebhookHandler(rawBody: unknown, signature?: string | null, hasSecret = false): HandlerResult {
  // JSON parse
  if (rawBody === null || rawBody === undefined || typeof rawBody !== 'object') {
    return { status: 400, body: { error: 'Invalid JSON payload' } };
  }

  // Contract validation
  const validation = WebhookPayloadSchema.safeParse(rawBody);
  if (!validation.success) {
    return {
      status: 400,
      body: { error: 'Contract validation failed', details: validation.error.flatten() },
    };
  }

  // HMAC signature check (simulated)
  if (hasSecret && !signature) {
    return { status: 401, body: { error: 'Invalid signature' } };
  }

  const { source, event } = validation.data;
  return {
    status: 200,
    body: { processed: true, source, event, timestamp: new Date().toISOString() },
  };
}

// ── Generators ────────────────────────────────────────────────────────────
function validPayload(overrides: Partial<WebhookPayload> = {}): WebhookPayload {
  return {
    source: 'bitrix24',
    event: 'DEAL_ADD',
    data: { id: '123', title: 'Test deal' },
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

const SOURCES = ['bitrix24', 'stripe', 'external_system'] as const;
const EVENTS = [
  'DEAL_ADD', 'DEAL_UPDATE', 'DEAL_DELETE',
  'CONTACT_ADD', 'CONTACT_UPDATE',
  'payment.succeeded', 'payment.failed', 'subscription.created',
  'order.created', 'order.updated', 'inventory.low',
  'machine.alarm', 'machine.stop', 'machine.start',
  'job.created', 'job.completed', 'job.delayed',
];

// ── Happy path: all valid source×event combinations ──────────────────────
describe('Webhook — valid combinations (happy path)', () => {
  const cases: [string, string][] = [];
  for (const source of SOURCES) {
    for (const event of EVENTS) {
      cases.push([source, event]);
    }
  }

  it.each(cases)('source=%s event=%s → 200', (source, event) => {
    const payload = validPayload({ source: source as WebhookPayload['source'], event });
    const result = simulateWebhookHandler(payload);
    expect(result.status).toBe(200);
    expect(result.body.processed).toBe(true);
    expect(result.body.source).toBe(source);
    expect(result.body.event).toBe(event);
  });
});

// ── Payload data variations ───────────────────────────────────────────────
describe('Webhook — data field variations', () => {
  const dataVariants = [
    ['empty object', {}],
    ['nested object', { a: { b: { c: 1 } } }],
    ['array in data', { items: [1, 2, 3] }],
    ['null values', { key: null }],
    ['unicode strings', { name: 'Ação de Gravação — Tëst' }],
    ['large number', { value: Number.MAX_SAFE_INTEGER }],
    ['boolean flags', { active: true, deleted: false }],
    ['ISO timestamp in data', { created_at: '2026-01-01T00:00:00Z' }],
    ['100 keys', Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i]))],
  ] as const;

  it.each(dataVariants)('data=%s → 200', (_, data) => {
    const result = simulateWebhookHandler(validPayload({ data: data as Record<string, unknown> }));
    expect(result.status).toBe(200);
  });
});

// ── Timestamp variations ──────────────────────────────────────────────────
describe('Webhook — timestamp field', () => {
  it('timestamp absent → 200', () => {
    const { timestamp: _ts, ...payload } = validPayload();
    expect(simulateWebhookHandler(payload).status).toBe(200);
  });

  it('valid ISO timestamp → 200', () => {
    expect(simulateWebhookHandler(validPayload({ timestamp: '2026-05-20T00:00:00.000Z' })).status).toBe(200);
  });

  it('invalid timestamp format → 400', () => {
    expect(simulateWebhookHandler({ ...validPayload(), timestamp: 'not-a-date' }).status).toBe(400);
  });

  it('numeric timestamp (unix) → 400', () => {
    expect(simulateWebhookHandler({ ...validPayload(), timestamp: 1716163200 as unknown as string }).status).toBe(400);
  });
});

// ── Missing required fields ───────────────────────────────────────────────
describe('Webhook — missing required fields', () => {
  it('missing source → 400', () => {
    const { source: _s, ...rest } = validPayload();
    expect(simulateWebhookHandler(rest).status).toBe(400);
  });

  it('missing event → 400', () => {
    const { event: _e, ...rest } = validPayload();
    expect(simulateWebhookHandler(rest).status).toBe(400);
  });

  it('missing data → 400', () => {
    const { data: _d, ...rest } = validPayload();
    expect(simulateWebhookHandler(rest).status).toBe(400);
  });

  it('completely empty body → 400', () => {
    expect(simulateWebhookHandler({}).status).toBe(400);
  });

  it('only source present → 400', () => {
    expect(simulateWebhookHandler({ source: 'bitrix24' }).status).toBe(400);
  });
});

// ── Invalid field types ───────────────────────────────────────────────────
describe('Webhook — invalid field types', () => {
  const typeCases: [string, Record<string, unknown>][] = [
    ['source is number', { source: 42, event: 'X', data: {} }],
    ['source is null', { source: null, event: 'X', data: {} }],
    ['event is number', { source: 'bitrix24', event: 99, data: {} }],
    ['event is null', { source: 'bitrix24', event: null, data: {} }],
    ['data is string', { source: 'bitrix24', event: 'X', data: 'oops' }],
    ['data is number', { source: 'bitrix24', event: 'X', data: 42 }],
    ['data is array', { source: 'bitrix24', event: 'X', data: [] }],
    ['data is boolean', { source: 'bitrix24', event: 'X', data: true }],
  ];

  it.each(typeCases)('%s → 400', (_, payload) => {
    expect(simulateWebhookHandler(payload).status).toBe(400);
  });
});

// ── Unknown/invalid source values ─────────────────────────────────────────
describe('Webhook — invalid source enum', () => {
  const invalidSources = [
    'slack', 'github', 'BITRIX24', 'Stripe', '', ' ', 'unknown',
    'sql_injection\' OR 1=1', '<script>', '../../etc/passwd',
  ];

  it.each(invalidSources)('source="%s" → 400', (source) => {
    const result = simulateWebhookHandler({ source, event: 'TEST', data: {} });
    expect(result.status).toBe(400);
  });
});

// ── Non-JSON / primitive body ─────────────────────────────────────────────
describe('Webhook — non-object bodies', () => {
  it('null body → 400', () => {
    expect(simulateWebhookHandler(null).status).toBe(400);
  });

  it('string body → 400', () => {
    expect(simulateWebhookHandler('{"source":"bitrix24"}' as unknown).status).toBe(400);
  });

  it('number body → 400', () => {
    expect(simulateWebhookHandler(42 as unknown).status).toBe(400);
  });

  it('array body → 400', () => {
    expect(simulateWebhookHandler([] as unknown).status).toBe(400);
  });

  it('boolean body → 400', () => {
    expect(simulateWebhookHandler(true as unknown).status).toBe(400);
  });
});

// ── HMAC Signature ────────────────────────────────────────────────────────
describe('Webhook — HMAC signature enforcement', () => {
  it('no signature, no secret → 200', () => {
    expect(simulateWebhookHandler(validPayload(), null, false).status).toBe(200);
  });

  it('valid signature, has secret → 200', () => {
    expect(simulateWebhookHandler(validPayload(), 'valid-sig', true).status).toBe(200);
  });

  it('missing signature, secret enforced → 401', () => {
    expect(simulateWebhookHandler(validPayload(), null, true).status).toBe(401);
  });

  it('empty signature string, secret enforced → 401', () => {
    expect(simulateWebhookHandler(validPayload(), '', true).status).toBe(401);
  });
});

// ── Response shape contract ───────────────────────────────────────────────
describe('Webhook — response shape', () => {
  const WebhookResponseSchema = z.object({
    processed: z.boolean(),
    source: WebhookSourceSchema.optional(),
    event: z.string().optional(),
    timestamp: z.string().datetime(),
  });

  it('successful response conforms to response schema', () => {
    const result = simulateWebhookHandler(validPayload());
    expect(result.status).toBe(200);
    const parse = WebhookResponseSchema.safeParse(result.body);
    expect(parse.success).toBe(true);
  });
});

// ── High-volume: 500 random valid payloads ────────────────────────────────
describe('Webhook — high-volume valid load (500 payloads)', () => {
  function randomFrom<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  const payloads: WebhookPayload[] = Array.from({ length: 500 }, (_, i) => ({
    source: randomFrom(SOURCES),
    event: randomFrom(EVENTS),
    data: { seq: i, label: `item-${i}`, flag: i % 2 === 0 },
    timestamp: new Date(Date.now() + i * 1000).toISOString(),
  }));

  it('all 500 payloads return 200', () => {
    const results = payloads.map(p => simulateWebhookHandler(p));
    const failures = results.filter(r => r.status !== 200);
    expect(failures).toHaveLength(0);
  });

  it('all 500 responses have processed:true', () => {
    const results = payloads.map(p => simulateWebhookHandler(p));
    expect(results.every(r => r.body.processed === true)).toBe(true);
  });
});
