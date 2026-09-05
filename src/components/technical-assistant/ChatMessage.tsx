import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, ThumbsUp, ThumbsDown, Zap, ShieldCheck, Share2, FileJson, AlertTriangle } from "lucide-react";
import { SafetyAlert } from './SafetyAlert';
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { MermaidDiagram } from './TechnicalArtifacts';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
  highlightText?: (text: string) => React.ReactNode;
}

export const ChatMessage = React.memo(({ role, content, isStreaming, highlightText }: ChatMessageProps) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-4 w-full mb-6",
        role === "user" ? "flex-row-reverse" : "flex-row"
      )}
    >
      <motion.div 
        whileHover={{ scale: 1.05 }}
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-lg transition-all",
          role === "assistant" 
            ? "bg-gradient-to-br from-primary via-purple-600 to-blue-600 text-primary-foreground ring-2 ring-primary/20" 
            : "bg-muted text-muted-foreground border border-border/50"
        )}
      >
        {role === "assistant" ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
      </motion.div>
      
      <div className={cn(
        "relative flex flex-col gap-2 max-w-[85%]",
        role === "user" ? "items-end" : "items-start"
      )}>
        {role === "assistant" && (
          <div className="flex items-center gap-2 px-1 mb-1">
            <span className="text-[10px] font-bold tracking-wider text-primary uppercase">Elite Assistant</span>
            <ShieldCheck className="h-3 w-3 text-primary/60" />
          </div>
        )}

        <div className={cn(
          "px-5 py-4 rounded-2xl text-sm leading-relaxed border transition-all shadow-sm",
          role === "user" 
            ? "bg-primary text-primary-foreground rounded-tr-none border-primary/20" 
            : "bg-card border-border/50 text-card-foreground rounded-tl-none hover:border-primary/30"
        )}>
          {role === "assistant" ? (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeContent = String(children).replace(/\n$/, '');
                    if (!inline && match && match[1] === 'mermaid') {
                      return <MermaidDiagram chart={codeContent} />;
                    }
                    return <code className={className} {...props}>{children}</code>;
                  }
                }}
              >
                {content}
              </ReactMarkdown>
              {content.includes('800 mm/s') && (
                <div className="mt-4">
                  <SafetyAlert 
                    parameter="Velocidade" 
                    suggestedValue="800 mm/s" 
                    limit="500 mm/s"
                    onConfirm={() => toast.success("Bypass autorizado")}
                    onCancel={() => toast.info("Sugestão rejeitada")}
                  />
                </div>
              )}
            </div>
          ) : (
            <p className="whitespace-pre-wrap font-medium">
              {highlightText ? highlightText(content) : content}
            </p>
          )}
        </div>

        {role === "assistant" && !isStreaming && (
          <div className="flex items-center justify-between w-full mt-2 px-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/50 backdrop-blur-sm">
                <button onClick={handleCopy} className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground" title="Copiar resposta">
                  {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground" title="Compartilhar diagnóstico"><Share2 className="h-3.5 w-3.5" /></button>
                <div className="w-px h-3 bg-border/50 mx-0.5" />
                <button 
                  onClick={() => setFeedback('up')} 
                  className={cn("p-1.5 rounded-md hover:bg-muted transition-colors", feedback === 'up' ? "text-success bg-success/10" : "text-muted-foreground")}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button 
                  onClick={() => setFeedback('down')} 
                  className={cn("p-1.5 rounded-md hover:bg-muted transition-colors", feedback === 'down' ? "text-red-500 bg-red-500/10" : "text-muted-foreground")}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="h-7 text-[9px] font-black uppercase tracking-widest gap-1.5 bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 transition-all">
                <FileJson className="h-3 w-3" />
                Gerar JSON
              </Button>
              <Button size="sm" className="h-7 text-[9px] font-black uppercase tracking-widest gap-1.5 shadow-lg shadow-primary/10 transition-all hover:scale-105 active:scale-95">
                <Zap className="h-3 w-3" />
                Aplicar Parâmetros
              </Button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = "ChatMessage";