import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export interface OEESimValues {
  availability: number;
  performance: number;
  quality: number;
}

interface OEESimulatorPanelProps {
  simValues: OEESimValues;
  onSimValuesChange: (values: OEESimValues) => void;
  overallOEE: number;
}

export function OEESimulatorPanel({ simValues, onSimValuesChange, overallOEE }: OEESimulatorPanelProps) {
  const { t } = useTranslation();
  return (

          <Card className="border-primary/20 bg-muted/20 animate-in slide-in-from-top-4 duration-300">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('oee.availability', 'Disponibilidade')}</Label>
                      <span className="text-xs font-black">{simValues.availability}%</span>
                    </div>
                    <Slider value={[simValues.availability]} max={100} step={1} onValueChange={([v]) => onSimValuesChange({...simValues, availability: v})} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('common.performance', 'Performance')}</Label>
                      <span className="text-xs font-black">{simValues.performance}%</span>
                    </div>
                    <Slider value={[simValues.performance]} max={100} step={1} onValueChange={([v]) => onSimValuesChange({...simValues, performance: v})} />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('common.quality', 'Qualidade')}</Label>
                      <span className="text-xs font-black">{simValues.quality}%</span>
                    </div>
                    <Slider value={[simValues.quality]} max={100} step={1} onValueChange={([v]) => onSimValuesChange({...simValues, quality: v})} />
                  </div>
                </div>

                <div className="lg:col-span-2 flex flex-col md:flex-row items-center justify-around gap-6 bg-background/50 rounded-2xl p-6 border border-border/50">
                   <div className="text-center">
                      <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{t('oee.currentOEE', 'OEE Atual')}</p>
                      <p className="text-5xl font-black text-muted-foreground/50">{overallOEE.toFixed(1)}%</p>
                   </div>
                   <ArrowRight className="h-8 w-8 text-muted-foreground/30 hidden md:block" />
                   <div className="text-center">
                      <p className="text-xs font-bold text-primary uppercase mb-2">{t('oee.projectedOEE', 'OEE Projetado')}</p>
                      <p className="text-6xl font-black text-primary">
                        {((simValues.availability/100) * (simValues.performance/100) * (simValues.quality/100) * 100).toFixed(1)}%
                      </p>
                   </div>
                </div>
              </div>
            </CardContent>
          </Card>
        
  );
}
