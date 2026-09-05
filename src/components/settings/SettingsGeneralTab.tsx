import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Moon, RefreshCw, Database, Shield, Palette, AlertTriangle, HelpCircle } from 'lucide-react';
import { restartOnboarding } from '@/components/onboarding/SystemOnboarding';
import { useTheme } from 'next-themes';
import { AutoThemeToggle } from '@/components/settings/AutoThemeToggle';
import { useState } from 'react';
import { setBottleneckThresholds } from '@/features/analytics/hooks/useBottleneckPrediction';
import { toast } from 'sonner';

interface SettingsGeneralTabProps {
  settings: { autoRefresh: boolean };
  onSettingChange: (key: string, value: boolean) => void;
}

export function SettingsGeneralTab({ settings, onSettingChange }: SettingsGeneralTabProps) {
  const { theme, setTheme } = useTheme();
  const [warningThreshold, setWarningThreshold] = useState(75);
  const [criticalThreshold, setCriticalThreshold] = useState(90);

  const saveThresholds = () => {
    setBottleneckThresholds(warningThreshold, criticalThreshold);
    toast.success('Limites de gargalo atualizados');
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5 text-primary" />Aparência</CardTitle>
          <CardDescription>Personalize a aparência visual do sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><Moon className="h-4 w-4" />Tema Escuro</Label>
              <p className="text-sm text-muted-foreground">Alterna entre modo claro e escuro</p>
            </div>
            <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
          </div>
          <Separator />
          <AutoThemeToggle compact />
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><RefreshCw className="h-4 w-4" />Atualização Automática</Label>
              <p className="text-sm text-muted-foreground">Atualizar dados em tempo real</p>
            </div>
            <Switch checked={settings.autoRefresh} onCheckedChange={(checked) => onSettingChange('autoRefresh', checked)} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2"><HelpCircle className="h-4 w-4" />Tour de boas-vindas</Label>
              <p className="text-sm text-muted-foreground">Refaça o tour guiado pelas principais funcionalidades</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                restartOnboarding();
                toast.success('Iniciando tour...');
              }}
            >
              Refazer tour
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Configuração de Risco de Gargalo
          </CardTitle>
          <CardDescription>Defina os gatilhos para alertas de saturação de capacidade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold uppercase tracking-wider text-warning/80">
                Aviso de Carga (Médio)
              </Label>
              <span className="text-sm font-mono font-bold bg-warning/10 text-warning px-2 py-0.5 rounded">
                {warningThreshold}%
              </span>
            </div>
            <Slider
              value={[warningThreshold]}
              min={50}
              max={criticalThreshold - 5}
              step={1}
              onValueChange={([val]) => setWarningThreshold(val)}
              className="py-2"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold uppercase tracking-wider text-red-500/80">
                Alerta Crítico (Alto)
              </Label>
              <span className="text-sm font-mono font-bold bg-red-500/10 text-red-500 px-2 py-0.5 rounded">
                {criticalThreshold}%
              </span>
            </div>
            <Slider
              value={[criticalThreshold]}
              min={warningThreshold + 5}
              max={100}
              step={1}
              onValueChange={([val]) => setCriticalThreshold(val)}
              className="py-2"
            />
          </div>

          <Button
            className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
            onClick={saveThresholds}
          >
            Salvar Thresholds
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Database className="h-6 w-6 text-primary" /></div>
              <div><p className="font-medium">Lovable Cloud</p><p className="text-sm text-muted-foreground">Conectado</p></div>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center"><Shield className="h-6 w-6 text-success" /></div>
              <div><p className="font-medium">Autenticação</p><p className="text-sm text-muted-foreground">Ativa e segura</p></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
