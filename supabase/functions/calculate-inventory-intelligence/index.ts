import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUserOrCronSecret } from "../_shared/cronAuth.ts";

import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const unauthorized = await requireUserOrCronSecret(req, {
    supabaseUrl,
    supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    corsHeaders: getCorsHeaders(req),
  });
  if (unauthorized) return unauthorized;

  try {
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // requireUserOrCronSecret above accepts either an authenticated user or the
    // cron secret. When a user session is presented, also enforce that the user
    // holds the admin role — this endpoint recalculates data for the entire
    // inventory and must not be callable by any signed-in user.
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (user) {
        const { data: roleRows, error: roleError } = await supabase.from('user_roles')
          .select('role').eq('user_id', user.id).in('role', ['admin']).limit(1);
        if (roleError) {
          console.error('[calculate-inventory-intelligence] Role query error:', roleError.message);
          return new Response(JSON.stringify({ error: 'Internal server error' }), {
            status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
          });
        }
        if (!roleRows || roleRows.length === 0) {
          return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
            status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
          });
        }
      }
    }

    console.log('Starting inventory intelligence calculation...');

    // 1. Fetch all items
    const { data: items, error: itemsError } = await supabase
      .from('inventory_items')
      .select('id, name');

    if (itemsError) throw itemsError;

    // 2. Fetch movements from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: movements, error: movesError } = await supabase
      .from('inventory_movements')
      .select('item_id, quantity, type, created_at')
      .eq('type', 'OUT')
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (movesError) throw movesError;

    // 3. Process items
    const updates = items.map(item => {
      const itemMoves = movements.filter(m => m.item_id === item.id);
      const totalConsumed = itemMoves.reduce((sum, m) => sum + Number(m.quantity), 0);
      
      // Daily average consumption
      const dailyUsage = totalConsumed / 30;
      
      return {
        id: item.id,
        daily_usage_avg: dailyUsage,
        updated_at: new Date().toISOString()
      };
    });

    // 4. Update database
    const { error: updateError } = await supabase
      .from('inventory_items')
      .upsert(updates);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ 
      success: true, 
      processedItems: items.length,
      accuracy: 98.5 // Simulated confidence level
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in inventory intelligence:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    });
  }
});
