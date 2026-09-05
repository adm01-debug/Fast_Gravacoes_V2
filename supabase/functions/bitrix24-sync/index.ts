import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { getCorsHeaders } from "../_shared/cors.ts";

// OAuth credentials from environment (initial values)
const BITRIX24_WEBHOOK_URL = Deno.env.get('BITRIX24_WEBHOOK_URL');
const BITRIX24_CLIENT_ID = Deno.env.get('BITRIX24_CLIENT_ID');
const BITRIX24_CLIENT_SECRET = Deno.env.get('BITRIX24_CLIENT_SECRET');
const BITRIX24_ACCESS_TOKEN_ENV = Deno.env.get('BITRIX24_ACCESS_TOKEN');
const BITRIX24_REFRESH_TOKEN_ENV = Deno.env.get('BITRIX24_REFRESH_TOKEN');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
// Shared secret Bitrix24 must send (as ?token= query param or x-bitrix-webhook-secret
// header) on its outgoing webhook so action=webhook cannot be triggered by anyone else.
const BITRIX24_WEBHOOK_SECRET = Deno.env.get('BITRIX24_WEBHOOK_SECRET');

// Base URL for Bitrix24 REST API (configurado via secret BITRIX24_DOMAIN — sem tenant hardcoded)
const BITRIX24_DOMAIN = Deno.env.get('BITRIX24_DOMAIN');
if (!BITRIX24_DOMAIN) {
  console.error('[bitrix24-sync] BITRIX24_DOMAIN secret is not configured — OAuth endpoints will fail until set');
}

// Token refresh buffer (refresh 5 minutes before expiry)
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

interface OAuthTokens {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
}

// Get current valid tokens from database or environment
async function getValidTokens(supabase: any): Promise<OAuthTokens | null> {
  // First, check database for stored tokens
  const { data: storedTokens, error } = await supabase
    .from('bitrix24_oauth_tokens')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (storedTokens) {
    const expiresAt = new Date(storedTokens.expires_at);
    const now = new Date();
    
    // Check if token is still valid (with buffer)
    if (expiresAt.getTime() - now.getTime() > TOKEN_REFRESH_BUFFER_MS) {
      console.log('Using stored token, expires at:', expiresAt.toISOString());
      return {
        access_token: storedTokens.access_token,
        refresh_token: storedTokens.refresh_token,
        expires_at: expiresAt
      };
    }
    
    // Token expired or about to expire, try to refresh
    console.log('Stored token expired or expiring soon, refreshing...');
    const refreshed = await refreshAccessToken(storedTokens.refresh_token, supabase);
    if (refreshed) {
      return refreshed;
    }
    
    // Refresh failed - don't fallback to env tokens if we had stored tokens
    // This prevents using stale env tokens when reauthorization is needed
    return null;
  }

  // No stored tokens, check if we should try environment variables
  // Only use env tokens on first setup, not after reauthorization failures
  if (BITRIX24_ACCESS_TOKEN_ENV && BITRIX24_REFRESH_TOKEN_ENV && !needsReauthorization) {
    console.log('Using environment tokens for initial setup...');
    // Store initial tokens from environment with 1 hour expiry
    const expiresAt = new Date(Date.now() + 3600 * 1000);
    
    await saveTokens(supabase, {
      access_token: BITRIX24_ACCESS_TOKEN_ENV,
      refresh_token: BITRIX24_REFRESH_TOKEN_ENV,
      expires_at: expiresAt
    });
    
    return {
      access_token: BITRIX24_ACCESS_TOKEN_ENV,
      refresh_token: BITRIX24_REFRESH_TOKEN_ENV,
      expires_at: expiresAt
    };
  }

  return null;
}

// Track if reauthorization is needed
let needsReauthorization = false;
let reauthorizationReason = '';

// Refresh access token using refresh token
async function refreshAccessToken(refreshToken: string, supabase: any): Promise<OAuthTokens | null> {
  try {
    console.log('Refreshing Bitrix24 access token...');
    
    if (!BITRIX24_CLIENT_ID || !BITRIX24_CLIENT_SECRET) {
      console.error('Missing OAuth credentials (CLIENT_ID or CLIENT_SECRET)');
      needsReauthorization = true;
      reauthorizationReason = 'Credenciais OAuth não configuradas (CLIENT_ID ou CLIENT_SECRET)';
      return null;
    }
    
    const refreshUrl = `${BITRIX24_DOMAIN}/oauth/token/?` + new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: BITRIX24_CLIENT_ID,
      client_secret: BITRIX24_CLIENT_SECRET,
      refresh_token: refreshToken
    });

    const response = await fetch(refreshUrl, { method: 'POST', signal: AbortSignal.timeout(15_000) });
    const responseText = await response.text();
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error('Invalid JSON response from token refresh:', responseText);
      needsReauthorization = true;
      reauthorizationReason = 'Resposta inválida do servidor Bitrix24';
      return null;
    }
    
    if (!response.ok || data.error) {
      console.error('Token refresh failed:', response.status, data);
      
      // Check for specific errors that require reauthorization
      if (data.error === 'invalid_token' || data.error === 'invalid_grant' || 
          data.error === 'expired_token' || data.error === 'invalid_request') {
        needsReauthorization = true;
        reauthorizationReason = `Token inválido ou expirado: ${data.error_description || data.error}. Reautorização necessária.`;
        
        // Clear invalid tokens from database
        await supabase.from('bitrix24_oauth_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        console.log('Invalid tokens cleared from database');
      }
      return null;
    }

    // Bitrix24 returns expires_in in seconds (usually 3600)
    const expiresIn = data.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const tokens: OAuthTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt
    };

    // Save new tokens to database
    await saveTokens(supabase, tokens);
    
    // Reset reauthorization flag on success
    needsReauthorization = false;
    reauthorizationReason = '';
    
    console.log('Token refreshed successfully, expires at:', expiresAt.toISOString());
    return tokens;
  } catch (error) {
    console.error('Token refresh exception:', error);
    needsReauthorization = true;
    reauthorizationReason = `Erro ao renovar token: ${error}`;
    return null;
  }
}

// Generate a HMAC-signed, time-bound state token for OAuth CSRF protection
async function generateOAuthState(): Promise<string> {
  const ts = Date.now().toString();
  const keyMat = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!keyMat) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(keyMat), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(ts)));
  const sigHex = Array.from(sig).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${ts}.${sigHex}`;
}

async function verifyOAuthState(state: string): Promise<boolean> {
  if (!state) return false;
  const dot = state.lastIndexOf('.');
  if (dot === -1) return false;
  const ts = state.slice(0, dot);
  const sig = state.slice(dot + 1);
  const tsNum = parseInt(ts, 10);
  if (isNaN(tsNum) || Date.now() - tsNum > 15 * 60 * 1000) return false;
  const keyMat = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!keyMat) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(keyMat), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(ts)));
  const expectedHex = Array.from(expected).map(b => b.toString(16).padStart(2, '0')).join('');
  return sig === expectedHex;
}

// Generate OAuth authorization URL for reauthorization
function getAuthorizationUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: BITRIX24_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: redirectUri,
    state
  });
  return `${BITRIX24_DOMAIN}/oauth/authorize/?${params.toString()}`;
}

// Exchange authorization code for tokens
async function exchangeCodeForTokens(code: string, redirectUri: string, supabase: any): Promise<OAuthTokens | null> {
  try {
    console.log('Exchanging authorization code for tokens...');
    
    if (!BITRIX24_CLIENT_ID || !BITRIX24_CLIENT_SECRET) {
      console.error('Missing OAuth credentials');
      return null;
    }
    
    const tokenUrl = `${BITRIX24_DOMAIN}/oauth/token/?` + new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: BITRIX24_CLIENT_ID,
      client_secret: BITRIX24_CLIENT_SECRET,
      code: code,
      redirect_uri: redirectUri
    });

    const response = await fetch(tokenUrl, { method: 'POST', signal: AbortSignal.timeout(15_000) });
    const data = await response.json();
    
    if (!response.ok || data.error) {
      console.error('Token exchange failed:', data);
      return null;
    }

    const expiresIn = data.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    const tokens: OAuthTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt
    };

    // Save new tokens to database
    await saveTokens(supabase, tokens);
    
    // Reset reauthorization flag
    needsReauthorization = false;
    reauthorizationReason = '';
    
    console.log('Token exchange successful, expires at:', expiresAt.toISOString());
    return tokens;
  } catch (error) {
    console.error('Token exchange exception:', error);
    return null;
  }
}

// Save tokens to database
async function saveTokens(supabase: any, tokens: OAuthTokens): Promise<void> {
  try {
    // Delete old tokens first
    await supabase.from('bitrix24_oauth_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Insert new tokens
    const { error } = await supabase.from('bitrix24_oauth_tokens').insert({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_at.toISOString()
    });

    if (error) {
      console.error('Error saving tokens:', error);
    } else {
      console.log('Tokens saved to database');
    }
  } catch (error) {
    console.error('Exception saving tokens:', error);
  }
}

interface BitrixDeal {
  ID: string;
  TITLE: string;
  STAGE_ID: string;
  [key: string]: any; // Allow dynamic UF_CRM_* fields
}

// Dynamic mapping cache
interface MappingCache {
  fieldMapping: Record<string, string[]>;
  techniqueMapping: Record<string, string>;
  priorityMapping: Record<string, string>;
  stageToStatus: Record<string, string>;
  statusToStage: Record<string, string>;
  loadedAt: number;
}

let mappingCache: MappingCache | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute cache

// Load mappings from database
async function loadMappingsFromDB(supabase: any): Promise<MappingCache> {
  // Check cache
  if (mappingCache && Date.now() - mappingCache.loadedAt < CACHE_TTL_MS) {
    return mappingCache;
  }

  console.log('Loading field mappings from database...');
  
  const { data: mappings, error } = await supabase
    .from('bitrix24_field_mappings')
    .select('*')
    .eq('is_active', true)
    .order('priority', { ascending: true });

  if (error) {
    console.error('Error loading mappings:', error);
    // Return fallback defaults
    return getDefaultMappings();
  }

  const fieldMapping: Record<string, string[]> = {};
  const techniqueMapping: Record<string, string> = {};
  const priorityMapping: Record<string, string> = {};
  const stageToStatus: Record<string, string> = {};
  const statusToStage: Record<string, string> = {};

  for (const mapping of mappings || []) {
    switch (mapping.mapping_type) {
      case 'field':
        if (!fieldMapping[mapping.source_key]) {
          fieldMapping[mapping.source_key] = [];
        }
        fieldMapping[mapping.source_key].push(mapping.target_key);
        break;
      case 'technique':
        techniqueMapping[mapping.source_key.toLowerCase()] = mapping.target_key;
        break;
      case 'priority':
        priorityMapping[mapping.source_key.toLowerCase()] = mapping.target_key;
        break;
      case 'stage':
        stageToStatus[mapping.source_key] = mapping.target_key;
        // Build reverse mapping
        if (!statusToStage[mapping.target_key]) {
          statusToStage[mapping.target_key] = mapping.source_key;
        }
        break;
    }
  }

  mappingCache = {
    fieldMapping,
    techniqueMapping,
    priorityMapping,
    stageToStatus,
    statusToStage,
    loadedAt: Date.now()
  };

  console.log('Mappings loaded:', {
    fieldMappings: Object.keys(fieldMapping).length,
    techniqueMappings: Object.keys(techniqueMapping).length,
    priorityMappings: Object.keys(priorityMapping).length,
    stageMappings: Object.keys(stageToStatus).length
  });

  return mappingCache;
}

// Fallback default mappings if database is empty
function getDefaultMappings(): MappingCache {
  return {
    fieldMapping: {
      client: ['UF_CRM_CLIENT', 'UF_CRM_CLIENTE', 'COMPANY_ID'],
      product: ['UF_CRM_PRODUCT', 'UF_CRM_PRODUTO', 'TITLE'],
      quantity: ['UF_CRM_QUANTITY', 'UF_CRM_QUANTIDADE', 'UF_CRM_QTD'],
      technique_id: ['UF_CRM_TECHNIQUE', 'UF_CRM_TECNICA', 'UF_CRM_TIPO_GRAVACAO'],
      priority: ['UF_CRM_PRIORITY', 'UF_CRM_PRIORIDADE', 'UF_CRM_URGENCIA'],
      scheduled_date: ['UF_CRM_SCHEDULED_DATE', 'UF_CRM_DATA_AGENDADA', 'UF_CRM_DATA_ENTREGA'],
      gravure_color: ['UF_CRM_GRAVURE_COLOR', 'UF_CRM_COR_GRAVURA', 'UF_CRM_COR'],
      notes: ['UF_CRM_NOTES', 'UF_CRM_OBSERVACOES', 'COMMENTS'],
      estimated_duration: ['UF_CRM_DURATION', 'UF_CRM_TEMPO_ESTIMADO'],
    },
    techniqueMapping: {
      'silk_textil': 'silk-textile',
      'silk textil': 'silk-textile',
      'fiber_laser': 'fiber-laser',
      'fiber laser': 'fiber-laser',
      'laser_co2': 'laser-co2',
      'tampografia': 'tampo',
      'sublimacao': 'sublimation-mug',
    },
    priorityMapping: {
      'urgente': 'urgent',
      'urgent': 'urgent',
      'alta': 'high',
      'high': 'high',
      'media': 'medium',
      'medium': 'medium',
      'normal': 'medium',
      'baixa': 'low',
      'low': 'low',
    },
    stageToStatus: {
      'NEW': 'queue',
      'PREPARATION': 'queue',
      'PREPAID_INVOICE': 'ready',
      'EXECUTING': 'production',
      'FINAL_INVOICE': 'production',
      'WON': 'finished',
      'LOSE': 'cancelled',
      'APOLOGY': 'cancelled'
    },
    statusToStage: {
      'queue': 'NEW',
      'ready': 'PREPAID_INVOICE',
      'scheduled': 'PREPAID_INVOICE',
      'production': 'EXECUTING',
      'finished': 'WON',
      'cancelled': 'LOSE',
    },
    loadedAt: Date.now()
  };
}

// Clear mapping cache (called when mappings are updated)
function clearMappingCache() {
  mappingCache = null;
}

// Helper function to get value from deal using dynamic field mapping
function getMappedValueDynamic(deal: BitrixDeal, fieldName: string, fieldMapping: Record<string, string[]>, defaultValue: any = null): any {
  const possibleFields = fieldMapping[fieldName] || [];
  for (const field of possibleFields) {
    if (deal[field] !== undefined && deal[field] !== null && deal[field] !== '') {
      return deal[field];
    }
  }
  return defaultValue;
}

// Safely convert a raw Bitrix date into a yyyy-MM-dd string. Returns null for
// empty or unparseable values instead of throwing a RangeError (which would
// abort the whole deal sync).
function toDateOnly(rawDate: unknown): string | null {
  if (!rawDate || typeof rawDate !== 'string') return null;
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// Helper to normalize technique value using dynamic mapping
function normalizeTechniqueDynamic(value: string | null | undefined, techniqueMapping: Record<string, string>): string {
  if (!value) return 'silk-textile';
  const normalized = value.toLowerCase().trim().replace(/\s+/g, '_');
  return techniqueMapping[normalized] || techniqueMapping[value.toLowerCase()] || 'silk-textile';
}

// Helper to normalize priority value using dynamic mapping
function normalizePriorityDynamic(value: string | null | undefined, priorityMapping: Record<string, string>): string {
  if (!value) return 'medium';
  const normalized = value.toLowerCase().trim();
  return priorityMapping[normalized] || 'medium';
}

async function callBitrix(method: string, params: Record<string, any> = {}, supabase?: any) {
  // PRIORITY 1: Try webhook URL first (most reliable)
  if (BITRIX24_WEBHOOK_URL) {
    try {
      const url = `${BITRIX24_WEBHOOK_URL}/${method}`;
      console.log(`Calling Bitrix24 (Webhook - Primary): ${method}`, params);
      
      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bitrix24 Webhook error response:', errorText);
        // Don't throw, try OAuth fallback
        console.log('Webhook failed, trying OAuth...');
      } else {
        const data = await response.json();
        
        if (data.error) {
          console.error('Bitrix24 Webhook API error:', data.error, data.error_description);
          // Don't throw, try OAuth fallback
          console.log('Webhook returned error, trying OAuth...');
        } else {
          console.log(`Bitrix24 Webhook response success`);
          return data;
        }
      }
    } catch (webhookError) {
      console.error('Webhook exception:', webhookError);
      console.log('Trying OAuth fallback...');
    }
  }

  // PRIORITY 2: Try OAuth tokens as fallback
  if (supabase) {
    const tokens = await getValidTokens(supabase);
    if (tokens) {
      const url = `${BITRIX24_DOMAIN}/rest/${method}?auth=${tokens.access_token}`;
      console.log(`Calling Bitrix24 (OAuth fallback): ${method}`, params);
      
      const response = await fetch(url, {
        method: 'POST',
        signal: AbortSignal.timeout(15_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Bitrix24 OAuth API error response:', errorText);
        throw new Error(`Bitrix24 API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Check for expired_token error and try to refresh
      if (data.error === 'expired_token' || data.error === 'invalid_token') {
        console.log('Token expired, attempting refresh...');
        const refreshedTokens = await refreshAccessToken(tokens.refresh_token, supabase);
        if (refreshedTokens) {
          // Retry with new token
          return callBitrix(method, params, supabase);
        }
        throw new Error('Token refresh failed');
      }
      
      if (data.error) {
        console.error('Bitrix24 OAuth API error:', data.error, data.error_description);
        throw new Error(`Bitrix24 API error: ${data.error} - ${data.error_description || ''}`);
      }

      console.log(`Bitrix24 OAuth response success`);
      return data;
    }
  }
  
  throw new Error('No valid Bitrix24 authentication configured. Please configure BITRIX24_WEBHOOK_URL or OAuth tokens.');
}

// Pull deals from Bitrix24 and sync to our system
async function pullFromBitrix(supabase: any, categoryId?: string) {
  console.log('Pulling deals from Bitrix24...');
  
  // Load mappings from database
  const mappings = await loadMappingsFromDB(supabase);
  
  const filter: Record<string, any> = {};
  if (categoryId) {
    filter['CATEGORY_ID'] = categoryId;
  }

  const result = await callBitrix('crm.deal.list', {
    filter,
    select: ['ID', 'TITLE', 'STAGE_ID', 'UF_*']
  }, supabase);

  const deals = result.result || [];
  const synced: string[] = [];
  const errors: string[] = [];

  for (const deal of deals) {
    try {
      // Check if job already exists by order_number (using deal ID as reference)
      const orderNumber = `BTX-${deal.ID}`;
      
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('id, status')
        .eq('order_number', orderNumber)
        .maybeSingle();

      const status = mappings.stageToStatus[deal.STAGE_ID] || 'queue';
      
      // Use dynamic field mapping to extract values
      const rawTechnique = getMappedValueDynamic(deal, 'technique_id', mappings.fieldMapping);
      const rawPriority = getMappedValueDynamic(deal, 'priority', mappings.fieldMapping);
      const rawQuantity = getMappedValueDynamic(deal, 'quantity', mappings.fieldMapping);
      const rawDuration = getMappedValueDynamic(deal, 'estimated_duration', mappings.fieldMapping);
      const rawDate = getMappedValueDynamic(deal, 'scheduled_date', mappings.fieldMapping);

      const jobData = {
        order_number: orderNumber,
        client: getMappedValueDynamic(deal, 'client', mappings.fieldMapping, deal.TITLE || 'Cliente Bitrix'),
        product: getMappedValueDynamic(deal, 'product', mappings.fieldMapping, deal.TITLE || 'Produto'),
        quantity: parseInt(rawQuantity) || 1,
        technique_id: normalizeTechniqueDynamic(rawTechnique, mappings.techniqueMapping),
        status,
        priority: normalizePriorityDynamic(rawPriority, mappings.priorityMapping),
        gravure_color: getMappedValueDynamic(deal, 'gravure_color', mappings.fieldMapping),
        scheduled_date: toDateOnly(rawDate),
        estimated_duration: parseInt(rawDuration) || 60,
        notes: getMappedValueDynamic(deal, 'notes', mappings.fieldMapping, `Importado do Bitrix24 - Deal ID: ${deal.ID}`)
      };

      if (existingJob) {
        // Update existing job if status changed
        if (existingJob.status !== status) {
          await supabase
            .from('jobs')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', existingJob.id);
        }
      } else {
        // Create new job
        await supabase.from('jobs').insert(jobData);
      }

      synced.push(orderNumber);
    } catch (error: unknown) {
      console.error(`Error syncing deal ${deal.ID}:`, error);
      errors.push(`${deal.ID}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  return { synced, errors, total: deals.length };
}

// Push status update to Bitrix24
async function pushToBitrix(jobId: string, newStatus: string, supabase: any) {
  console.log(`Pushing status update to Bitrix24: ${jobId} -> ${newStatus}`);

  // Load mappings from database
  const mappings = await loadMappingsFromDB(supabase);

  // Get job details
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();

  if (error || !job) {
    throw new Error(`Job not found: ${jobId}`);
  }

  // Check if this is a Bitrix-synced job
  if (!job.order_number?.startsWith('BTX-')) {
    console.log('Not a Bitrix-synced job, skipping push');
    return { skipped: true };
  }

  const dealId = job.order_number.replace('BTX-', '');
  const newStage = mappings.statusToStage[newStatus] || 'EXECUTING';

  // Update deal in Bitrix24
  const updateData: Record<string, any> = {
    id: dealId,
    fields: {
      STAGE_ID: newStage
    }
  };

  // Add completion data if finished
  if (newStatus === 'finished') {
    updateData.fields.UF_CRM_PRODUCED_QTY = job.produced_quantity || job.quantity;
    updateData.fields.UF_CRM_LOST_PIECES = job.lost_pieces || 0;
    updateData.fields.UF_CRM_COMPLETED_AT = new Date().toISOString();
  }

  const result = await callBitrix('crm.deal.update', updateData, supabase);

  // Log the sync action
  console.log(`Bitrix24 deal ${dealId} updated to stage ${newStage}`);

  return { 
    success: true, 
    dealId, 
    newStage,
    bitrixResult: result 
  };
}

// Webhook handler for Bitrix24 events
async function handleBitrixWebhook(payload: any, supabase: any) {
  console.log('Received Bitrix24 webhook:', payload);

  // Load mappings from database
  const mappings = await loadMappingsFromDB(supabase);

  const event = payload.event;
  const data = payload.data;

  if (event === 'ONCRMDEALUPDATE' || event === 'ONCRMDEALADD') {
    const dealId = data?.FIELDS?.ID;
    if (!dealId) return { error: 'No deal ID in webhook' };

    // Fetch full deal data
    const dealResult = await callBitrix('crm.deal.get', { id: dealId }, supabase);
    const deal = dealResult.result;

    if (!deal) return { error: 'Deal not found' };

    const orderNumber = `BTX-${dealId}`;
    const status = mappings.stageToStatus[deal.STAGE_ID] || 'queue';

    const { data: existingJob } = await supabase
      .from('jobs')
      .select('id')
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (existingJob) {
      await supabase
        .from('jobs')
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', existingJob.id);
      
      return { updated: orderNumber };
    } else {
      // Use dynamic field mapping to extract values
      const rawTechnique = getMappedValueDynamic(deal, 'technique_id', mappings.fieldMapping);
      const rawPriority = getMappedValueDynamic(deal, 'priority', mappings.fieldMapping);
      const rawQuantity = getMappedValueDynamic(deal, 'quantity', mappings.fieldMapping);
      const rawDuration = getMappedValueDynamic(deal, 'estimated_duration', mappings.fieldMapping);
      const rawDate = getMappedValueDynamic(deal, 'scheduled_date', mappings.fieldMapping);

      const jobData = {
        order_number: orderNumber,
        client: getMappedValueDynamic(deal, 'client', mappings.fieldMapping, deal.TITLE || 'Cliente Bitrix'),
        product: getMappedValueDynamic(deal, 'product', mappings.fieldMapping, deal.TITLE || 'Produto'),
        quantity: parseInt(rawQuantity) || 1,
        technique_id: normalizeTechniqueDynamic(rawTechnique, mappings.techniqueMapping),
        status,
        priority: normalizePriorityDynamic(rawPriority, mappings.priorityMapping),
        gravure_color: getMappedValueDynamic(deal, 'gravure_color', mappings.fieldMapping),
        scheduled_date: toDateOnly(rawDate),
        estimated_duration: parseInt(rawDuration) || 60,
        notes: getMappedValueDynamic(deal, 'notes', mappings.fieldMapping, `Importado do Bitrix24 - Deal ID: ${dealId}`)
      };

      await supabase.from('jobs').insert(jobData);
      return { created: orderNumber };
    }
  }

  return { ignored: event };
}

// Log sync operation to history
async function logSyncHistory(
  supabase: any,
  syncType: 'pull' | 'push' | 'webhook',
  status: 'success' | 'partial' | 'error',
  jobsSynced: number,
  jobsFailed: number,
  errorMessage: string | null,
  details: any,
  triggeredBy: string
) {
  try {
    await supabase.from('bitrix24_sync_history').insert({
      sync_type: syncType,
      status,
      jobs_synced: jobsSynced,
      jobs_failed: jobsFailed,
      error_message: errorMessage,
      details,
      triggered_by: triggeredBy,
      completed_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('Error logging sync history:', e);
  }
}

interface AuthResult {
  ok: boolean;
  status?: number;
  error?: string;
}

// Any authenticated app user may trigger a status push for a job they can see
// (fired automatically by jobsService.syncToBitrix24 on every status change).
async function requireAuthenticatedUser(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, status: 401, error: 'Não autorizado' };
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: 'Não autorizado' };
  }
  return { ok: true };
}

// Management/config actions require an active coordinator/manager/admin role.
async function requireElevatedRole(req: Request, supabase: any): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return { ok: false, status: 401, error: 'Não autorizado' };
  }
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: 'Não autorizado' };
  }

  const { data: roleRows, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (roleError) {
    // A backend failure must not be silently reported as an authorization denial.
    return { ok: false, status: 500, error: 'Falha ao verificar permissão' };
  }

  const roles = (roleRows ?? []).map((r: { role: string }) => r.role);
  if (!roles.some((role: string) => ['coordinator', 'manager', 'admin'].includes(role))) {
    return { ok: false, status: 403, error: 'Apenas coordenadores, gerentes e administradores podem gerenciar a integração Bitrix24' };
  }
  return { ok: true };
}

// action=webhook is called BY Bitrix24 itself (no Supabase session available),
// so it is authenticated via a pre-shared secret instead of a user JWT.
function verifyBitrixWebhookSecret(req: Request, url: URL): AuthResult {
  if (!BITRIX24_WEBHOOK_SECRET) {
    console.error('[bitrix24-sync] BITRIX24_WEBHOOK_SECRET is not configured — rejecting all webhook calls (fail closed).');
    return { ok: false, status: 401, error: 'Webhook não configurado' };
  }
  const provided = req.headers.get('x-bitrix-webhook-secret') || url.searchParams.get('token');
  if (provided !== BITRIX24_WEBHOOK_SECRET) {
    return { ok: false, status: 401, error: 'Não autorizado' };
  }
  return { ok: true };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const supabase = createClient(
    SUPABASE_URL!,
    SUPABASE_SERVICE_ROLE_KEY!
  );

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const triggeredBy = url.searchParams.get('triggered_by') || 'manual';

  // Auth gate — every action except the OAuth browser-redirect callback
  // (which cannot carry a Supabase session) requires either a signed-in user
  // (push), an elevated role (management/config actions) or the Bitrix
  // webhook shared secret (webhook).
  if (action === 'webhook') {
    const auth = verifyBitrixWebhookSecret(req, url);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
  } else if (action === 'push') {
    const auth = await requireAuthenticatedUser(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
  } else if (action !== 'oauth-callback') {
    const auth = await requireElevatedRole(req, supabase);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
  }

  try {
    let result;

    switch (action) {
      case 'pull': {
        // Pull deals from Bitrix24
        const categoryId = url.searchParams.get('categoryId') || undefined;
        result = await pullFromBitrix(supabase, categoryId);

        // Log the sync
        const pullStatus = result.errors?.length > 0
          ? (result.synced?.length > 0 ? 'partial' : 'error')
          : 'success';
        await logSyncHistory(
          supabase,
          'pull',
          pullStatus,
          result.synced?.length || 0,
          result.errors?.length || 0,
          result.errors?.join('; ') || null,
          { total: result.total, synced: result.synced },
          triggeredBy
        );
        break;
      }

      case 'push': {
        // Push status update to Bitrix24
        const body = await req.json().catch(() => ({}));
        const { jobId, status: newStatus } = body as Record<string, unknown>;

        const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const VALID_STATUSES = ['queue', 'ready', 'scheduled', 'production', 'finished', 'cancelled'];

        if (typeof jobId !== 'string' || !UUID_RE.test(jobId)) {
          return new Response(JSON.stringify({ error: 'jobId inválido' }), {
            status: 400,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          });
        }
        if (typeof newStatus !== 'string' || !VALID_STATUSES.includes(newStatus)) {
          return new Response(JSON.stringify({ error: 'status inválido' }), {
            status: 400,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          });
        }

        result = await pushToBitrix(jobId, newStatus, supabase);

        if (!result.skipped && result.success !== undefined) {
          await logSyncHistory(
            supabase,
            'push',
            result.success ? 'success' : 'error',
            result.success ? 1 : 0,
            result.success ? 0 : 1,
            null,
            { dealId: result.dealId, newStage: result.newStage },
            'auto'
          );
        }
        break;
      }

      case 'webhook': {
        // Verify request comes from Bitrix24 using a pre-shared token.
        // Fail-closed: BITRIX24_WEBHOOK_TOKEN must be configured before webhooks work.
        const webhookToken = Deno.env.get('BITRIX24_WEBHOOK_TOKEN');
        if (!webhookToken) {
          return new Response(JSON.stringify({ error: 'Webhook not configured: BITRIX24_WEBHOOK_TOKEN required' }), {
            status: 503,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          });
        }
        const providedToken = url.searchParams.get('token') || req.headers.get('x-webhook-secret');
        if (providedToken !== webhookToken) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          });
        }
        // Handle incoming Bitrix24 webhook
        const webhookPayload = await req.json();
        result = await handleBitrixWebhook(webhookPayload, supabase);

        await logSyncHistory(
          supabase,
          'webhook',
          result.error ? 'error' : 'success',
          result.created || result.updated ? 1 : 0,
          result.error ? 1 : 0,
          result.error || null,
          result,
          'bitrix24'
        );
        break;
      }

      case 'test': {
        // Test connection
        const testResult = await callBitrix('app.info', {}, supabase);
        result = { connected: true, info: testResult.result };
        break;
      }

      case 'history': {
        // Get sync history
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        const { data: history, error: historyError } = await supabase
          .from('bitrix24_sync_history')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(limit);

        if (historyError) throw historyError;
        result = { history };
        break;
      }

      case 'fields': {
        // Get deal custom fields from Bitrix24 and current mappings from database
        const fieldsResult = await callBitrix('crm.deal.fields', {}, supabase);
        const allFields = fieldsResult.result || {};
        const fieldsMappings = await loadMappingsFromDB(supabase);

        // Filter to show only UF_CRM_* fields (custom fields)
        const customFields = Object.entries(allFields)
          .filter(([key]) => key.startsWith('UF_CRM_'))
          .reduce((acc: Record<string, any>, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {});

        result = {
          customFields,
          totalCustomFields: Object.keys(customFields).length,
          currentMapping: fieldsMappings.fieldMapping,
          techniqueMapping: fieldsMappings.techniqueMapping,
          priorityMapping: fieldsMappings.priorityMapping,
          stageMapping: fieldsMappings.stageToStatus
        };
        break;
      }

      case 'mapping': {
        // Return current field mapping configuration from database
        const currentMappings = await loadMappingsFromDB(supabase);
        result = {
          fieldMapping: currentMappings.fieldMapping,
          techniqueMapping: currentMappings.techniqueMapping,
          priorityMapping: currentMappings.priorityMapping,
          stageToStatus: currentMappings.stageToStatus,
          statusToStage: currentMappings.statusToStage,
          source: 'database',
          instructions: {
            pt: 'Mapeamentos carregados do banco de dados. Use as ações save-mapping e delete-mapping para gerenciar.',
            en: 'Mappings loaded from database. Use save-mapping and delete-mapping actions to manage.'
          }
        };
        break;
      }

      case 'save-mapping': {
        // Save or update a mapping
        const saveBody = await req.json();
        const { mapping_type, source_key, target_key, priority: mappingPriority = 0 } = saveBody;

        if (!mapping_type || !source_key || !target_key) {
          result = { error: 'Missing required fields: mapping_type, source_key, target_key' };
          break;
        }

        // Upsert mapping
        const { error: saveError } = await supabase
          .from('bitrix24_field_mappings')
          .upsert({
            mapping_type,
            source_key,
            target_key,
            priority: mappingPriority,
            is_active: true
          }, {
            onConflict: 'mapping_type,source_key,target_key'
          });

        if (saveError) {
          console.error('Error saving mapping:', saveError);
          result = { error: 'Erro ao salvar mapeamento' };
        } else {
          clearMappingCache();
          result = { success: true, message: 'Mapeamento salvo com sucesso' };
        }
        break;
      }

      case 'delete-mapping': {
        // Delete a mapping
        const deleteBody = await req.json();
        const { id: mappingId, mapping_type: delType, source_key: delSource, target_key: delTarget } = deleteBody;

        let deleteQuery = supabase.from('bitrix24_field_mappings').delete();

        if (mappingId) {
          deleteQuery = deleteQuery.eq('id', mappingId);
        } else if (delType && delSource && delTarget) {
          deleteQuery = deleteQuery
            .eq('mapping_type', delType)
            .eq('source_key', delSource)
            .eq('target_key', delTarget);
        } else {
          result = { error: 'Missing id or (mapping_type, source_key, target_key)' };
          break;
        }

        const { error: deleteError } = await deleteQuery;

        if (deleteError) {
          console.error('Error deleting mapping:', deleteError);
          result = { error: 'Erro ao remover mapeamento' };
        } else {
          clearMappingCache();
          result = { success: true, message: 'Mapeamento removido com sucesso' };
        }
        break;
      }

      case 'list-mappings': {
        // List all mappings from database
        const { data: allMappings, error: listError } = await supabase
          .from('bitrix24_field_mappings')
          .select('*')
          .order('mapping_type')
          .order('source_key')
          .order('priority', { ascending: true });

        if (listError) {
          console.error('Error listing mappings:', listError);
          result = { error: 'Erro ao listar mapeamentos' };
        } else {
          result = { mappings: allMappings };
        }
        break;
      }

      case 'oauth-status': {
        // Check OAuth status and if reauthorization is needed
        const { data: currentTokens } = await supabase
          .from('bitrix24_oauth_tokens')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        let tokenStatus = 'no_tokens';
        let tokenExpiry = null;

        if (currentTokens) {
          const expiresAt = new Date(currentTokens.expires_at);
          tokenExpiry = expiresAt.toISOString();
          
          if (expiresAt.getTime() > Date.now()) {
            tokenStatus = 'valid';
          } else {
            tokenStatus = 'expired';
          }
        }
        
        const redirectUri = url.searchParams.get('redirect_uri') || `${url.origin}/bitrix24-sync?action=oauth-callback`;
        
        result = {
          tokenStatus,
          tokenExpiry,
          needsReauthorization,
          reauthorizationReason,
          hasClientCredentials: !!(BITRIX24_CLIENT_ID && BITRIX24_CLIENT_SECRET),
          authorizationUrl: getAuthorizationUrl(redirectUri, await generateOAuthState()),
          instructions: {
            pt: needsReauthorization 
              ? 'Reautorização necessária. Acesse a URL de autorização para reconectar sua conta Bitrix24.'
              : 'Tokens OAuth configurados. A renovação automática está ativa.',
            en: needsReauthorization
              ? 'Reauthorization required. Access the authorization URL to reconnect your Bitrix24 account.'
              : 'OAuth tokens configured. Automatic refresh is active.'
          }
        };
        break;
      }

      case 'oauth-callback': {
        // Validate OAuth state to prevent CSRF token replacement
        const oauthState = url.searchParams.get('state');
        if (!oauthState || !(await verifyOAuthState(oauthState))) {
          return new Response(JSON.stringify({
            error: 'Invalid or expired OAuth state parameter',
            message: 'Restart the authorization flow using action=oauth-status'
          }), {
            status: 400,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
          });
        }

        // Handle OAuth callback with authorization code
        const code = url.searchParams.get('code');
        const callbackRedirectUri = url.searchParams.get('redirect_uri') || `${url.origin}/bitrix24-sync?action=oauth-callback`;

        if (!code) {
          result = {
            error: 'No authorization code provided',
            message: 'Use action=oauth-status to get the authorization URL'
          };
          break;
        }

        const exchangedTokens = await exchangeCodeForTokens(code, callbackRedirectUri, supabase);

        if (exchangedTokens) {
          result = {
            success: true,
            message: 'Autorização concluída com sucesso! Tokens OAuth renovados.',
            expiresAt: exchangedTokens.expires_at.toISOString()
          };
        } else {
          result = {
            error: 'Token exchange failed',
            message: 'Falha ao trocar código de autorização por tokens. Verifique as credenciais OAuth.'
          };
        }
        break;
      }

      case 'clear-tokens':
        // Clear all stored tokens (for troubleshooting)
        await supabase.from('bitrix24_oauth_tokens').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        needsReauthorization = true;
        reauthorizationReason = 'Tokens limpos manualmente';
        result = {
          success: true,
          message: 'Tokens OAuth removidos. Reautorização necessária.'
        };
        break;

      default:
        result = { 
          error: 'Invalid action',
          availableActions: ['pull', 'push', 'webhook', 'test', 'history', 'fields', 'mapping', 'save-mapping', 'delete-mapping', 'list-mappings', 'oauth-status', 'oauth-callback', 'clear-tokens']
        };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    console.error('Bitrix24 sync error:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;

    // Log error to history
    if (action && ['pull', 'push', 'webhook'].includes(action)) {
      await logSyncHistory(
        supabase,
        action as 'pull' | 'push' | 'webhook',
        'error',
        0,
        1,
        errMsg,
        { stack: errStack },
        triggeredBy
      );
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
      }
    );
  }
});
