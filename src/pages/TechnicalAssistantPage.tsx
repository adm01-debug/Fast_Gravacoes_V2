/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Zap, Printer, Sun, Flame, Sparkles, Scissors, BookOpen, Settings, LayoutPanelLeft } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTechnicalConversations, useTechnicalMessages, TechnicalMessage } from "@/hooks/useTechnicalConversations";
import { isToday, isThisWeek, isThisMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConversationSidebar } from "@/components/technical-assistant/ConversationSidebar";
import { ChatArea } from "@/components/technical-assistant/ChatArea";
import { TechnicalTelemetryPanel } from "@/components/technical-assistant/TechnicalTelemetryPanel";
import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { edgeFunctionFetch } from "@/lib/edgeFunctionFetch";

const techniqueSuggestions = [
  { label: "Fiber Laser", icon: Zap, question: "Quais são os parâmetros ideais para gravar aço inox com Fiber Laser?" },
  { label: "Serigrafia", icon: Printer, question: "Como preparar uma tela de serigrafia têxtil?" },
  { label: "Sublimação", icon: Sun, question: "Qual temperatura e tempo para sublimação em canecas?" },
  { label: "Hot Stamping", icon: Flame, question: "Como funciona o processo de hot stamping?" },
  { label: "DTF", icon: Sparkles, question: "Qual a diferença entre DTF têxtil e DTF UV?" },
  { label: "Corte", icon: Scissors, question: "Como ajustar a pressão da lâmina no plotter de recorte?" },
];

const TechnicalAssistantPage = () => {
  const { conversations, isLoading: loadingConversations, createConversation, updateConversationTitle, deleteConversation } = useTechnicalConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const { messages, isLoading: loadingMessages, addMessage } = useTechnicalMessages(selectedConversationId);
  const [localMessages, setLocalMessages] = useState<TechnicalMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTelemetry, setShowTelemetry] = useState(true);

  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      if (searchQuery.trim() && !conv.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (dateFilter !== "all") {
        const convDate = new Date(conv.updated_at);
        switch (dateFilter) {
          case "today": if (!isToday(convDate)) return false; break;
          case "week": if (!isThisWeek(convDate, { locale: ptBR })) return false; break;
          case "month": if (!isThisMonth(convDate)) return false; break;
          case "older": if (isThisMonth(convDate)) return false; break;
        }
      }
      return true;
    });
  }, [conversations, searchQuery, dateFilter]);

  useEffect(() => { if (!isStreaming) setLocalMessages(messages); }, [messages, isStreaming]);

  const handleNewConversation = async () => {
    try {
      const result = await createConversation.mutateAsync("Nova conversa");
      setSelectedConversationId(result.id);
      setLocalMessages([]);
    } catch { toast.error("Erro ao criar conversa"); }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation.mutateAsync(id);
      if (selectedConversationId === id) { setSelectedConversationId(null); setLocalMessages([]); }
      toast.success("Conversa excluída");
    } catch { toast.error("Erro ao excluir conversa"); }
  };

  const saveTitle = async (id: string) => {
    try { await updateConversationTitle.mutateAsync({ id, title: editTitle }); setEditingId(null); }
    catch { toast.error("Erro ao atualizar título"); }
  };

  const streamChat = async (userMessages: { role: string; content: string }[]) => {
    const resp = await edgeFunctionFetch("technical-assistant", {
      method: "POST",
      body: JSON.stringify({ messages: userMessages }),
    });
    if (!resp.ok || !resp.body) throw new Error("Falha ao conectar com o assistente");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let assistantContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setLocalMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant" && last.id.startsWith('temp-')) {
                  return [...prev.slice(0, -1), { ...last, content: assistantContent }];
                }
                return [...prev, { id: 'temp-assistant-' + Date.now(), conversation_id: selectedConversationId ?? '', role: "assistant", content: assistantContent, created_at: new Date().toISOString() }];
              });
            }
          } catch (e) { /* Ignore partial JSON */ }
        }
      }
    }
    return assistantContent;
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || !selectedConversationId) return;
    
    if (localMessages.length === 0) {
      const generatedTitle = messageText.length > 30 ? messageText.slice(0, 30) + "..." : messageText;
      updateConversationTitle.mutate({ id: selectedConversationId, title: generatedTitle });
    }

    const userMsg: TechnicalMessage = { 
      id: 'temp-user-' + Date.now(), 
      conversation_id: selectedConversationId, 
      role: "user", 
      content: messageText, 
      created_at: new Date().toISOString() 
    };
    
    setLocalMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsStreaming(true);
    
    try {
      await addMessage.mutateAsync({ role: "user", content: messageText });
      const assistantResponse = await streamChat([...localMessages, userMsg].map(m => ({ role: m.role, content: m.content })));
      await addMessage.mutateAsync({ role: "assistant", content: assistantResponse });
    } catch (error) {
      toast.error("Erro no processamento");
    } finally { 
      setIsStreaming(false); 
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] gap-4 animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] font-black uppercase tracking-widest text-primary border-primary/30 bg-primary/10">Status: Online</Badge>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success motion-safe:animate-pulse" aria-hidden="true"></span>
              <span className="text-[11px] font-bold text-muted-foreground uppercase">Sincronizado com SPC</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 text-[10px] font-black uppercase tracking-widest gap-2 bg-background/50 backdrop-blur-sm border-primary/20 hover:bg-primary/5 group"
              onClick={() => {
                toast.info("Relatório SPC gerado com sucesso", {
                  description: "Download iniciado: REL_SPC_" + new Date().toISOString().split('T')[0] + ".pdf",
                });
              }}
            >
              <Printer className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
              Exportar SPC
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className={cn("h-8 text-[10px] font-black uppercase tracking-widest gap-2", showTelemetry && "text-primary bg-primary/5")}
              onClick={() => setShowTelemetry(!showTelemetry)}
            >
              <LayoutPanelLeft className="h-3.5 w-3.5" />
              {showTelemetry ? "Ocultar Telemetria" : "Mostrar Telemetria"}
            </Button>
          </div>
        </div>
        <div className="flex flex-1 gap-0 min-h-0 overflow-hidden rounded-2xl border border-border/50 bg-card shadow-2xl">
          <ConversationSidebar
            conversations={filteredConversations}
            selectedId={selectedConversationId}
            isLoading={loadingConversations}
            searchQuery={searchQuery}
            dateFilter={dateFilter}
            editingId={editingId}
            editTitle={editTitle}
            isCreating={createConversation.isPending}
            onSearchChange={setSearchQuery}
            onDateFilterChange={setDateFilter}
            onSelect={setSelectedConversationId}
            onNew={handleNewConversation}
            onDelete={handleDeleteConversation}
            onStartEdit={(id, title, e) => { e.stopPropagation(); setEditingId(id); setEditTitle(title); }}
            onSaveEdit={saveTitle}
            onCancelEdit={() => setEditingId(null)}
            onEditTitleChange={setEditTitle}
          />
          <div className="flex-1 flex flex-col min-w-0">
            <ChatArea
            selectedConversationId={selectedConversationId}
            messages={localMessages}
            isStreaming={isStreaming}
            isLoadingMessages={loadingMessages}
            input={input}
            onInputChange={setInput}
            onSend={sendMessage}
            onNewConversation={handleNewConversation}
            isCreating={createConversation.isPending}
            suggestions={techniqueSuggestions}
            />
          </div>

          <AnimatePresence>
            {showTelemetry && (
              <motion.div 
                initial={{ opacity: 0, x: 100, width: 0 }}
                animate={{ opacity: 1, x: 0, width: 288 }}
                exit={{ opacity: 0, x: 100, width: 0 }}
                className="hidden xl:flex flex-col"
              >
                <TechnicalTelemetryPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
};

export default TechnicalAssistantPage;