import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { z } from "npm:zod";

// Define a schema for contract tests to ensure consistency
const ContractTestResultSchema = z.object({
  status: z.number(),
  isValid: z.boolean(),
  body: z.any(),
});

/**
 * Helper to perform contract validation tests against a handler
 */
export async function testContract(
  handler: (req: Request) => Promise<Response>,
  payload: any,
  expectedStatus: number,
  description: string
) {
  const req = new Request("http://localhost:8000", {
    method: "POST",
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
    headers: { "Content-Type": "application/json" }
  });

  const resp = await handler(req);
  
  assertEquals(
    resp.status, 
    expectedStatus, 
    `Contract failed: ${description}. Expected ${expectedStatus} but got ${resp.status}`
  );

  const body = await resp.json();
  
  return {
    status: resp.status,
    body
  };
}
