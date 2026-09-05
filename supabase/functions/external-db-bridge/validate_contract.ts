import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const EDGE_FUNCTION_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/external-db-bridge`;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function testBridge() {
  console.log("🚀 Starting Edge Function Contract Validation...");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_ROLE_KEY);

  const tests = [
    {
      name: "Select Action Contract",
      payload: {
        action: "select",
        table: "job_status_audit",
        params: { limit: 1 }
      },
      validate: (res: any) => res.data && Array.isArray(res.data) && res.meta && typeof res.meta.duration_ms === "number"
    },
    {
      name: "RPC Action Contract",
      payload: {
        action: "rpc",
        rpc: "get_user_role",
        params: { p_user_id: "00000000-0000-0000-0000-000000000000" } // Dummy UUID
      },
      validate: (res: any) => res.data !== undefined && res.meta
    },
    {
      name: "Error Handling Contract",
      payload: {
        action: "select",
        table: "non_existent_table"
      },
      validate: (res: any) => res.error && res.telemetry && res.telemetry.severity === "error"
    }
  ];

  let passed = 0;
  for (const test of tests) {
    try {
      console.log(`\nTesting: ${test.name}...`);
      const response = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify(test.payload),
        signal: AbortSignal.timeout(15_000),
      });

      const body = await response.json();
      if (test.validate(body)) {
        console.log(`✅ ${test.name} passed.`);
        passed++;
      } else {
        console.error(`❌ ${test.name} failed validation.`, body);
      }
    } catch (err) {
      console.error(`❌ ${test.name} exception:`, err);
    }
  }

  console.log(`\n📊 Summary: ${passed}/${tests.length} tests passed.`);
  if (passed !== tests.length) Deno.exit(1);
}

testBridge();
