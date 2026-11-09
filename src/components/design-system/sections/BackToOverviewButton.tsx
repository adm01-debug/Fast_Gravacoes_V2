import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function BackToOverviewButton({ onNavigate }: { onNavigate: (tabId: string) => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onNavigate('overview')}
      className="gap-2 text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
      Voltar ao Overview
    </Button>
  );
}





