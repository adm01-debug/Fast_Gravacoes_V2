import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryConfig';
import { DbJob } from '@/features/jobs';
import { canTransition } from '@/features/jobs/services/jobStateMachine';
import { JobStatus } from '@/types/scheduling';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';
import { validateFileMagicBytes } from '@/lib/file-validation';
import { safeParseInt, safeParseFloat } from '@/lib/utils';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Package,
  Trash2,
  Loader2
} from 'lucide-react';

// Campos que operadores podem atualizar (conforme RLS policy)
const ALLOWED_OPERATOR_FIELDS = [
  'produced_quantity',
  'lost_pieces',
  'actual_start_time',
  'actual_end_time',
  'production_photos',
  'notes'
] as const;

type AllowedField = typeof ALLOWED_OPERATOR_FIELDS[number];

// Tipo para o payload sanitizado
interface SanitizedPayload {
  status?: string;
  produced_quantity?: number;
  lost_pieces?: number;
  actual_start_time?: string;
  actual_end_time?: string;
  production_photos?: string[] | null;
  notes?: string | null;
}

/**
 * Sanitiza o payload para garantir que apenas campos permitidos sejam enviados.
 * Isso é uma camada adicional de segurança além do RLS no banco de dados.
 */
function sanitizeOperatorPayload(data: {
  status?: string;
  produced_quantity?: number;
  lost_pieces?: number;
  actual_start_time?: string;
  actual_end_time?: string;
  production_photos?: string[] | null;
  notes?: string | null;
  [key: string]: unknown;
}): SanitizedPayload {
  const sanitized: SanitizedPayload = {};

  if (data.status !== undefined) {
    sanitized.status = data.status;
  }
  if (data.produced_quantity !== undefined) {
    sanitized.produced_quantity = data.produced_quantity;
  }
  if (data.lost_pieces !== undefined) {
    sanitized.lost_pieces = data.lost_pieces;
  }
  if (data.actual_start_time !== undefined) {
    sanitized.actual_start_time = data.actual_start_time;
  }
  if (data.actual_end_time !== undefined) {
    sanitized.actual_end_time = data.actual_end_time;
  }
  if (data.production_photos !== undefined) {
    sanitized.production_photos = data.production_photos;
  }
  if (data.notes !== undefined) {
    sanitized.notes = data.notes;
  }

  return sanitized;
}

interface ProductionRegistrationModalProps {
  job: DbJob | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductionRegistrationModal({
  job,
  open,
  onOpenChange
}: ProductionRegistrationModalProps) {
  const [producedQuantity, setProducedQuantity] = useState<number>(0);
  const [lostPieces, setLostPieces] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Checklist de Qualidade (Hyper-Excellence)
  const [qualityChecks, setQualityChecks] = useState({
    color: false,
    burrs: false,
    packaging: false,
    dimensions: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Reset form when job changes
  const handleOpenChange = (open: boolean) => {
    if (open && job) {
      setProducedQuantity(job.quantity);
      setLostPieces(job.lost_pieces || 0);
      setNotes(job.notes || '');
      setPhotos([]);
      setQualityChecks({
        color: false,
        burrs: false,
        packaging: false,
        dimensions: false
      });
    }
    onOpenChange(open);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !job) return;

    setIsUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Validação por Magic Bytes (Segurança 10/10)
        const validation = await validateFileMagicBytes(file);
        if (!validation.isValid) {
          toast.error(`Arquivo inválido: ${file.name}. ${validation.error}`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${job.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('production-photos')
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`Erro ao enviar foto: ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('production-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setPhotos(prev => [...prev, ...uploadedUrls]);
      toast.success(`${uploadedUrls.length} foto(s) enviada(s)`);
    } catch (error) {
      toast.error('Erro ao enviar fotos');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!job) return;

    // Validar campos numéricos
    if (producedQuantity < 0 || lostPieces < 0) {
      toast.error('Quantidades não podem ser negativas');
      return;
    }
    if (producedQuantity > job.quantity * 3) {
      toast.error(`Quantidade produzida muito alta (máximo ${(job.quantity * 3).toLocaleString()})`);
      return;
    }
    // Build finalNotes first so the length check covers the full string
    const checklistStr = `[Protocolo Qualidade: ${qualityChecks.color ? 'COR OK, ' : 'COR PENDENTE, '}${qualityChecks.burrs ? 'REBARBA OK, ' : 'REBARBA PENDENTE, '}${qualityChecks.dimensions ? 'DIMENSÕES OK, ' : 'DIMENSÕES PENDENTE, '}${qualityChecks.packaging ? 'EMBALAGEM OK' : 'EMBALAGEM PENDENTE'}]`;
    const finalNotes = notes ? `${notes}\n\n${checklistStr}` : checklistStr;

    if (finalNotes.length > 2000) {
      toast.error('Observações excedem o limite de 2000 caracteres');
      return;
    }

    if (!canTransition(job.status as JobStatus, 'finished')) {
      toast.error(`Job não pode ser finalizado no estado atual: "${job.status}"`);
      return;
    }

    setIsSaving(true);

    try {

      // Montar payload com todos os campos desejados
      const rawPayload = {
        status: 'finished',
        actual_end_time: new Date().toISOString(),
        lost_pieces: lostPieces,
        notes: finalNotes,
        produced_quantity: producedQuantity,
        production_photos: photos.length > 0 ? photos : null,
      };

      // SANITIZAR: garantir que apenas campos permitidos sejam enviados
      const sanitizedPayload = sanitizeOperatorPayload(rawPayload);

      const { error } = await supabase
        .from('jobs')
        .update(sanitizedPayload)
        .eq('id', job.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS_RECENT });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.SCHEDULING_DATA });
      toast.success('Produção finalizada com sucesso!');
      onOpenChange(false);
    } catch (error) {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao salvar registro de produção');
    } finally {
      setIsSaving(false);
    }
  };

  if (!job) return null;

  const lossPercentage = job.quantity > 0 ? ((lostPieces / job.quantity) * 100).toFixed(1) : '0';
  const isHighLoss = safeParseFloat(lossPercentage) > 5;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Registro de Produção
          </DialogTitle>
          <DialogDescription>
            Informe a quantidade produzida, refugos e observações para finalizar este trabalho.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Job Info */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{job.client}</span>
                <Badge variant="outline">{job.order_number}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{job.product}</p>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <Package className="h-4 w-4" />
                <span>Quantidade solicitada: <strong>{job.quantity.toLocaleString()}</strong> pçs</span>
              </div>
            </div>

            {/* Produced Quantity */}
            <div className="space-y-2">
              <Label htmlFor="produced">Quantidade Produzida</Label>
              <Input
                id="produced"
                type="number"
                min={0}
                max={job.quantity * 3}
                value={producedQuantity}
                onChange={(e) => setProducedQuantity(safeParseInt(e.target.value, 0))}
                className="bg-background"
              />
            </div>

            {/* Lost Pieces */}
            <div className="space-y-2">
              <Label htmlFor="lost" className="flex items-center gap-2">
                Peças Perdidas (Refugo)
                {isHighLoss && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Alto índice
                  </Badge>
                )}
              </Label>
              <Input
                id="lost"
                type="number"
                min={0}
                max={job.quantity}
                value={lostPieces}
                onChange={(e) => setLostPieces(safeParseInt(e.target.value, 0))}
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground">
                Índice de perda: <span className={isHighLoss ? 'text-destructive font-medium' : ''}>{lossPercentage}%</span>
              </p>
            </div>

            {/* Quality Checklist (Hyper-Excellence) */}
            <div className="space-y-4 p-4 rounded-xl bg-primary/5 border border-primary/20 shadow-inner">
              <Label className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Protocolo de Qualidade 5.0
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="check-color"
                    checked={qualityChecks.color}
                    onCheckedChange={(checked) => setQualityChecks(prev => ({ ...prev, color: !!checked }))}
                  />
                  <label htmlFor="check-color" className="text-xs font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Conformidade de Cor
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="check-burrs"
                    checked={qualityChecks.burrs}
                    onCheckedChange={(checked) => setQualityChecks(prev => ({ ...prev, burrs: !!checked }))}
                  />
                  <label htmlFor="check-burrs" className="text-xs font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Ausência de Rebarbas
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="check-dimensions"
                    checked={qualityChecks.dimensions}
                    onCheckedChange={(checked) => setQualityChecks(prev => ({ ...prev, dimensions: !!checked }))}
                  />
                  <label htmlFor="check-dimensions" className="text-xs font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Dimensões Conferidas
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="check-packaging"
                    checked={qualityChecks.packaging}
                    onCheckedChange={(checked) => setQualityChecks(prev => ({ ...prev, packaging: !!checked }))}
                  />
                  <label htmlFor="check-packaging" className="text-xs font-bold leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Embalagem Padrão
                  </label>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Adicione observações sobre a produção..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={2000}
                className="bg-background min-h-[80px]"
              />
            </div>

            {/* Photos */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Fotos da Produção
              </Label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoUpload}
              />

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Adicionar Fotos
                  </>
                )}
              </Button>

              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img
                        src={photo}
                        alt={`Foto ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Finalizar Produção
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
