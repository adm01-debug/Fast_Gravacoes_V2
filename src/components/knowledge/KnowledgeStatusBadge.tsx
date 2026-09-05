import { Badge } from '@/components/ui/badge';
import { TechnicalSheet } from '@/hooks/technical-sheets/technicalSheetsTypes';
import { CheckCircle2, FileEdit, AlertCircle } from 'lucide-react';

interface KnowledgeStatusBadgeProps {
  status: TechnicalSheet['status'];
  className?: string;
}

export const KnowledgeStatusBadge = ({ status, className }: KnowledgeStatusBadgeProps) => {
  switch (status) {
    case 'published':
      return (
        <Badge variant="secondary" className={`bg-success/15 text-success border-success/30 gap-1 font-medium ${className}`}>
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          Homologada
        </Badge>
      );
    case 'review_needed':
      return (
        <Badge variant="secondary" className={`bg-warning/15 text-warning border-warning/30 gap-1 font-medium ${className}`}>
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          Revisão Necessária
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={`bg-muted/50 text-foreground border-border gap-1 font-medium ${className}`}>
          <FileEdit className="h-3 w-3" aria-hidden="true" />
          Rascunho
        </Badge>
      );
  }
};
