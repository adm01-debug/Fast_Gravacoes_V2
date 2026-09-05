import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building,
  Calendar,
  Hash
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { parseDateOnly } from '@/lib/dateUtils';
import { ProductionPhotos } from '@/components/production/ProductionPhotos';
import { Skeleton } from '@/components/ui/skeleton';

interface TrackingJob {
  id: string;
  order_number: string;
  status: string;
  client: string | null;
  product: string | null;
  scheduled_date: string | null;
  production_photos?: string[] | null;
  shipment?: {
    tracking_code?: string | null;
    status?: string | null;
    estimated_delivery?: string | null;
    actual_delivery?: string | null;
    provider?: { name?: string | null } | null;
  } | null;
}

export default function PublicTrackingPage() {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [job, setJob] = useState<TrackingJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateLocale = i18n.language === 'en-US' ? enUS : i18n.language === 'es-ES' ? es : ptBR;

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query) return;

    // Trim only — the query is passed via .eq() parameterized call, not injected into a filter string
    const safeQuery = query.trim();
    if (!safeQuery) return;

    setLoading(true);
    setError(null);
    setJob(null);

    try {
      // Use separate parameterized queries instead of embedding user input in filter string
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safeQuery);

      const selectClause = `
          *,
          shipment:shipments(
            tracking_code,
            status,
            estimated_delivery,
            actual_delivery,
            provider:shipping_providers(name)
          )
        `;

      let data = null;
      let supabaseError = null;

      if (isUUID) {
        ({ data, error: supabaseError } = await supabase
          .from('jobs')
          .select(selectClause)
          .eq('id', safeQuery)
          .maybeSingle());
        // A UUID-shaped string is a valid order_number value; fall back if id lookup missed.
        if (!supabaseError && !data) {
          ({ data, error: supabaseError } = await supabase
            .from('jobs')
            .select(selectClause)
            .eq('order_number', safeQuery)
            .maybeSingle());
        }
      } else {
        ({ data, error: supabaseError } = await supabase
          .from('jobs')
          .select(selectClause)
          .eq('order_number', safeQuery)
          .maybeSingle());
      }

      if (supabaseError) throw supabaseError;

      if (!data) {
        setError(t('tracking.orderNotFound'));
      } else {
        setJob(data);
      }
    } catch {
      setError(t('tracking.errorFetching'));

    } finally {
      setLoading(false);
    }
  };

  // Auto-search if query is in URL
  useState(() => {
    if (searchParams.get('q')) {
      handleSearch();
    }
  });

  const getStatusInfo = (status: string) => {
    const maps: Record<string, { label: string, color: string, icon: React.ComponentType<{ className?: string }> }> = {
      queue: { label: t('jobs.statuses.queue'), color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock },
      ready: { label: t('jobs.statuses.ready'), color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Package },
      scheduled: { label: t('jobs.statuses.scheduled'), color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Calendar },
      production: { label: t('jobs.statuses.production'), color: 'bg-orange-500/10 text-orange-500 border-orange-500/20', icon: Truck },
      paused: { label: t('jobs.statuses.paused'), color: 'bg-gray-500/10 text-gray-500 border-gray-500/20', icon: AlertTriangle },
      finished: { label: t('jobs.statuses.finished'), color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2 },
      rework: { label: 'Rework', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', icon: AlertTriangle },
    };
    return maps[status] || maps.queue;
  };

  const shippingStatusMap: Record<string, string> = {
    pending: t('logistics.status.pending'),
    in_transit: t('logistics.status.in_transit'),
    delivered: t('logistics.status.delivered'),
    returned: t('logistics.status.returned'),
    cancelled: t('logistics.status.cancelled')
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest mb-4">
            <ShieldCheck className="h-3 w-3" />
            {t('tracking.portalName')}
          </div>
          <h1 className="text-4xl sm:text-5xl text-title font-black tracking-tighter mb-4">
            {t('tracking.title')}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {t('tracking.description')}
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto mb-16 animate-fade-in-up">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 blur-2xl group-focus-within:bg-primary/40 transition-all rounded-full" />
            <div className="relative flex p-1.5 bg-card border-2 border-border/50 rounded-2xl shadow-xl backdrop-blur-xl">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder={t('tracking.placeholder')}
                  className="w-full bg-transparent border-none shadow-none focus-visible:ring-0 pl-12 h-12 text-lg font-medium"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Button type="submit" className="h-12 px-8 rounded-xl gradient-primary font-bold shadow-lg shadow-primary/20" disabled={loading}>
                {loading ? t('tracking.trackingButton') : t('tracking.trackButton')}
              </Button>
            </div>
          </div>
        </form>

        {/* Results */}
        {loading && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        )}

        {error && (
          <div className="max-w-md mx-auto text-center p-8 bg-destructive/10 border-2 border-destructive/20 rounded-2xl animate-fade-in">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive font-bold">{error}</p>
            <p className="text-sm text-destructive/70 mt-2">{t('common.error')}</p>
          </div>
        )}

        {job && (
          <div className="space-y-6 max-w-3xl mx-auto animate-fade-in-up">
            {/* Status Card */}
            <Card className="glass-card border-2 border-primary/20 overflow-hidden shadow-2xl shadow-primary/5">
              <CardHeader className="bg-primary/5 border-b border-primary/10 pb-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-card rounded-2xl border border-border/50 shadow-sm">
                      <Hash className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">{t('tracking.orderNumber')}</p>
                      <h2 className="text-2xl font-black tracking-tight">{job.order_number}</h2>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest", getStatusInfo(job.status).color)}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-current animate-pulse" />
                      {getStatusInfo(job.status).label}
                    </div>
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-8 space-y-8">
                {/* Visual Stepper */}
                <div className="relative flex justify-between items-center px-4 max-w-md mx-auto">
                  <div className="absolute top-1/2 left-0 right-0 h-1 bg-muted -translate-y-1/2 z-0" />
                  <div className={cn("absolute top-1/2 left-0 h-1 bg-primary -translate-y-1/2 z-0 transition-all duration-1000",
                    job.status === 'finished' ? 'w-full' :
                    job.status === 'production' ? 'w-2/3' :
                    job.status === 'ready' ? 'w-1/3' : 'w-0'
                  )} />

                  {[
                    { key: 'received', icon: Clock, label: t('tracking.steps.received') },
                    { key: 'production', icon: Truck, label: t('tracking.steps.production') },
                    { key: 'finished', icon: CheckCircle2, label: t('tracking.steps.finished') }
                  ].map((step, index) => {
                    const isCompleted = (step.key === 'received') ||
                                       (step.key === 'production' && ['production', 'finished'].includes(job.status)) ||
                                       (step.key === 'finished' && job.status === 'finished');
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className="relative z-10 flex flex-col items-center gap-2">
                        <div className={cn(
                          "h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500 border-2",
                          isCompleted ? "bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-110" : "bg-card border-border text-muted-foreground"
                        )}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={cn("text-[10px] font-black uppercase tracking-tighter", isCompleted ? "text-primary" : "text-muted-foreground")}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('tracking.client')}</p>
                      <div className="flex items-center gap-2 text-lg font-bold">
                        <Building className="h-5 w-5 text-primary/70" />
                        {job.client}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('tracking.product')}</p>
                      <div className="flex items-center gap-2 text-lg font-bold">
                        <Package className="h-5 w-5 text-primary/70" />
                        {job.product}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('tracking.deliveryForecast')}</p>
                      <div className="flex items-center gap-2 text-lg font-bold">
                        <Calendar className="h-5 w-5 text-primary/70" />
                        {job.scheduled_date ? format(parseDateOnly(job.scheduled_date) ?? new Date(), "dd 'de' MMMM", { locale: dateLocale }) : t('common.none')}
                      </div>
                    </div>
                    {job.shipment && (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('tracking.shippingStatus')} ({job.shipment.provider?.name})</p>
                        <div className="flex items-center gap-2 text-lg font-bold">
                          <Truck className="h-5 w-5 text-primary/70" />
                          {(job.shipment.status && shippingStatusMap[job.shipment.status]) || t('logistics.status.pending')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Production Photos Evidence */}
                {job.production_photos && job.production_photos.length > 0 && (
                  <div className="pt-8 border-t border-border/50">
                    <ProductionPhotos
                      photos={job.production_photos}
                      className="border-none bg-transparent p-0"
                      emptyMessage={t('tracking.productionEvidence') + ' ' + t('common.none')}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Support Message */}
            <div className="text-center p-6 rounded-2xl bg-muted/30 border border-border/50">
              <p className="text-sm text-muted-foreground">
                {t('tracking.supportMessage', { order: job.order_number })}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ');
}
