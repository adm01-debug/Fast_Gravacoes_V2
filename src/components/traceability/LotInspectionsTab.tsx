import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Plus, CheckCircle, XCircle, AlertTriangle, ClipboardCheck, Camera, Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ProductionLot, useTraceabilityMutations, type LotQualityInspection } from '@/features/inventory';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { validateFileMagicBytes } from '@/lib/file-validation';

const INSPECTION_RESULTS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  approved: { label: 'Aprovado', variant: 'default' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
  conditional: { label: 'Condicional', variant: 'secondary' },
};

interface LotInspectionsTabProps {
  lot: ProductionLot;
  inspections: LotQualityInspection[] | undefined;
}

export function LotInspectionsTab({ lot, inspections }: LotInspectionsTabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [newInspection, setNewInspection] = useState({
    inspection_type: '',
    result: 'approved',
    inspector_name: '',
    sample_size: 0,
    defects_found: 0,
    notes: '',
    photos: [] as string[]
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addInspection } = useTraceabilityMutations();

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0 || !lot) return;

    setIsUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Validação Magic Bytes (Segurança 10/10)
        const validation = await validateFileMagicBytes(file);
        if (!validation.isValid) {
          toast.error(`Arquivo inválido: ${file.name}. ${validation.error}`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `inspections/${lot.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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

      setNewInspection(prev => ({
        ...prev,
        photos: [...prev.photos, ...uploadedUrls]
      }));
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
    setNewInspection(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleAdd = () => {
    addInspection.mutate({
      lot_id: lot.id,
      inspection_type: newInspection.inspection_type,
      result: newInspection.result,
      inspector_name: newInspection.inspector_name || undefined,
      sample_size: newInspection.sample_size || undefined,
      defects_found: newInspection.defects_found || undefined,
      notes: newInspection.notes || undefined,
      photos: newInspection.photos.length > 0 ? newInspection.photos : undefined
    }, {
      onSuccess: () => {
        setShowAdd(false);
        setNewInspection({
          inspection_type: '',
          result: 'approved',
          inspector_name: '',
          sample_size: 0,
          defects_found: 0,
          notes: '',
          photos: []
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium">Inspeções de Qualidade</h4>
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-1" />Nova Inspeção</Button>
      </div>
      {showAdd && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Tipo de Inspeção *</Label><Input value={newInspection.inspection_type} onChange={(e) => setNewInspection(p => ({ ...p, inspection_type: e.target.value }))} placeholder="Ex: Visual, Dimensional" /></div>
              <div className="space-y-2"><Label>Resultado *</Label>
                <Select value={newInspection.result} onValueChange={(v) => setNewInspection(p => ({ ...p, result: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(INSPECTION_RESULTS).map(([key, config]) => (<SelectItem key={key} value={key}>{config.label}</SelectItem>))}</SelectContent></Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2"><Label>Inspetor</Label><Input value={newInspection.inspector_name} onChange={(e) => setNewInspection(p => ({ ...p, inspector_name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Amostragem</Label><Input type="number" value={newInspection.sample_size} onChange={(e) => setNewInspection(p => ({ ...p, sample_size: parseInt(e.target.value, 10) || 0 }))} /></div>
              <div className="space-y-2"><Label>Defeitos</Label><Input type="number" value={newInspection.defects_found} onChange={(e) => setNewInspection(p => ({ ...p, defects_found: parseInt(e.target.value, 10) || 0 }))} /></div>
            </div>
            <div className="space-y-2"><Label>Notas</Label><Textarea value={newInspection.notes} onChange={(e) => setNewInspection(p => ({ ...p, notes: e.target.value }))} rows={2} /></div>

            {/* Photos Upload Area */}
            <div className="space-y-3 pt-2">
              <Label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Camera className="h-3.5 w-3.5" /> Evidências Fotográficas
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
                size="sm"
                className="w-full border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />Anexar Fotos de Inspeção</>
                )}
              </Button>

              {newInspection.photos.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {newInspection.photos.map((photo, index) => (
                    <div key={index} className="relative group aspect-square">
                      <img
                        src={photo}
                        alt={`Inspeção ${index + 1}`}
                        className="w-full h-full object-cover rounded-md border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2"><Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</Button><Button className="flex-1" onClick={handleAdd} disabled={addInspection.isPending || isUploading}>Registrar Inspeção</Button></div>
          </CardContent>
        </Card>
      )}
      {inspections && inspections.length > 0 ? (
        <div className="space-y-3">
          {inspections.map((insp) => {
            const resultConfig = INSPECTION_RESULTS[insp.result];
            const ResultIcon = insp.result === 'approved' ? CheckCircle : insp.result === 'rejected' ? XCircle : AlertTriangle;
            return (
              <div key={insp.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <ResultIcon className={`h-5 w-5 mt-0.5 ${insp.result === 'approved' ? 'text-green-500' : insp.result === 'rejected' ? 'text-destructive' : 'text-warning'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="font-medium text-sm">{insp.inspection_type}</span><Badge variant={resultConfig?.variant || 'default'}>{resultConfig?.label}</Badge></div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px] text-muted-foreground">
                    <span>📅 {format(new Date(insp.inspected_at), 'dd/MM/yyyy HH:mm')}</span>
                    {insp.inspector_name && <span>👤 {insp.inspector_name}</span>}
                    {(insp.sample_size ?? 0) > 0 && <span>📊 Amostra: {insp.sample_size}</span>}
                    {(insp.defects_found ?? 0) > 0 && <span className="text-destructive font-bold">⚠ {insp.defects_found} defeitos</span>}
                  </div>
                  {insp.notes && <p className="text-sm text-muted-foreground mt-2 bg-muted/30 p-2 rounded italic border-l-2 border-primary/20">{insp.notes}</p>}

                  {/* Inspection Photos Gallery */}
                  {insp.photos && insp.photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {insp.photos.map((photo: string, idx: number) => (
                        <Dialog key={idx}>
                          <DialogTrigger asChild>
                            <div className="relative cursor-zoom-in group">
                              <img
                                src={photo}
                                alt="Evidência"
                                className="h-16 w-16 object-cover rounded-md border border-border/50 transition-transform group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-md transition-opacity">
                                <ImageIcon className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl p-1 bg-transparent border-none">
                            <img src={photo} alt="Evidência Ampliada" className="w-full h-auto rounded-lg shadow-2xl" />
                          </DialogContent>
                        </Dialog>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : !showAdd && (
        <div className="text-center py-8 text-muted-foreground"><ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>Nenhuma inspeção registrada</p></div>
      )}
    </div>
  );
}
