import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, Eye, Pencil, Phone, Power, QrCodeIcon, Settings2, ShieldCheck, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatLastSeen } from '@/components/operators/operator-utils';
import type { OperatorWithProfile } from '@/features/production/hooks/useOperators';
import type { Machine as DbMachine } from '@/features/production/services/machinesService';

interface OperatorCardProps {
  operator: OperatorWithProfile;
  index: number;
  assignedMachines: DbMachine[];
  isOnline: boolean;
  lastSeen: Date | undefined;
  onOpenDetails: () => void;
  onOpenSkills: () => void;
  onOpenEdit: () => void;
  onOpenAssignment: () => void;
  onShowQR: () => void;
  onToggle: () => void;
  onRemove: () => void;
}

export function OperatorCard({ operator, index, assignedMachines, isOnline, lastSeen, onOpenDetails, onOpenSkills, onOpenEdit, onOpenAssignment, onShowQR, onToggle, onRemove }: OperatorCardProps) {
  return (
    <div
                    
                    className={`flex items-center gap-4 p-4 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/5 transition-colors animate-fade-in ${
                      !operator.is_active ? 'opacity-60' : ''
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={operator.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {operator.full_name
                            ? operator.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                            : 'OP'}
                        </AvatarFallback>
                      </Avatar>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background cursor-default ${
                                isOnline ? 'bg-success' : 'bg-muted-foreground/50'
                              }`}
                            />
                          </TooltipTrigger>
                          <TooltipContent>
                            {isOnline
                              ? 'Online agora'
                              : lastSeen
                                ? `Visto ${formatLastSeen(lastSeen)}`
                                : 'Offline'
                            }
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">
                          {operator.full_name || 'Nome não informado'}
                        </p>
                        {!operator.is_active && (
                          <Badge variant="outline" className="text-warning border-warning/50 text-xs">
                            Inativo
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {operator.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {operator.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Desde {format(new Date(operator.created_at), "MMM yyyy", { locale: ptBR })}
                        </span>
                        {!isOnline && lastSeen && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Visto {formatLastSeen(lastSeen)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {assignedMachines.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {assignedMachines.slice(0, 3).map((machine) => (
                            <TooltipProvider key={machine.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="text-xs cursor-default">
                                    {machine.code}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{machine.name}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ))}
                          {assignedMachines.length > 3 && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="outline" className="text-xs cursor-default">
                                    +{assignedMachines.length - 3}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>
                                    {assignedMachines
                                      .slice(3)
                                      .map(m => m.name)
                                      .join(', ')}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          Sem máquinas
                        </Badge>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onToggle()}
                              className={`h-8 w-8 ${
                                operator.is_active
                                  ? 'text-muted-foreground hover:text-warning hover:bg-warning/10'
                                  : 'text-success hover:text-success hover:bg-success/10'
                              }`}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {operator.is_active ? 'Desativar operador' : 'Reativar operador'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onRemove()}
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Remover operador</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onShowQR()}
                              className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10"
                            >
                              <QrCodeIcon className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Crachá Digital (QR)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                onOpenDetails();
                                
                              }}
                              className="h-8 w-8 text-primary"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Visualizar Perfil</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={onOpenSkills}
                              className="h-8 w-8 text-primary hover:bg-primary/10"
                            >
                              <ShieldCheck className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Competências Técnicas</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onOpenEdit()}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar Operador</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenAssignment()}
                      >
                        <Settings2 className="h-4 w-4 mr-1" />
                        Atribuir
                      </Button>
                    </div>
                  </div>
  );
}
