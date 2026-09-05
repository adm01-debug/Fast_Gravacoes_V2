import { useOperators } from '@/features/production';
import { useSchedulingData } from '@/features/jobs';
import { useOperatorMachines } from '@/features/production';
import { useOperatorSkills, type SkillLevel } from '@/features/production';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, X, Shield, Star, Award } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function SkillsMatrix() {
  const { data: operators = [] } = useOperators();
  const { techniques, machines } = useSchedulingData();
  const { assignments = [] } = useOperatorMachines();
  const { skills = [] } = useOperatorSkills();

  const getSkillLevel = (operatorId: string, techniqueId: string): SkillLevel | null => {
    // 1. Check direct skill certification first
    const directSkill = skills.find(s => s.operator_id === operatorId && s.technique_id === techniqueId);
    if (directSkill) return directSkill.skill_level;

    // 2. Fallback to machine assignment logic (Legacy/Auto-detection)
    const techniqueMachines = machines.filter(m => m.technique_id === techniqueId).map(m => m.id);
    const techAssignments = assignments.filter(
      (a) => a.operator_id === operatorId && techniqueMachines.includes(a.machine_id)
    );

    if (techAssignments.length === 0) return null;

    const count = techAssignments.length;
    if (count >= 3) return 'expert';
    if (count >= 2) return 'advanced';
    return 'basic';
  };

  const getLevelBadge = (level: SkillLevel | null) => {
    switch (level) {
      case 'expert':
        return <Badge className="bg-success hover:bg-success border-none shadow-glow-success"><Star className="h-3 w-3 mr-1" /> Expert</Badge>;
      case 'advanced':
        return <Badge className="bg-blue-500 hover:bg-blue-600 border-none shadow-glow-primary"><Award className="h-3 w-3 mr-1" /> Sênior</Badge>;
      case 'basic':
        return <Badge variant="secondary" className="bg-slate-500/20 text-slate-400 border-none">Júnior</Badge>;
      default:
        return <X className="h-4 w-4 text-muted-foreground/30 mx-auto" />;
    }
  };

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Matrix de Polivalência Industrial
        </CardTitle>
        <CardDescription>
          Mapeamento de competências e certificações técnicas por operador
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[200px]">Operador</TableHead>
                {techniques.map((tech) => (
                  <TableHead key={tech.id} className="text-center min-w-[120px]">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tech.color || '#888' }}
                      />
                      <span className="text-[10px] uppercase font-bold tracking-tighter">
                        {tech.name}
                      </span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {operators.map((op) => (
                <TableRow key={op.id} className="hover:bg-accent/5">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{op.full_name}</span>
                      <span className="text-[10px] text-muted-foreground uppercase">{op.role || 'Operador'}</span>
                    </div>
                  </TableCell>
                  {techniques.map((tech) => (
                    <TableCell key={tech.id} className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex justify-center">
                              {getLevelBadge(getSkillLevel(op.user_id, tech.id))}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{op.full_name} - {tech.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {getSkillLevel(op.user_id, tech.id)
                                ? `Nível ${getSkillLevel(op.user_id, tech.id)} confirmado por alocação de ativos.`
                                : 'Sem certificação ativa para esta técnica.'}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
