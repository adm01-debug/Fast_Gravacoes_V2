import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail as MailIcon } from "lucide-react";
import { useNotificationSettings } from "@/features/notifications/hooks/useNotificationSettings";

/** Marcador de opt-out lido pela edge function `cron-alert-email`. */
const OPT_OUT_FLAG = "cron_alerts_off";

/**
 * Permite ao coordenador/gestor optar por não receber os e-mails de alerta
 * das rotinas automáticas. Ausência de preferência = recebe (fail-safe),
 * para nunca silenciar um alerta crítico por configuração omissa.
 */
export function CronEmailPreferenceCard() {
  const { settings, isLoading, updateSettings } = useNotificationSettings();

  const types: string[] = settings?.notification_types ?? [];
  const emailEnabled = settings?.email_enabled !== false;
  const receiving = emailEnabled && !types.includes(OPT_OUT_FLAG);

  const handleToggle = (checked: boolean) => {
    if (!settings) return;
    const next = checked
      ? types.filter((t) => t !== OPT_OUT_FLAG)
      : Array.from(new Set([...types, OPT_OUT_FLAG]));

    updateSettings.mutate({
      notification_types: next,
      ...(checked && !emailEnabled ? { email_enabled: true } : {}),
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MailIcon className="h-4 w-4" /> E-mails de alerta das rotinas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-6 w-48" />
        ) : (
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="cron-email-pref" className="text-sm text-muted-foreground">
              Receber e-mail quando uma rotina falhar ou ficar silenciosa
            </Label>
            <Switch
              id="cron-email-pref"
              checked={receiving}
              disabled={!settings || updateSettings.isPending}
              onCheckedChange={handleToggle}
              aria-label="Receber e-mails de alerta das rotinas automáticas"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
