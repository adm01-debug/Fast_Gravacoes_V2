import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Database, Fingerprint, Lock, Zap, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export function BlockchainIntegrityCard() {
  return (
    <Card className="glass-card border-primary/20 bg-primary/5 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
        <Database className="h-32 w-32 text-primary" />
      </div>
      <CardHeader>
        <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
          <Fingerprint className="h-4 w-4 text-primary animate-pulse" />
          Blockchain Integrity Monitor (Evo 13/10)
        </CardTitle>
        <CardDescription>Validação imutável de genealogia e registros</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
           {[
             { label: 'Genesis Block', hash: '0x3f2a...9b1e', status: 'verified' },
             { label: 'Job Trace #492', hash: '0x7c1d...f4a2', status: 'verified' },
             { label: 'Material Input', hash: '0x9e8b...2c1d', status: 'syncing' }
           ].map((block, i) => (
             <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-background/40 border border-border/50 group/item hover:border-primary/30 transition-all">
                <div className="flex items-center gap-3">
                   <div className="p-1.5 rounded bg-primary/10 text-primary">
                      <Lock className="h-3 w-3" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[10px] font-black uppercase tracking-tighter">{block.label}</span>
                      <span className="text-[9px] font-mono text-muted-foreground">{block.hash}</span>
                   </div>
                </div>
                <Badge variant={block.status === 'verified' ? 'outline' : 'secondary'} className={block.status === 'verified' ? 'text-success border-success/20' : 'animate-pulse'}>
                   {block.status === 'verified' ? 'VALID' : 'SYNC...'}
                </Badge>
             </div>
           ))}
        </div>

        <div className="p-3 rounded-xl bg-success/10 border border-success/20">
           <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-success" />
              <span className="text-[10px] font-black text-success uppercase">Integridade Garantida</span>
           </div>
           <p className="text-[9px] text-muted-foreground leading-relaxed">
             Toda a genealogia de lotes está criptografada e vinculada à Master API industrial, garantindo zero-falsificação em auditorias.
           </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
           <div className="flex flex-col p-2 rounded-lg bg-primary/5 border border-primary/10 text-center">
              <Zap className="h-3 w-3 mx-auto mb-1 text-primary" />
              <span className="text-[8px] font-bold text-muted-foreground uppercase">Sync Speed</span>
              <span className="text-xs font-black text-foreground">12 ms</span>
           </div>
           <div className="flex flex-col p-2 rounded-lg bg-primary/5 border border-primary/10 text-center">
              <Search className="h-3 w-3 mx-auto mb-1 text-primary" />
              <span className="text-[8px] font-bold text-muted-foreground uppercase">Audit Ready</span>
              <span className="text-xs font-black text-foreground">SLA 100%</span>
           </div>
        </div>
      </CardContent>
    </Card>
  );
}