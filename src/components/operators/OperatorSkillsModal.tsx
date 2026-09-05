import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOperatorSkills, type SkillLevel } from '@/features/production';
import { useSchedulingData } from '@/features/jobs';
import type { OperatorWithProfile } from '@/features/production';
import { Loader2, ShieldCheck, Award, Star, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OperatorSkillsModalProps {
  operator: OperatorWithProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OperatorSkillsModal({ operator, open, onOpenChange }: OperatorSkillsModalProps) {
  const { techniques } = useSchedulingData();
  const { skills = [], upsertSkill, isUpserting, deleteSkill } = useOperatorSkills(operator?.user_id);
  const [selectedTechnique, setSelectedTechnique] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<SkillLevel>('basic');

  const handleAddSkill = () => {
    if (!operator || !selectedTechnique) return;
    upsertSkill({
      operator_id: operator.user_id,
      technique_id: selectedTechnique,
      skill_level: selectedLevel,
      certified_at: new Date().toISOString(),
      expires_at: null,
    });
    setSelectedTechnique('');
  };

  const getLevelIcon = (level: SkillLevel) => {
    switch (level) {
      case 'expert': return <Star className="h-3 w-3 text-success" />;
      case 'advanced': return <Award className="h-3 w-3 text-blue-500" />;
      default: return <ShieldCheck className="h-3 w-3 text-slate-400" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Certificações Técnicas - {operator?.full_name}
          </DialogTitle>
          <DialogDescription>
            Gerencie as competências certificadas deste operador.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Add Skill Form */}
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-3 items-end bg-accent/5 p-3 rounded-lg border border-border/50">
            <div className="sm:col-span-3 space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Técnica</Label>
              <Select value={selectedTechnique} onValueChange={setSelectedTechnique}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {techniques.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3 space-y-2">
              <Label className="text-[10px] uppercase font-bold text-muted-foreground">Nível</Label>
              <Select value={selectedLevel} onValueChange={(v) => setSelectedLevel(v as SkillLevel)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Júnior / Básico</SelectItem>
                  <SelectItem value="advanced">Sênior / Avançado</SelectItem>
                  <SelectItem value="expert">Master / Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-1">
              <Button
                onClick={handleAddSkill}
                disabled={!selectedTechnique || isUpserting}
                size="sm"
                className="w-full h-9"
              >
                {isUpserting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
          </div>

          {/* Skills List */}
          <div className="space-y-3">
            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Competências Atuais</Label>
            <ScrollArea className="h-[200px] pr-4">
              {skills.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm italic">
                  Nenhuma certificação manual atribuída.
                </div>
              ) : (
                <div className="space-y-2">
                  {skills.map(skill => {
                    const tech = techniques.find(t => t.id === skill.technique_id);
                    return (
                      <div
                        key={skill.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card/50 hover:bg-accent/5 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: tech?.color || '#888' }}
                          />
                          <div>
                            <p className="text-sm font-medium">{tech?.name || skill.technique_id}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {getLevelIcon(skill.skill_level)}
                              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">
                                {skill.skill_level === 'expert' ? 'Expert' : skill.skill_level === 'advanced' ? 'Sênior' : 'Júnior'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteSkill(skill.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
