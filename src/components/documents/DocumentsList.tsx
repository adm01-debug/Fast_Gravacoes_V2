import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  Image,
  File,
  Upload,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Download,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TechnicalDocument, useDocuments } from '@/hooks/useDocuments';
import { DocumentUploadModal } from './DocumentUploadModal';
import { DocumentViewer } from './DocumentViewer';
import { useAuth } from '@/features/auth';

interface DocumentsListProps {
  technicalSheetId?: string;
  compact?: boolean;
}

export function DocumentsList({ technicalSheetId, compact = false }: DocumentsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showUpload, setShowUpload] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<TechnicalDocument | null>(null);

  const { documents, isLoading, deleteDocument } = useDocuments(technicalSheetId);
  const { role } = useAuth();

  const canManage = role === 'coordinator';

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.file_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
    if (type.startsWith('image/')) return <Image className="h-5 w-5 text-blue-500" />;
    return <File className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-success/10 text-success border-success/30 text-xs"><CheckCircle className="h-3 w-3 mr-1" /> Aprovado</Badge>;
      case 'rejected':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/30 text-xs"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
      default:
        return <Badge className="bg-warning/10 text-warning border-warning/30 text-xs"><AlertCircle className="h-3 w-3 mr-1" /> Pendente</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-sm">Documentos Anexos</h4>
          {canManage && (
            <Button size="sm" variant="outline" onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Carregando...</div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            Nenhum documento anexado
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.slice(0, 5).map((doc) => (
              <div
                key={doc.id}
                role="button"
                tabIndex={0}
                aria-label={`Abrir documento ${doc.title}`}
                className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/20 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => setSelectedDocument(doc)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedDocument(doc); } }}
              >
                {getFileIcon(doc.file_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">v{doc.version} • {formatFileSize(doc.file_size)}</p>
                </div>
                {getStatusBadge(doc.status)}
              </div>
            ))}
          </div>
        )}

        <DocumentUploadModal
          open={showUpload}
          onOpenChange={setShowUpload}
          technicalSheetId={technicalSheetId}
        />
        <DocumentViewer
          document={selectedDocument}
          open={!!selectedDocument}
          onOpenChange={(open) => !open && setSelectedDocument(null)}
        />
      </div>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Documentos Técnicos
          </CardTitle>
          {canManage && (
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Enviar Documento
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="approved">Aprovados</SelectItem>
              <SelectItem value="rejected">Rejeitados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Documents List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
            Carregando documentos...
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhum documento encontrado</p>
            {canManage && (
              <Button variant="link" onClick={() => setShowUpload(true)} className="mt-2">
                Enviar primeiro documento
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/20 transition-colors group"
                >
                  {getFileIcon(doc.file_type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{doc.title}</p>
                      {getStatusBadge(doc.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span>{doc.file_name}</span>
                      <span>•</span>
                      <span>v{doc.version}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{format(new Date(doc.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                    </div>
                    {doc.technical_sheets && (
                      <p className="text-xs text-primary mt-1">
                        Vinculado a: {doc.technical_sheets.title}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDocument(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <a href={doc.file_url} download={doc.file_name}>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteDocument.mutate(doc.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <DocumentUploadModal
        open={showUpload}
        onOpenChange={setShowUpload}
        technicalSheetId={technicalSheetId}
      />
      <DocumentViewer
        document={selectedDocument}
        open={!!selectedDocument}
        onOpenChange={(open) => !open && setSelectedDocument(null)}
      />
    </Card>
  );
}
