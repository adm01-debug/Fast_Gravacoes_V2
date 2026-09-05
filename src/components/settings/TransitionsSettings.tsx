import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  buildPreset,
  EASE_LABELS,
  PRESET_LABELS,
  type TransitionEase,
  type TransitionPreset,
} from '@/lib/transitions';
import { useTransitionConfig } from '@/contexts/TransitionConfigContext';
import { Sparkles, RotateCcw } from 'lucide-react';

const PRESETS = Object.keys(PRESET_LABELS) as TransitionPreset[];
const EASES = Object.keys(EASE_LABELS) as TransitionEase[];

export function TransitionsSettings() {
  const { config, effectiveConfig, reducedMotion, setConfig, reset } = useTransitionConfig();
  const [previewKey, setPreviewKey] = useState(0);

  const preview = buildPreset(effectiveConfig.preset, {
    duration: effectiveConfig.duration,
    ease: effectiveConfig.ease,
    distance: effectiveConfig.distance,
    direction: 'forward',
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" aria-hidden />
            Transições de página
          </CardTitle>
          <CardDescription>
            Configure como as páginas animam ao navegar entre rotas. As preferências ficam
            salvas neste dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="transitions-enabled" className="text-base">
                Animações habilitadas
              </Label>
              <p className="text-sm text-muted-foreground">
                Desative para navegação instantânea.
              </p>
            </div>
            <Switch
              id="transitions-enabled"
              checked={config.enabled}
              onCheckedChange={(enabled) => setConfig({ enabled })}
            />
          </div>

          {reducedMotion && (
            <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              O sistema está com <strong>prefers-reduced-motion</strong> ativo. As animações
              foram desativadas automaticamente por acessibilidade.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="transition-preset">Estilo de transição</Label>
            <Select
              value={config.preset}
              onValueChange={(v) => setConfig({ preset: v as TransitionPreset })}
            >
              <SelectTrigger id="transition-preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRESET_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transition-ease">Curva de animação</Label>
            <Select
              value={config.ease}
              onValueChange={(v) => setConfig({ ease: v as TransitionEase })}
            >
              <SelectTrigger id="transition-ease">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EASES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {EASE_LABELS[e]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="transition-duration">Duração</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {config.duration} ms
              </span>
            </div>
            <Slider
              id="transition-duration"
              min={100}
              max={800}
              step={25}
              value={[config.duration]}
              onValueChange={([v]) => setConfig({ duration: v })}
              disabled={config.ease === 'spring'}
            />
            {config.ease === 'spring' && (
              <p className="text-xs text-muted-foreground">
                O modo Spring ignora a duração (controlado pela física da mola).
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="transition-distance">Distância (slide/parallax)</Label>
              <span className="text-sm tabular-nums text-muted-foreground">
                {config.distance} px
              </span>
            </div>
            <Slider
              id="transition-distance"
              min={0}
              max={120}
              step={5}
              value={[config.distance]}
              onValueChange={([v]) => setConfig({ distance: v })}
            />
          </div>

          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="mr-2 size-4" aria-hidden />
              Restaurar padrão
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>Clique para reproduzir a animação selecionada.</CardDescription>
        </CardHeader>
        <CardContent>
          <button
            type="button"
            onClick={() => setPreviewKey((k) => k + 1)}
            className="relative block h-48 w-full overflow-hidden rounded-lg border border-border bg-muted/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Reproduzir pré-visualização da transição"
            style={{ perspective: 1200 }}
          >
            <motion.div
              key={previewKey}
              initial="initial"
              animate="in"
              variants={preview.variants}
              transition={preview.transition}
              className="absolute inset-4 flex items-center justify-center rounded-md bg-gradient-to-br from-primary/80 to-primary text-primary-foreground shadow-lg"
            >
              <span className="text-sm font-medium">
                {PRESET_LABELS[effectiveConfig.preset]}
              </span>
            </motion.div>
          </button>
          <p className="mt-3 text-xs text-muted-foreground">
            Preset ativo: <strong>{PRESET_LABELS[effectiveConfig.preset]}</strong>
            {reducedMotion && ' (forçado por acessibilidade)'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default TransitionsSettings;
