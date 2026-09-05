import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { requireCronSecret } from "../_shared/cronAuth.ts"

const BUFFER_TARGET = 3

import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    // Allow either a verified cron invocation (x-cron-secret) OR an
    // authenticated coordinator/manager/admin call. A missing Authorization header no
    // longer implies "trusted cron" — that was bypassable by simply omitting
    // the header, running job-state mutations unauthenticated.
    const authHeader = req.headers.get('Authorization')
    if (authHeader) {
      const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user } } = await userClient.auth.getUser()
      if (!user) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
      const { data: roleRows } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)
      const roles = (roleRows ?? []).map((r: { role: string }) => r.role)
      if (!roles.some((role) => ['coordinator', 'manager', 'admin'].includes(role))) {
        return new Response(JSON.stringify({ error: 'Sem permissão' }), {
          status: 403,
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        })
      }
    } else {
      // failClosed: this function mutates job statuses across the board;
      // must not run unauthenticated on an unconfigured deployment.
      const unauthorized = requireCronSecret(req, { failClosed: true, corsHeaders: getCorsHeaders(req) })
      if (unauthorized) return unauthorized
    }

    console.log('Starting auto-promotion check...')

    // 1. Fetch all techniques
    const { data: techniques, error: techError } = await supabaseClient
      .from('techniques')
      .select('id, name')

    if (techError) throw techError

    const results = []

    for (const technique of techniques || []) {
      // 2. Count current 'ready' jobs for this technique
      const { count: readyCount, error: countError } = await supabaseClient
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('technique_id', technique.id)
        .eq('status', 'ready')

      if (countError) {
        console.error(`Error counting ready jobs for ${technique.name}:`, countError)
        continue
      }

      const neededCount = Math.max(0, BUFFER_TARGET - (readyCount || 0))

      if (neededCount > 0) {
        // 3. Fetch 'queue' jobs to promote
        // Priority order: urgent (0), high (1), medium (2), low (3)
        // We'll use a CASE statement in the order by if possible, or just fetch and sort in JS
        // Since it's a small number of jobs to promote, fetching first 10-20 and sorting is fine
        const { data: queueJobs, error: queueError } = await supabaseClient
          .from('jobs')
          .select('id, priority, created_at, order_number')
          .eq('technique_id', technique.id)
          .eq('status', 'queue')
          .order('created_at', { ascending: true }) // Default fallback
          .limit(20)

        if (queueError) {
          console.error(`Error fetching queue jobs for ${technique.name}:`, queueError)
          continue
        }

        if (queueJobs && queueJobs.length > 0) {
          // Sort by priority (urgent -> high -> medium -> low)
          const priorityMap: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
          const sortedJobs = queueJobs.sort((a, b) => {
            const pA = priorityMap[a.priority as string] ?? 2
            const pB = priorityMap[b.priority as string] ?? 2
            if (pA !== pB) return pA - pB
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          })

          const jobsToPromote = sortedJobs.slice(0, neededCount)
          const jobIds = jobsToPromote.map(j => j.id)

          if (jobIds.length > 0) {
            const { error: updateError } = await supabaseClient
              .from('jobs')
              .update({
                status: 'ready',
                updated_at: new Date().toISOString()
              })
              .in('id', jobIds)
              // Guard: only promote jobs still in 'queue' — without this, a job
              // that moved to 'production' between the fetch and this update would
              // be silently regressed back to 'ready'.
              .eq('status', 'queue')

            if (updateError) {
              console.error(`Error promoting jobs for ${technique.name}:`, updateError)
            } else {
              console.log(`Promoted ${jobIds.length} jobs for ${technique.name}`)
              results.push({
                technique: technique.name,
                count: jobIds.length,
                jobs: jobsToPromote.map(j => j.order_number)
              })
            }
          }
        }
      }
    }

    // 4. Stuck Jobs Detection (Bonus Excellence)
    // Find jobs in 'ready' status for more than 4 hours that haven't moved
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
    const { data: stuckJobs, error: stuckError } = await supabaseClient
      .from('jobs')
      .select('id, order_number, status, updated_at')
      .eq('status', 'ready')
      .lt('updated_at', fourHoursAgo)

    if (stuckError) {
      console.error('Error checking for stuck jobs:', stuckError)
    } else if (stuckJobs && stuckJobs.length > 0) {
      console.warn(`Detected ${stuckJobs.length} stuck jobs in buffer:`, stuckJobs.map(j => j.order_number))
      // In a real scenario, we might want to alert someone or tag them
      // For now, we'll just log it as excellence in monitoring
    }

    return new Response(JSON.stringify({ 
      success: true, 
      promoted: results,
      stuckDetected: stuckJobs?.length || 0
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: unknown) {
    console.error('Unexpected error:', error instanceof Error ? error.message : String(error))
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
