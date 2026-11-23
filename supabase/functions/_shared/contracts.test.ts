import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { 
  WebhookPayloadSchema, 
  ERPJobRequestSchema, 
  validateContract 
} from "./contracts.ts";

Deno.test("Webhook Contract - Valid Payload", async () => {
  const payload = {
    source: "stripe",
    event: "payment_intent.succeeded",
    data: { id: "pi_123", amount: 1000 },
    timestamp: new Date().toISOString()
  };
  
  const result = await validateContract(WebhookPayloadSchema, payload);
  assertEquals(result.success, true);
});

Deno.test("Webhook Contract - Invalid Source", async () => {
  const payload = {
    source: "invalid_source",
    event: "test",
    data: {}
  };
  
  const result = await validateContract(WebhookPayloadSchema, payload);
  assertEquals(result.success, false);
});

Deno.test("ERP Job Contract - Valid Request", async () => {
  const payload = {
    order_number: "ORD-001",
    client: "Acme Corp",
    product: "Engraved Pen",
    quantity: 50,
    technique_id: "laser-co2",
    priority: "high",
    scheduled_date: "2026-05-20"
  };
  
  const result = await validateContract(ERPJobRequestSchema, payload);
  assertEquals(result.success, true);
});

Deno.test("ERP Job Contract - Missing Required Field", async () => {
  const payload = {
    order_number: "ORD-001",
    // client missing
    product: "Engraved Pen",
    quantity: 50,
    technique_id: "laser-co2"
  };
  
  const result = await validateContract(ERPJobRequestSchema, payload);
  assertEquals(result.success, false);
});

Deno.test("ERP Job Contract - Invalid Priority", async () => {
  const payload = {
    order_number: "ORD-001",
    client: "Acme Corp",
    product: "Engraved Pen",
    quantity: 50,
    technique_id: "laser-co2",
    priority: "super-urgent" // Invalid enum value
  };
  
  const result = await validateContract(ERPJobRequestSchema, payload);
  assertEquals(result.success, false);
});
