import { useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function FileAnalyzer({ onFileProcessed }: { onFileProcessed: (file: File) => void }) {
  const [dragActive] = useState(false);

  const handleFile = (file: File) => {
    onFileProcessed(file);
  };

  return (
    <div className={cn("border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-3 transition-colors", dragActive ? "border-primary bg-primary/5" : "border-border")}>
      <Upload className="h-8 w-8 text-muted-foreground" />
      <div className="text-center">
        <p className="text-sm font-medium">Arraste manuais ou fotos</p>
        <p className="text-xs text-muted-foreground">PDFs ou imagens (JPG/PNG)</p>
      </div>
      <input type="file" className="hidden" id="file-upload" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
      <Button variant="secondary" size="sm" onClick={() => document.getElementById('file-upload')?.click()}>Selecionar Arquivo</Button>
    </div>
  );
}
