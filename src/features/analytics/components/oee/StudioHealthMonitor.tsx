import { StudioOEE } from "@/features/production";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Shield, AlertCircle, CheckCircle2, Droplets, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudioHealthMonitorProps {
  studios: StudioOEE[];
}

export function StudioHealthMonitor({ studios }: StudioHealthMonitorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {studios.map((studio) => (
        <Card key={studio.studioId} className="overflow-hidden border-primary/10 hover:border-primary/30 transition-all duration-300">
          <CardHeader className="p-4 pb-2">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  {studio.studioName.includes('UV') ? <Droplets className="h-4 w-4 text-blue-500" /> : 
                   studio.studioName.includes('Laser') ? <Zap className="h-4 w-4 text-orange-500" /> : 
                   <Sparkles className="h-4 w-4 text-purple-500" />}
                  {studio.studioName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn(
                    "text-[10px] uppercase font-bold px-1.5 py-0 h-4",
                    studio.healthScore > 90 ? "text-green-500 border-green-500/20" :
                    studio.healthScore > 70 ? "text-yellow-500 border-yellow-500/20" :
                    "text-red-500 border-red-500/20"
                  )}>
                    Health: {studio.healthScore}%
                  </Badge>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold px-1.5 py-0 h-4">
                    OEE: {studio.oee}%
                  </Badge>
                </div>
              </div>
              <div className={cn(
                "p-1.5 rounded-full",
                studio.maintenanceStatus === 'optimal' ? "bg-green-500/10 text-green-500" :
                studio.maintenanceStatus === 'warning' ? "bg-yellow-500/10 text-yellow-500" :
                "bg-red-500/10 text-red-500"
              )}>
                {studio.maintenanceStatus === 'optimal' ? <CheckCircle2 className="h-4 w-4" /> :
                 studio.maintenanceStatus === 'warning' ? <AlertCircle className="h-4 w-4" /> :
                 <Shield className="h-4 w-4" />}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] font-bold uppercase text-muted-foreground">
                  <span>General Status</span>
                  <span>{studio.healthScore}%</span>
                </div>
                <Progress value={studio.healthScore} className="h-1.5" />
              </div>
              
              <div className="pt-2 border-t border-primary/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">Consumables / Wear</p>
                {studio.consumables.length === 0 ? (
                  <p className="text-[9px] text-muted-foreground italic">Sem dados de consumíveis para este estúdio</p>
                ) : (
                <div className="space-y-2">
                  {studio.consumables.map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[9px] font-medium">
                        <span>{item.name}</span>
                        <span className={cn(
                          item.level < 20 ? "text-red-500 font-bold" : 
                          item.level < 50 ? "text-yellow-500" : 
                          "text-muted-foreground"
                        )}>{item.level}%</span>
                      </div>
                      <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full transition-all duration-1000",
                            item.level < 20 ? "bg-red-500" : 
                            item.level < 50 ? "bg-yellow-500" : 
                            "bg-primary/40"
                          )}
                          style={{ width: `${item.level}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
              
              {studio.maintenanceStatus !== 'optimal' && (
                <div className="mt-2 p-2 bg-yellow-500/5 rounded border border-yellow-500/10">
                  <p className="text-[9px] text-yellow-600 font-bold flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Recommended maintenance in 48h
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
