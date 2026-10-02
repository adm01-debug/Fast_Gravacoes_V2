import { motion, AnimatePresence } from 'framer-motion';
import { QrCode as QrCodeIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TargetArrowIcon } from '@/components/icons/TargetArrowIcon';
import { MachineCard } from '@/components/machines/MachineCard';
import type { DbMachine, DbTechnique } from '@/features/jobs';
import type { OEEData } from '@/features/production/hooks/useOEE';

interface MachinesByTechniqueListProps {
  machinesByTechnique: Record<string, DbMachine[]>;
  getTechniqueById: (id: string) => DbTechnique | undefined;
  selectedMachines: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleGroup: (machines: DbMachine[], allSelected: boolean) => void;
  oeeData: OEEData | null | undefined;
  onOpenSettings: (machine: DbMachine) => void;
  onShowQR: (machine: DbMachine) => void;
}

export function MachinesByTechniqueList({ machinesByTechnique, getTechniqueById, selectedMachines, onToggleSelect, onToggleGroup, oeeData, onOpenSettings, onShowQR }: MachinesByTechniqueListProps) {
  return (
    <AnimatePresence mode="popLayout">
              {Object.entries(machinesByTechnique).length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="py-20 text-center"
                >
                  <TargetArrowIcon className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
                  <p className="text-muted-foreground">Nenhuma máquina encontrada com os filtros aplicados.</p>
                </motion.div>
              ) : (
                Object.entries(machinesByTechnique).map(([techniqueId, techMachines]) => {
                  const technique = techniqueId ? getTechniqueById(techniqueId) : undefined;
                  return (
                    <motion.div
                      layout
                      key={techniqueId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Card className="glass-card overflow-hidden">
                        <CardHeader className="pb-3 bg-muted/10 border-b border-border/50">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-3 text-base">
                              <div
                                className="w-2 h-2 rounded-full ring-4 ring-background"
                                style={{ backgroundColor: technique?.color || '#888' }}
                              />
                              <span>{technique?.name || 'Técnica Desconhecida'}</span>
                              <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-widest">
                                {(techMachines as DbMachine[]).length}
                              </Badge>
                            </CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-[10px] uppercase font-bold tracking-tighter"
                              onClick={() => {
                                const allSelected = (techMachines as DbMachine[]).every((m) => selectedMachines.has(m.id));
                                onToggleGroup(techMachines as DbMachine[], allSelected);
                              }}
                            >
                              {(techMachines as DbMachine[]).every((m) => selectedMachines.has(m.id)) ? 'Deselecionar' : 'Selecionar Grupo'}
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-6">
                          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {(techMachines as DbMachine[]).map((machine, idx: number) => {

                              const machineMetrics = oeeData?.byMachine.find(m => m.machineId === machine.id);
                              return (
                                <div key={machine.id} className="relative group">
                                  <MachineCard
                                    machine={machine}
                                    isSelected={selectedMachines.has(machine.id)}
                                    onSelect={(id) => {
                                      onToggleSelect(id);
                                    }}
                                    onOpenSettings={onOpenSettings}
                                    index={idx}
                                    metrics={machineMetrics ? {
                                      oee: machineMetrics.oee,
                                      availability: machineMetrics.availability,
                                      performance: machineMetrics.performance,
                                      quality: machineMetrics.quality
                                    } : undefined}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-12 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity rounded-full bg-background/50 hover:bg-primary/10 hover:text-primary z-10"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onShowQR(machine);
                                    }}
                                  >
                                    <QrCodeIcon className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })
              )}
    </AnimatePresence>
  );
}
