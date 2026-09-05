import { MainLayout } from '@/components/layout/MainLayout';
import { DocumentsList } from '@/components/documents/DocumentsList';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { FileText } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <Breadcrumbs />

        <div>
          <h1 className="text-2xl text-title font-bold gradient-text flex items-center gap-3">
            <FileText className="h-7 w-7 text-primary" />
            Documentos e Instruções
          </h1>
          <p className="text-muted-foreground">
            Gerencie PDFs, instruções de trabalho e documentos técnicos com versionamento e aprovação
          </p>
        </div>

        <DocumentsList />
      </div>
    </MainLayout>
  );
}
