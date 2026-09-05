/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Thermometer, Zap, Gauge } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from '@/lib/recharts';

interface VirtualSensorPanelProps {
  machineId: string;
}

// There is no real IIoT sensor feed wired into this system — all values here
// are randomly generated (not derived from `machineId`, so every machine
// would show identical "live" numbers). Labeled explicitly as a simulation
// so it can't be mistaken for real machine telemetry; do not present these
// numbers as live data without wiring a real sensor/MQTT source first.
export function VirtualSensorPanel({ machineId: _machineId }: VirtualSensorPanelProps) {
  const [data, setData] = useState<Array<{ time: number; vibration: number; temperature: number }>>([]);
  const [currentValues, setCurrentValues] = useState({
    vibration: 2.4,
    temperature: 42,
    power: 1250,
    speed: 100
  });

  useEffect(() => {
    // Initialize data
    const initialData = Array.from({ length: 20 }, (_, i) => ({
      time: i,
      vibration: 2 + Math.random(),
      temperature: 40 + Math.random() * 5,
    }));
    setData(initialData);

    const interval = setInterval(() => {
      const newVibration = 2 + Math.random() + (Math.sin(Date.now() / 1000) * 0.5);
      const newTemp = 40 + Math.random() * 5 + (Math.cos(Date.now() / 2000) * 2);
      const newPower = 1200 + Math.random() * 100;
      const newSpeed = 95 + Math.random() * 10;

      setCurrentValues({
        vibration: Number(newVibration.toFixed(2)),
        temperature: Number(newTemp.toFixed(1)),
        power: Number(newPower.toFixed(0)),
        speed: Number(newSpeed.toFixed(1))
      });

      setData(prev => {
        const newData = [...prev.slice(1), {
          time: prev[prev.length - 1].time + 1,
          vibration: newVibration,
          temperature: newTemp
        }];
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="glass-card overflow-hidden hover:shadow-glow-primary transition-all duration-500">
      <CardHeader className="pb-2 border-b border-border/50 bg-secondary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-title flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Telemetria (Simulação)
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-muted-foreground" />
            <span className="text-[10px] font-medium text-muted-foreground uppercase">Demo — sem sensor real</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-border/50">
          <div className="p-4 border-r border-border/50 flex flex-col items-center">
            <Activity className="h-4 w-4 text-blue-500 mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase">Vibração</span>
            <span className="text-xl font-bold text-title">{currentValues.vibration} mm/s</span>
          </div>
          <div className="p-4 border-r border-border/50 flex flex-col items-center">
            <Thermometer className="h-4 w-4 text-warning mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase">Temp</span>
            <span className="text-xl font-bold text-title">{currentValues.temperature}°C</span>
          </div>
          <div className="p-4 border-r border-border/50 flex flex-col items-center">
            <Zap className="h-4 w-4 text-yellow-500 mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase">Potência</span>
            <span className="text-xl font-bold text-title">{currentValues.power} W</span>
          </div>
          <div className="p-4 flex flex-col items-center">
            <Gauge className="h-4 w-4 text-primary mb-1" />
            <span className="text-[10px] text-muted-foreground uppercase">Velocidade</span>
            <span className="text-xl font-bold text-title">{currentValues.speed}%</span>
          </div>
        </div>

        <div className="h-40 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorVib" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', fontSize: '10px' }}
                labelStyle={{ display: 'none' }}
              />
              <Area
                type="monotone"
                dataKey="vibration"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorVib)"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="temperature"
                stroke="#f59e0b"
                fillOpacity={1}
                fill="url(#colorTemp)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
