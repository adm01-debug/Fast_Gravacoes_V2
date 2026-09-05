import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { escapeHtml } from "../_shared/htmlEscape.ts";

interface ReportRequest {
  report_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  recipients: string[];
  start_date: string;
  end_date: string;
  include_charts?: boolean;
  include_details?: boolean;
  technique_ids?: string[];
  machine_ids?: string[];
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    // Restrict to coordinator/admin role — report emails expose production data.
    const { data: roleRows, error: roleCheckError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("is_active", true);
    if (roleCheckError) {
      return new Response(JSON.stringify({ error: "Falha ao verificar permissão" }), {
        status: 500,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }
    if (!(roleRows ?? []).some((r: { role: string }) => ["coordinator", "admin"].includes(r.role))) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.json().catch(() => null);
    if (!rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const VALID_REPORT_TYPES = ['daily', 'weekly', 'monthly', 'custom'] as const;
    const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/;
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const { report_type, recipients, start_date, end_date, technique_ids, machine_ids } = rawBody as Record<string, unknown>;

    if (!VALID_REPORT_TYPES.includes(report_type as typeof VALID_REPORT_TYPES[number])) {
      return new Response(JSON.stringify({ error: 'Invalid report_type' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    if (!Array.isArray(recipients) || recipients.length === 0 || !recipients.every(r => typeof r === 'string' && EMAIL_RE.test(r))) {
      return new Response(JSON.stringify({ error: 'recipients must be a non-empty array of valid email addresses' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    if (typeof start_date !== 'string' || !ISO_DATE_RE.test(start_date)) {
      return new Response(JSON.stringify({ error: 'start_date must be a valid ISO date string' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    if (typeof end_date !== 'string' || !ISO_DATE_RE.test(end_date)) {
      return new Response(JSON.stringify({ error: 'end_date must be a valid ISO date string' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    if (new Date(start_date) > new Date(end_date)) {
      return new Response(JSON.stringify({ error: 'start_date must not be after end_date' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    if (technique_ids !== undefined && !(Array.isArray(technique_ids) && technique_ids.every(id => typeof id === 'string' && UUID_RE.test(id)))) {
      return new Response(JSON.stringify({ error: 'technique_ids must be an array of UUIDs' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }
    if (machine_ids !== undefined && !(Array.isArray(machine_ids) && machine_ids.every(id => typeof id === 'string' && UUID_RE.test(id)))) {
      return new Response(JSON.stringify({ error: 'machine_ids must be an array of UUIDs' }), {
        status: 400,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    const body: ReportRequest = {
      report_type: report_type as ReportRequest['report_type'],
      recipients: recipients as string[],
      start_date: start_date as string,
      end_date: end_date as string,
      include_charts: typeof rawBody.include_charts === 'boolean' ? rawBody.include_charts : undefined,
      include_details: typeof rawBody.include_details === 'boolean' ? rawBody.include_details : undefined,
      technique_ids: technique_ids as string[] | undefined,
      machine_ids: machine_ids as string[] | undefined,
    };

    console.log('[send-email-report] Request:', { report_type: body.report_type, recipients_count: body.recipients.length, start_date, end_date });

    // Fetch report data
    let query = supabase
      .from('jobs')
      .select(`
        *,
        machine:machines(name, code),
        technique:techniques(name, short_name)
      `)
      .gte('created_at', body.start_date)
      .lte('created_at', body.end_date);

    if (body.technique_ids?.length) {
      query = query.in('technique_id', body.technique_ids);
    }
    if (body.machine_ids?.length) {
      query = query.in('machine_id', body.machine_ids);
    }

    const { data: jobs, error: jobsError } = await query;
    
    if (jobsError) {
      console.error('[send-email-report] Jobs fetch error:', jobsError);
      throw jobsError;
    }

    // Calculate statistics
    const stats = {
      total_jobs: jobs?.length || 0,
      completed: jobs?.filter(j => j.status === 'finished').length || 0,
      in_progress: jobs?.filter(j => j.status === 'production').length || 0,
      delayed: jobs?.filter(j => j.status === 'delayed').length || 0,
      total_produced: jobs?.reduce((sum, j) => sum + (j.produced_quantity || 0), 0) || 0,
      total_planned: jobs?.reduce((sum, j) => sum + (j.quantity || 0), 0) || 0,
      total_lost: jobs?.reduce((sum, j) => sum + (j.lost_pieces || 0), 0) || 0,
    };

    const efficiency = stats.total_planned > 0 
      ? Math.round((stats.total_produced / stats.total_planned) * 100) 
      : 0;

    const quality = stats.total_produced > 0
      ? Math.round(((stats.total_produced - stats.total_lost) / stats.total_produced) * 100)
      : 100;

    // Group by technique
    const byTechnique: Record<string, any> = {};
    jobs?.forEach(job => {
      const techName = job.technique?.short_name || job.technique?.name || 'Sem técnica';
      if (!byTechnique[techName]) {
        byTechnique[techName] = { jobs: 0, produced: 0, lost: 0 };
      }
      byTechnique[techName].jobs++;
      byTechnique[techName].produced += job.produced_quantity || 0;
      byTechnique[techName].lost += job.lost_pieces || 0;
    });

    // Build HTML email
    const reportTitle = body.report_type === 'daily' ? 'Diário' :
                        body.report_type === 'weekly' ? 'Semanal' :
                        body.report_type === 'monthly' ? 'Mensal' : 'Personalizado';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 10px 0 0; opacity: 0.9; }
    .content { padding: 30px; }
    .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; }
    .stat-card { background: #f9fafb; border-radius: 8px; padding: 15px; text-align: center; }
    .stat-value { font-size: 28px; font-weight: bold; color: #111; }
    .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
    .stat-card.success .stat-value { color: #16a34a; }
    .stat-card.warning .stat-value { color: #f97316; }
    .stat-card.danger .stat-value { color: #dc2626; }
    .section { margin-top: 25px; }
    .section h3 { font-size: 16px; color: #333; margin-bottom: 15px; border-bottom: 2px solid #f97316; padding-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f9fafb; font-weight: 600; color: #333; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
    .progress-fill { height: 100%; background: #f97316; border-radius: 4px; }
    .footer { padding: 20px 30px; background: #f9fafb; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório ${reportTitle} de Produção</h1>
      <p>${body.start_date} até ${body.end_date}</p>
    </div>
    
    <div class="content">
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.total_jobs}</div>
          <div class="stat-label">Total de Jobs</div>
        </div>
        <div class="stat-card success">
          <div class="stat-value">${stats.completed}</div>
          <div class="stat-label">Finalizados</div>
        </div>
        <div class="stat-card warning">
          <div class="stat-value">${stats.in_progress}</div>
          <div class="stat-label">Em Produção</div>
        </div>
        <div class="stat-card ${stats.delayed > 0 ? 'danger' : ''}">
          <div class="stat-value">${stats.delayed}</div>
          <div class="stat-label">Atrasados</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value">${stats.total_produced.toLocaleString('pt-BR')}</div>
          <div class="stat-label">Peças Produzidas</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${efficiency}%</div>
          <div class="stat-label">Eficiência</div>
          <div class="progress-bar" style="margin-top: 8px;">
            <div class="progress-fill" style="width: ${efficiency}%"></div>
          </div>
        </div>
        <div class="stat-card ${quality < 95 ? 'warning' : 'success'}">
          <div class="stat-value">${quality}%</div>
          <div class="stat-label">Qualidade</div>
        </div>
        <div class="stat-card ${stats.total_lost > 0 ? 'danger' : ''}">
          <div class="stat-value">${stats.total_lost.toLocaleString('pt-BR')}</div>
          <div class="stat-label">Perdas</div>
        </div>
      </div>

      ${Object.keys(byTechnique).length > 0 ? `
      <div class="section">
        <h3>📈 Por Técnica</h3>
        <table>
          <thead>
            <tr>
              <th>Técnica</th>
              <th>Jobs</th>
              <th>Produzido</th>
              <th>Perdas</th>
            </tr>
          </thead>
          <tbody>
            ${Object.entries(byTechnique).map(([name, data]: [string, any]) => `
              <tr>
                <td>${escapeHtml(name)}</td>
                <td>${data.jobs}</td>
                <td>${data.produced.toLocaleString('pt-BR')}</td>
                <td>${data.lost.toLocaleString('pt-BR')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${body.include_details && jobs && jobs.length > 0 ? `
      <div class="section">
        <h3>📋 Últimos Jobs</h3>
        <table>
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Qtd</th>
            </tr>
          </thead>
          <tbody>
            ${jobs.slice(0, 10).map(job => `
              <tr>
                <td>${escapeHtml(job.order_number)}</td>
                <td>${escapeHtml(job.client)}</td>
                <td>${escapeHtml(job.status)}</td>
                <td>${job.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${jobs.length > 10 ? `<p style="color: #666; font-size: 12px; margin-top: 10px;">... e mais ${jobs.length - 10} jobs</p>` : ''}
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>Relatório gerado automaticamente pelo 52 STÚDIOS DE GRAVAÇÃO</p>
      <p>© ${new Date().getFullYear()} - Sistema de Gestão de Produção</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Send email via Resend if configured
    if (resendApiKey) {
      const emailResults = await Promise.allSettled(
        body.recipients.map(async (recipient) => {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            signal: AbortSignal.timeout(10_000),
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: '52 STÚDIOS DE GRAVAÇÃO <reports@resend.dev>',
              to: [recipient],
              subject: `📊 Relatório ${reportTitle} de Produção - ${body.start_date}`,
              html: htmlContent,
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Email send failed: ${error}`);
          }

          return { recipient, status: 'sent' };
        })
      );

      const sentCount = emailResults.filter(r => r.status === 'fulfilled').length;
      const failedCount = emailResults.filter(r => r.status === 'rejected').length;

      console.log(`[send-email-report] Sent: ${sentCount}, Failed: ${failedCount}`);

      // Log to daily_summaries table
      await supabase.from('daily_summaries').insert({
        date: new Date().toISOString().split('T')[0],
        summary_type: 'email_report',
        data: {
          report_type: body.report_type,
          recipients: body.recipients,
          sent_count: sentCount,
          failed_count: failedCount,
          stats,
        },
      });

      return new Response(
        JSON.stringify({
          success: true,
          sent: sentCount,
          failed: failedCount,
          stats,
        }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    } else {
      // No Resend API key - return report data for preview
      console.log('[send-email-report] RESEND_API_KEY not configured, returning preview');
      
      return new Response(
        JSON.stringify({
          success: true,
          preview: true,
          message: 'Email não enviado - RESEND_API_KEY não configurada',
          html: htmlContent,
          stats,
        }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }
  } catch (error: unknown) {
    console.error('[send-email-report] Error:', error instanceof Error ? error.message : String(error));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
