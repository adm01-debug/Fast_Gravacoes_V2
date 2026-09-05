import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  ERPJobRequestSchema,
  ERPJobPatchSchema,
  ERPListResponseSchema,
  ERPLotRequestSchema,
  validateContract,
} from "../_shared/contracts.ts";

import { getCorsHeaders } from "../_shared/cors.ts";
import { createLogger, getOrCreateRequestId, withRequestId } from "../_shared/logger.ts";

function jsonResponse(req: Request, data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
  });
}

async function validateApiKey(req: Request, supabase: ReturnType<typeof createClient>): Promise<boolean> {
  const authHeader = req.headers.get('authorization');
  const apiKey = req.headers.get('x-api-key');

  // Accept a Supabase user JWT, but only for an elevated role — this API
  // exposes full ERP CRUD (jobs) and operator PII (profiles); any logged-in
  // user's JWT previously passed this check regardless of role.
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      const { data: roleRows } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true);
      const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
      if (roles.some((role: string) => ['coordinator', 'manager', 'admin'].includes(role))) {
        return true;
      }
    }
  }

  // Accept configured API keys stored in DB
  if (apiKey) {
    const { data, error } = await supabase
      .from('erp_api_keys')
      .select('id, is_active')
      .eq('key_hash', await hashKey(apiKey))
      .eq('is_active', true)
      .maybeSingle();
    if (!error && data) return true;
  }

  return false;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const API_DOCS = {
  version: "1.0.0",
  title: "API de Integração ERP - FAST GRAVAÇÕES",
  description: "API REST para integração com sistemas ERP externos",
  authentication: "Bearer token (Supabase JWT) ou x-api-key header",
  endpoints: [
    { method: "GET", path: "/jobs", description: "Lista jobs de produção" },
    { method: "GET", path: "/jobs/:id", description: "Busca job por ID" },
    { method: "POST", path: "/jobs", description: "Cria novo job" },
    { method: "PATCH", path: "/jobs/:id", description: "Atualiza job existente" },
    { method: "GET", path: "/machines", description: "Lista máquinas ativas" },
    { method: "GET", path: "/operators", description: "Lista operadores" },
    { method: "GET", path: "/production/summary", description: "Resumo de produção do dia" },
    { method: "GET", path: "/lots", description: "Lista lotes" },
    { method: "POST", path: "/lots", description: "Cria lote" },
    { method: "GET", path: "/kpis", description: "KPIs de produção" },
  ],
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const requestId = getOrCreateRequestId(req);
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const erpIndex = pathParts.indexOf('erp-api');
  const apiPath = erpIndex !== -1 ? pathParts.slice(erpIndex + 1) : [];
  const endpoint = apiPath[0] || '';
  const resourceId = apiPath[1];
  const log = createLogger({ fn: "erp-api", requestId, method: req.method, path: apiPath.join('/') });
  const jsonHeaders = withRequestId({ ...getCorsHeaders(req), 'Content-Type': 'application/json' }, requestId);

  log.info("request.received");

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  if (endpoint === '' || endpoint === 'docs') {
    return jsonResponse(req, API_DOCS);
  }

  let isAuthorized: boolean;
  try {
    isAuthorized = await validateApiKey(req, supabase);
  } catch (authError: unknown) {
    log.error("auth.error", authError);
    return new Response(JSON.stringify({ error: 'Internal Server Error', requestId }), { status: 500, headers: jsonHeaders });
  }
  if (!isAuthorized) {
    log.warn("auth.unauthorized");
    return new Response(JSON.stringify({ error: 'Unauthorized', message: 'Missing or invalid authentication', requestId }), { status: 401, headers: jsonHeaders });
  }

  try {
    switch (endpoint) {
      case 'jobs':
        return await handleJobs(req, supabase, resourceId, url);
      case 'machines':
        return await handleMachines(req, supabase);
      case 'operators':
        return await handleOperators(req, supabase);
      case 'lots':
        return await handleLots(req, supabase, resourceId, url);
      case 'production':
        if (apiPath[1] === 'summary') return await handleProductionSummary(req, supabase, url);
        break;
      case 'kpis':
        return await handleKPIs(req, supabase, url);
      default:
        return new Response(JSON.stringify({ error: 'Not Found', message: `Endpoint /${endpoint} not found`, requestId }), { status: 404, headers: jsonHeaders });
    }
  } catch (error: unknown) {
    log.error("handler.error", error);
    return new Response(JSON.stringify({ error: 'Internal Server Error', requestId }), { status: 500, headers: jsonHeaders });
  }

  return new Response(JSON.stringify({ error: 'Not Found', requestId }), { status: 404, headers: jsonHeaders });
});

async function handleJobs(req: Request, supabase: ReturnType<typeof createClient>, jobId: string | undefined, url: URL): Promise<Response> {
  const method = req.method;

  if (method === 'GET') {
    if (jobId) {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, machine:machines(name, code), technique:techniques(name)')
        .eq('id', jobId)
        .single();
      if (error) throw error;
      return jsonResponse(req, data);
    }

    const status = url.searchParams.get('status');
    const date = url.searchParams.get('date');
    const parsedLimit = parseInt(url.searchParams.get('limit') || '100', 10);
    const parsedOffset = parseInt(url.searchParams.get('offset') || '0', 10);
    // Clamp limit to [1, 200] so zero/negative values can't break .range().
    const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 100, 1), 200);
    const offset = Math.max(Number.isFinite(parsedOffset) ? parsedOffset : 0, 0);

    let query = supabase
      .from('jobs')
      .select('*, machine:machines(name, code), technique:techniques(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (date) query = query.eq('scheduled_date', date);

    const { data, error, count } = await query;
    if (error) throw error;
    return jsonResponse(req, { data, total: count, limit, offset });
  }

  if (method === 'POST') {
    const body = await req.json();
    const validation = await validateContract(ERPJobRequestSchema, body);
    if (!validation.success) {
      return jsonResponse(req, { error: validation.error, message: "Invalid job data", details: validation.details }, 400);
    }

    const { data, error } = await supabase
      .from('jobs')
      .insert({ ...validation.data, status: 'queue' })
      .select()
      .single();

    if (error) throw error;
    return jsonResponse(req, data, 201);
  }

  if (method === 'PATCH' && jobId) {
    const body = await req.json();
    const validation = await validateContract(ERPJobPatchSchema, body);
    if (!validation.success) {
      return jsonResponse(req, { error: validation.error, message: "Invalid patch data", details: validation.details }, 400);
    }

    const { data, error } = await supabase
      .from('jobs')
      .update(validation.data)
      .eq('id', jobId)
      .select()
      .single();

    if (error) throw error;
    return jsonResponse(req, data);
  }

  return jsonResponse(req, { error: 'Method not allowed' }, 405);
}

async function handleMachines(req: Request, supabase: ReturnType<typeof createClient>): Promise<Response> {
  if (req.method !== 'GET') return jsonResponse(req, { error: 'Method not allowed' }, 405);
  const { data, error } = await supabase.from('machines').select('*, technique:techniques(name)').eq('is_active', true).order('name');
  if (error) throw error;
  return jsonResponse(req, data);
}

async function handleOperators(req: Request, supabase: ReturnType<typeof createClient>): Promise<Response> {
  if (req.method !== 'GET') return jsonResponse(req, { error: 'Method not allowed' }, 405);
  const { data, error } = await supabase.from('profiles').select('id, full_name, created_at').order('full_name');
  if (error) throw error;
  return jsonResponse(req, data);
}

async function handleLots(req: Request, supabase: ReturnType<typeof createClient>, lotId: string | undefined, url: URL): Promise<Response> {
  if (req.method === 'GET') {
    if (lotId) {
      const { data, error } = await supabase.from('production_lots').select('*').eq('id', lotId).single();
      if (error) throw error;
      return jsonResponse(req, data);
    }
    const parsedLimit = parseInt(url.searchParams.get('limit') || '100', 10);
    const limit = Math.min(Math.max(Number.isFinite(parsedLimit) ? parsedLimit : 100, 1), 200);
    const { data, error } = await supabase.from('production_lots').select('*').order('created_at', { ascending: false }).limit(limit);
    if (error) throw error;
    return jsonResponse(req, data);
  }

  if (req.method === 'POST') {
    const body = await req.json();
    const validation = await validateContract(ERPLotRequestSchema, body);
    if (!validation.success) {
      return jsonResponse(req, { error: validation.error, message: "Invalid lot data", details: validation.details }, 400);
    }
    const { data, error } = await supabase.from('production_lots').insert(validation.data).select().single();
    if (error) throw error;
    return jsonResponse(req, data, 201);
  }

  return jsonResponse(req, { error: 'Method not allowed' }, 405);
}

async function handleProductionSummary(req: Request, supabase: ReturnType<typeof createClient>, url: URL): Promise<Response> {
  if (req.method !== 'GET') return jsonResponse(req, { error: 'Method not allowed' }, 405);
  const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
  const { data: jobs, error } = await supabase.from('jobs').select('status, quantity, produced_quantity, lost_pieces').eq('scheduled_date', date).limit(1000);
  if (error) throw error;
  const summary = {
    date,
    total_jobs: jobs.length,
    completed: jobs.filter((j: { status: string }) => j.status === 'finished').length,
    in_progress: jobs.filter((j: { status: string }) => j.status === 'production').length,
    pending: jobs.filter((j: { status: string }) => ['queue', 'ready', 'scheduled'].includes(j.status)).length,
    total_planned: jobs.reduce((s: number, j: { quantity: number }) => s + (j.quantity || 0), 0),
    total_produced: jobs.reduce((s: number, j: { produced_quantity: number }) => s + (j.produced_quantity || 0), 0),
    total_losses: jobs.reduce((s: number, j: { lost_pieces: number }) => s + (j.lost_pieces || 0), 0),
    efficiency: 0,
  };
  const total_planned = summary.total_planned;
  if (total_planned > 0) summary.efficiency = Math.round((summary.total_produced / total_planned) * 100);
  return jsonResponse(req, summary);
}

async function handleKPIs(req: Request, supabase: ReturnType<typeof createClient>, url: URL): Promise<Response> {
  if (req.method !== 'GET') return jsonResponse(req, { error: 'Method not allowed' }, 405);
  const today = new Date().toISOString().split('T')[0];
  const [jobsResult, machinesResult, alertsResult] = await Promise.all([
    supabase.from('jobs').select('status, quantity, produced_quantity, lost_pieces').eq('scheduled_date', today).limit(1000),
    supabase.from('machines').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('spc_alerts').select('*', { count: 'exact', head: true }).is('resolved_at', null),
  ]);
  if (jobsResult.error) throw jobsResult.error;
  if (machinesResult.error) throw machinesResult.error;
  if (alertsResult.error) throw alertsResult.error;
  const { data: todayJobs } = jobsResult;
  const { count: machinesCount } = machinesResult;
  const { count: alertsCount } = alertsResult;
  const jobs = todayJobs || [];
  const totalPlanned = jobs.reduce((s: number, j: { quantity: number }) => s + (j.quantity || 0), 0);
  const totalProduced = jobs.reduce((s: number, j: { produced_quantity: number }) => s + (j.produced_quantity || 0), 0);
  const totalLosses = jobs.reduce((s: number, j: { lost_pieces: number }) => s + (j.lost_pieces || 0), 0);
  return jsonResponse(req, {
    date: today,
    production: {
      jobs_total: jobs.length,
      jobs_completed: jobs.filter((j: { status: string }) => j.status === 'finished').length,
      jobs_in_progress: jobs.filter((j: { status: string }) => j.status === 'production').length,
      planned_quantity: totalPlanned,
      produced_quantity: totalProduced,
      losses: totalLosses,
      efficiency_percent: totalPlanned > 0 ? Math.round((totalProduced / totalPlanned) * 100) : 0,
      yield_percent: totalProduced > 0 ? Math.round(((totalProduced - totalLosses) / totalProduced) * 100) : 100,
    },
    resources: { machines_active: machinesCount || 0, active_alerts: alertsCount || 0 },
  });
}
