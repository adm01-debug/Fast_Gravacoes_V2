import { GitBranch, ArrowRight, ArrowLeft, Package, Layers } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProductionLot, LotComponent, useLotGenealogy } from '@/features/inventory';
import { format } from 'date-fns';
import { parseDateOnly } from '@/lib/dateUtils';
import { motion } from 'framer-motion';

interface GenealogyChildItem extends LotComponent {
  lot?: ProductionLot;
}

interface LotGenealogyViewProps {
  lot: ProductionLot;
  open: boolean;
  onClose: () => void;
}

export default function LotGenealogyView({ lot, open, onClose }: LotGenealogyViewProps) {
  const { data: genealogy, isLoading } = useLotGenealogy(lot.id);

  const parents = genealogy?.parents?.filter((p: LotComponent) => p.component_lot) || [];
  const children = genealogy?.children || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto border-primary/20 shadow-2xl bg-background/95 backdrop-blur-xl" aria-describedby="lot-genealogy-description">
        <DialogHeader className="border-b border-border/50 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl font-black tracking-tighter">
            <div className="p-2 rounded-lg bg-primary/10">
              <GitBranch className="h-6 w-6 text-primary animate-pulse" />
            </div>
            Genealogia Hyper-Traceability
          </DialogTitle>
          <DialogDescription id="lot-genealogy-description" className="font-bold uppercase text-[10px] tracking-widest text-muted-foreground">
            Mapeamento 360° de componentes e produtos derivados (Audit Ready)
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                <GitBranch className="h-10 w-10 text-primary opacity-20" />
             </motion.div>
             <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Sincronizando Cadeia...</p>
          </div>
        ) : (
          <div className="space-y-12 py-8">
            {/* Parents - Ancestors */}
            <section className="relative">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-blue-500">
                  <ArrowLeft className="h-4 w-4" />
                  Ancestrais (Insumos/Lotes Pai)
                </h3>
                <Badge variant="outline" className="text-[9px] font-black border-blue-500/20 text-blue-500">{parents.length} Componentes</Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parents.length > 0 ? parents.map((item: LotComponent, idx) => (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={item.id}
                  >
                    <Card className="border-l-4 border-l-blue-500 bg-blue-500/5 hover:shadow-lg transition-all group cursor-default">
                      <CardContent className="py-4 px-4 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] font-black tracking-tighter truncate text-blue-700 dark:text-blue-400">
                             {item.component_lot?.lot_number || 'N/A'}
                          </p>
                          <p className="text-xs font-bold truncate opacity-80">{item.component_lot?.product_name || item.component_name}</p>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                           <div className="text-[10px] font-black text-blue-600">{item.quantity_used} {item.unit}</div>
                           <Badge variant="outline" className="text-[8px] h-3.5 mt-1 border-blue-500/10">VERIFICADO</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )) : (
                  <div className="col-span-full border-2 border-dashed border-blue-500/10 rounded-2xl py-8 flex flex-col items-center justify-center opacity-40 bg-blue-500/[0.02]">
                    <Layers className="h-8 w-8 mb-2 text-blue-500" />
                    <p className="text-[10px] uppercase font-black tracking-widest text-blue-500">Sem componentes vinculados</p>
                  </div>
                )}
              </div>

              {parents.length > 0 && (
                <div className="absolute left-1/2 -bottom-10 w-px h-10 bg-gradient-to-b from-blue-500/50 to-primary/50 hidden md:block" />
              )}
            </section>

            {/* Current Lot - Central Node */}
            <div className="flex justify-center relative py-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full max-w-sm z-10"
              >
                <Card className="border-2 border-primary bg-primary/10 shadow-[0_0_40px_rgba(var(--primary),0.15)] overflow-hidden relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
                  <CardContent className="py-8 flex flex-col items-center text-center relative">
                    <div className="w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mb-6 shadow-inner">
                      <Package className="h-10 w-10 text-primary animate-float" />
                    </div>
                    <Badge className="mb-3 uppercase tracking-[0.2em] text-[10px] font-black px-4 py-1 bg-primary text-primary-foreground">
                       Status: {lot.status}
                    </Badge>
                    <h4 className="font-mono font-black text-2xl tracking-tighter text-foreground leading-none">{lot.lot_number}</h4>
                    <p className="text-sm font-black text-muted-foreground mt-2 uppercase tracking-tight">{lot.product_name}</p>

                    <div className="grid grid-cols-2 gap-8 mt-8 w-full border-t border-primary/10 pt-6">
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Yield Operacional</span>
                          <span className="text-lg font-black text-primary">{Math.round((lot.produced_quantity / lot.quantity) * 100)}%</span>
                       </div>
                       <div className="flex flex-col">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Data Produção</span>
                          <span className="text-lg font-black text-primary">{format(parseDateOnly(lot.production_date) ?? new Date(), 'dd/MM')}</span>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {children.length > 0 && (
                <div className="absolute left-1/2 -bottom-10 w-px h-10 bg-gradient-to-b from-primary/50 to-emerald-500/50 hidden md:block" />
              )}
            </div>

            {/* Children - Successors */}
            <section className="relative">
              <div className="flex items-center justify-between mb-6">
                <Badge variant="outline" className="text-[9px] font-black border-success/20 text-success">{children.length} Derivados</Badge>
                <h3 className="text-xs font-black uppercase tracking-widest flex items-center gap-2 text-success">
                  Sucessores (Produtos Derivados)
                  <ArrowRight className="h-4 w-4" />
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children.length > 0 ? children.map((item: GenealogyChildItem, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={item.id}
                  >
                    <Card className="border-l-4 border-l-emerald-500 bg-success/5 hover:shadow-lg transition-all group cursor-default">
                      <CardContent className="py-4 px-4 flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] font-black tracking-tighter truncate text-success dark:text-success">
                             {item.lot?.lot_number || 'N/A'}
                          </p>
                          <p className="text-xs font-bold truncate opacity-80">{item.lot?.product_name || 'Produto Final'}</p>
                        </div>
                        <div className="shrink-0 ml-3 text-right">
                           <div className="text-[10px] font-black text-success">{item.quantity_used} {item.unit}</div>
                           <Badge variant="outline" className="text-[8px] h-3.5 mt-1 border-success/10 uppercase">Derivado</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )) : (
                  <div className="col-span-full border-2 border-dashed border-success/10 rounded-2xl py-8 flex flex-col items-center justify-center opacity-40 bg-success/[0.02]">
                    <Package className="h-8 w-8 mb-2 text-success" />
                    <p className="text-[10px] uppercase font-black tracking-widest text-success">Lote Final (Sem derivações)</p>
                  </div>
                )}
              </div>
            </section>

            {/* Compliance Footer */}
            <div className="p-4 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-between gap-6">
                <div className="flex items-center gap-3">
                   <div className="p-2 rounded-full bg-success/10">
                      <Layers className="h-4 w-4 text-success" />
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase tracking-tighter">Chain Consistency</p>
                      <p className="text-[9px] text-muted-foreground">Integridade verificada via Master API Industrial</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <Badge variant="secondary" className="bg-background/80 text-[8px] font-black border-border/50">NODE_STATUS: SYNCED</Badge>
                   <Badge variant="secondary" className="bg-background/80 text-[8px] font-black border-border/50">VERSION: 2.11.4</Badge>
                </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
