/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useRef, useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Bot, Send, User, Loader2, Sparkles, Plus, Search, ChevronUp, ChevronDown, X, Keyboard, Mic, Copy, Download, Paperclip, Activity, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileAnalyzer } from "./FileAnalyzer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { TechnicalMessage } from "@/hooks/useTechnicalConversations";
import { ChatMessage } from "./ChatMessage";
import { motion, AnimatePresence } from "framer-motion";

interface TechniqueSuggestion {
  label: string;
  icon: React.ElementType;
  question: string;
}

interface ChatAreaProps {
  selectedConversationId: string | null;
  messages: TechnicalMessage[];
  isStreaming: boolean;
  isLoadingMessages: boolean;
  input: string;
  onInputChange: (v: string) => void;
  onSend: (text?: string) => void;
  onNewConversation: () => void;
  isCreating: boolean;
  suggestions: TechniqueSuggestion[];
}

export function ChatArea({
  selectedConversationId, messages, isStreaming, isLoadingMessages,
  input, onInputChange, onSend, onNewConversation, isCreating, suggestions
}: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [messageSearchActive, setMessageSearchActive] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [diagnosticMode, setDiagnosticMode] = useState(false);

  const matchingMessageIndices = useMemo(() => {
    if (!messageSearchQuery.trim()) return [];
    const query = messageSearchQuery.toLowerCase();
    return messages
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => msg.content.toLowerCase().includes(query))
      .map(({ index }) => index);
  }, [messages, messageSearchQuery]);

  useEffect(() => { setCurrentMatchIndex(0); }, [messageSearchQuery]);

  useEffect(() => {
    if (matchingMessageIndices.length > 0 && messageSearchQuery.trim()) {
      const targetIndex = matchingMessageIndices[currentMatchIndex];
      const targetMessage = messages[targetIndex];
      if (targetMessage) {
        const el = messageRefs.current.get(targetMessage.id);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentMatchIndex, matchingMessageIndices, messages, messageSearchQuery]);

  useEffect(() => {
    setMessageSearchQuery("");
    setMessageSearchActive(false);
    setCurrentMatchIndex(0);
    messageRefs.current.clear();
  }, [selectedConversationId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const highlightText = (text: string) => {
    if (!messageSearchQuery.trim()) return text;
    const regex = new RegExp(`(${messageSearchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-400/50 text-inherit rounded px-0.5">{part}</mark> : part
    );
  };

  return (
    <Card className="flex-1 flex flex-col glass-card border-border/50">
      <CardHeader className="pb-3 border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 shadow-lg">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                Assistente Técnico IA
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 animate-pulse text-[8px]">ELITE 10/10</Badge>
              </CardTitle>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-success" /> System Online</span>
                <span className="flex items-center gap-1">CPU: 4%</span>
                <span className="flex items-center gap-1">LAT: 12ms</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedConversationId && messages.length > 0 && (
                <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-primary transition-colors" onClick={() => setMessageSearchActive(true)}>
                  <Search className="h-4 w-4" />
                </Button>
            )}
            <div className="h-8 w-px bg-border/50 mx-1" />
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[9px] font-black text-muted-foreground">E{i}</div>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {!selectedConversationId ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="p-4 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10 w-fit mx-auto">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-medium text-foreground">Selecione ou crie uma conversa</h3>
                <p className="text-sm text-muted-foreground max-w-md">Use o painel lateral para criar uma nova conversa ou retomar uma conversa anterior.</p>
                <Button onClick={onNewConversation} disabled={isCreating}>
                  <Plus className="h-4 w-4 mr-2" />
                  Iniciar Nova Conversa
                </Button>
                <div className="flex justify-center gap-4 mt-8 opacity-50 grayscale hover:grayscale-0 transition-all">
                   <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border/50">
                        <Activity className="h-5 w-5" />
                      </div>
                      <span className="text-[9px] font-bold uppercase">ISO 9001</span>
                   </div>
                   <div className="flex flex-col items-center gap-1">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center border border-border/50">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <span className="text-[9px] font-bold uppercase">NIST Compliant</span>
                   </div>
                </div>
              </div>
            </div>
          ) : messages.length === 0 && !isLoadingMessages ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 max-w-3xl mx-auto py-12"
            >
              <div className="text-center space-y-4">
                <div className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-primary/10 to-purple-500/10 mb-2">
                  <Sparkles className="h-10 w-10 text-primary animate-pulse" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-foreground">O que vamos criar hoje?</h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Seu especialista técnico em gravação industrial, pronto para otimizar seus parâmetros e processos.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {suggestions.map((suggestion, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button 
                      variant="outline" 
                      className="w-full h-auto py-4 px-5 flex flex-col items-start gap-2 text-left hover:bg-primary/5 hover:border-primary/30 group transition-all rounded-2xl border-border/40" 
                      onClick={() => onSend(suggestion.question)}
                    >
                      <div className="p-2 rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                        <suggestion.icon className="h-5 w-5 text-primary" />
                      </div>
                      <span className="text-xs font-semibold">{suggestion.label}</span>
                      <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {suggestion.question}
                      </p>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-6 pb-4">
              <AnimatePresence initial={false}>
                {messages.map((message, index) => {
                  const isMatch = matchingMessageIndices.includes(index);
                  if (messageSearchQuery.trim() && !isMatch) return null;
                  
                  return (
                    <ChatMessage
                      key={message.id || index}
                      role={message.role}
                      content={message.content}
                      isStreaming={isStreaming && index === messages.length - 1 && message.role === "assistant"}
                      highlightText={highlightText}
                    />
                  );
                })}
              </AnimatePresence>
              
              {isStreaming && messages[messages.length - 1]?.role === "user" && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="bg-muted/50 px-4 py-3 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                      <span className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce"></span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </ScrollArea>

          <div className={cn(
            "p-4 border-t border-border/50 bg-background/50 backdrop-blur-sm transition-all duration-500",
            diagnosticMode && "bg-primary/5 ring-1 ring-primary/20"
          )}>
            <div className="flex flex-col gap-2 max-w-4xl mx-auto">
              <div className="flex gap-2 items-end">
                <div className="relative flex-1 group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                    <span className="text-[8px] font-black uppercase text-success/70 tracking-tighter">Secure Link</span>
                  </div>
                  <Textarea 
                    value={input} 
                    onChange={(e) => onInputChange(e.target.value)} 
                    onKeyDown={handleKeyDown} 
                    placeholder="Solicite diagnósticos, parâmetros ou análise de manuais..." 
                    className="min-h-[52px] max-h-40 resize-none pl-24 pr-24 py-3.5 rounded-2xl border-primary/20 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all bg-black/20 backdrop-blur-md text-sm font-medium" 
                    disabled={isStreaming} 
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                          title="Anexar documentação técnica"
                        >
                          <Paperclip className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80 p-0 border-primary/20 bg-black/90 backdrop-blur-2xl shadow-2xl" align="end" side="top">
                        <FileAnalyzer onFileProcessed={(file) => {
                          onInputChange(`${input} [DOCUMENTO TÉCNICO: ${file.name}]`);
                        }} />
                      </PopoverContent>
                    </Popover>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                      title="Entrada por Voz (Industrial Mode)"
                    >
                      <Mic className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button 
                  onClick={() => onSend()} 
                  disabled={isStreaming || !input.trim()} 
                  className="h-[52px] px-6 rounded-2xl shrink-0 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all active:scale-95 group overflow-hidden relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                  {isStreaming ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Executar</span>
                      <Send className="h-4 w-4" />
                    </div>
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-between px-3">
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <Keyboard className="h-3 w-3 text-muted-foreground/50" />
                    <span className="text-[9px] font-bold uppercase text-muted-foreground">
                      <kbd className="bg-muted px-1 rounded text-[8px]">ENT</kbd> Enviar
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-primary/50" />
                    <span className="text-[9px] font-bold uppercase text-primary/70">AI Optimizer On</span>
                  </div>
                  <div role="button" tabIndex={0} aria-label="Alternar modo diagnóstico" className="flex items-center gap-1.5 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded" onClick={() => setDiagnosticMode(!diagnosticMode)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDiagnosticMode(!diagnosticMode); } }}>
                    <Activity className={cn("h-3 w-3 transition-colors", diagnosticMode ? "text-primary animate-pulse" : "text-muted-foreground/50")} />
                    <span className={cn("text-[9px] font-black uppercase tracking-widest", diagnosticMode ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors")}>
                      {diagnosticMode ? "Diagnostic Active" : "Diagnostic Mode"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase tracking-tighter gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Copy className="h-3 w-3" /> Copiar Tudo
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 text-[9px] font-black uppercase tracking-tighter gap-1.5 text-muted-foreground hover:text-primary transition-colors">
                    <Download className="h-3 w-3" /> Gerar PDF Técnico
                  </Button>
                </div>
              </div>
            </div>
          </div>
      </CardContent>
    </Card>
  );
}
