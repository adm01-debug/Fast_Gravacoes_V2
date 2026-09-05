import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Image as ImageIcon,
  Clock,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProductionPhotosProps {
  photos: string[] | null;
  jobId?: string;
  className?: string;
  emptyMessage?: string;
}

export function ProductionPhotos({
  photos,
  jobId,
  className,
  emptyMessage = "Nenhuma foto registrada para este job."
}: ProductionPhotosProps) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl bg-muted/20 text-muted-foreground", className)}>
        <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
        <p className="text-sm font-medium">{emptyMessage}</p>
      </div>
    );
  }

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex - 1 + photos.length) % photos.length);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedPhotoIndex !== null) {
      setSelectedPhotoIndex((selectedPhotoIndex + 1) % photos.length);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Evidências de Produção ({photos.length})
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {photos.map((photo, index) => (
          <Dialog key={index}>
            <DialogTrigger asChild>
              <div
                role="button"
                tabIndex={0}
                aria-label={`Ampliar foto ${index + 1}`}
                className="group relative aspect-square rounded-xl overflow-hidden border border-border bg-muted cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setSelectedPhotoIndex(index)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedPhotoIndex(index); } }}
              >
                <img
                  src={photo}
                  alt={`Produção ${index + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Maximize2 className="h-6 w-6 text-white" />
                </div>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden bg-black/95 border-none">
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={photos[selectedPhotoIndex ?? index]}
                  alt="Foto em tela cheia"
                  className="max-w-full max-h-full object-contain"
                />

                {photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border-none"
                      onClick={handlePrev}
                    >
                      <ChevronLeft className="h-8 w-8" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white border-none"
                      onClick={handleNext}
                    >
                      <ChevronRight className="h-8 w-8" />
                    </Button>
                  </>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase tracking-tighter opacity-70">Arquivo Evidência</p>
                      <div className="flex items-center gap-4 text-sm font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        {jobId && (
                          <span className="opacity-50">Job ID: {jobId.slice(0, 8)}</span>
                        )}
                      </div>
                    </div>
                    <Badge className="bg-primary/20 text-primary border-primary/30 font-bold px-3 py-1">
                      FOTO { (selectedPhotoIndex ?? index) + 1 } / { photos.length }
                    </Badge>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </div>
  );
}

// Badge auxiliar para indicar que o job tem fotos
export function PhotosCountBadge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold animate-fade-in">
      <Camera className="h-3 w-3" />
      {count}
    </div>
  );
}
