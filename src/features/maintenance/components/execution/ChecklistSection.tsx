import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ChecklistItem } from '@/features/maintenance/components/execution/ChecklistItem';
import type { ChecklistItemResponse, ChecklistItemUpdate } from '@/features/maintenance/components/execution/ChecklistItem';
import type { MaintenanceChecklist } from '@/features/maintenance/hooks/types';

interface ChecklistSectionProps {
  checklist: MaintenanceChecklist | null | undefined;
  responses: Record<string, ChecklistItemResponse | undefined>;
  onResponseUpdate: (itemId: string, updates: ChecklistItemUpdate) => void;
  onFileUpload: (itemId: string, file: File) => void;
  isUploading: boolean;
}

export function ChecklistSection({ checklist, responses, onResponseUpdate, onFileUpload, isUploading }: ChecklistSectionProps) {
  return (
    <div>
            {checklist ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  Checklist Obrigatório
                </h3>
                <div className="space-y-3">
                  {checklist.items?.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      response={responses[item.id]}
                      onUpdate={(updates) => onResponseUpdate(item.id, updates)}
                      onFileUpload={(file) => onFileUpload(item.id, file)}
                      isUploading={isUploading}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20 text-warning">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm">Nenhum checklist configurado para este tipo de manutenção.</p>
              </div>
            )}

    </div>
  );
}
