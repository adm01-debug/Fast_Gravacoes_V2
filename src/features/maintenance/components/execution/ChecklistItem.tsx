import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Camera, CheckCircle2 } from 'lucide-react';

export interface ChecklistItemData {
  id: string;
  description: string;
  is_critical?: boolean;
  requires_measurement?: boolean;
  measurement_unit?: string | null;
  min_value?: number | null;
  max_value?: number | null;
  requires_photo?: boolean;
}

export interface ChecklistItemResponse {
  is_checked?: boolean;
  measurement_value?: number;
  notes?: string;
  photo_url?: string;
}

export type ChecklistItemUpdate = Partial<ChecklistItemResponse>;

interface ChecklistItemProps {
  item: ChecklistItemData;
  response: ChecklistItemResponse | null | undefined;
  onUpdate: (updates: ChecklistItemUpdate) => void;
  onFileUpload: (file: File) => void;
  isUploading: boolean;
}

export function ChecklistItem({ item, response, onUpdate, onFileUpload, isUploading }: ChecklistItemProps) {
  return (
    <div className="p-4 rounded-lg bg-secondary/20 border border-border/50 space-y-3">
      <div className="flex items-start gap-3">
        <Checkbox
          id={`item-${item.id}`}
          checked={response?.is_checked}
          onCheckedChange={(checked) => onUpdate({ is_checked: !!checked })}
          className="mt-1"
        />
        <div className="flex-1">
          <Label
            htmlFor={`item-${item.id}`}
            className="font-medium cursor-pointer"
          >
            {item.description}
            {item.is_critical && <span className="text-destructive ml-1">*</span>}
          </Label>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 pl-8">
        {item.requires_measurement && (
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Medição ({item.measurement_unit}):</Label>
            <Input
              type="number"
              size={1}
              className="h-8 w-24"
              placeholder="Valor"
              value={response?.measurement_value || ''}
              onChange={(e) => onUpdate({ measurement_value: parseFloat(e.target.value) })}
            />
            {(item.min_value !== null || item.max_value !== null) && (
              <span className="text-[10px] text-muted-foreground">
                Limites: {item.min_value ?? '-'} a {item.max_value ?? '-'}
              </span>
            )}
          </div>
        )}
        {item.requires_photo && (
          <div className="flex items-center gap-2">
            {response?.photo_url ? (
              <Badge variant="outline" className="text-success gap-1 h-8">
                <CheckCircle2 className="h-3 w-3" /> Foto OK
              </Badge>
            ) : (
              <div className="relative">
                <Input
                  type="file"
                  className="hidden"
                  id={`photo-${item.id}`}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileUpload(file);
                  }}
                  disabled={isUploading}
                />
                <Label
                  htmlFor={`photo-${item.id}`}
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 cursor-pointer gap-1"
                >
                  <Camera className="h-3 w-3" /> Foto
                </Label>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
