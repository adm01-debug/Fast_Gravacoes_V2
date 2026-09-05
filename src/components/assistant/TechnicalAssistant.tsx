 
import { useState, useRef, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Send,
  User,
  Loader2,
  Sparkles,
  Zap,
  Printer,
  Sun,
  Flame,
  Scissors,
  X
} from "lucide-react";
import { toast } from "sonner";
import { showErrorToast } from "@/lib/errorHandling";
import { edgeFunctionFetch } from "@/lib/edgeFunctionFetch";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const techniqueSuggestions = [
  { label: "Fiber Laser", icon: Zap, question: "Quais são os parâmetros ideais para gravar aço inox com Fiber Laser?" },
  { label: "Serigrafia", icon: Printer, question: "Como preparar uma tela de serigrafia têxtil?" },
  { label: "Sublimação", icon: Sun, question: "Qual temperatura e tempo para sublimação em canecas?" },
  { label: "Hot Stamping", icon: Flame, question: "Como funciona o processo de hot stamping?" },
  { label: "DTF", icon: Sparkles, question: "Qual a diferença entre DTF têxtil e DTF UV?" },
  { label: "Corte", icon: Scissors, question: "Como ajustar a pressão da lâmina no plotter de recorte?" },
];

interface TechnicalAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TechnicalAssistant = ({ isOpen, onClose }: TechnicalAssistantProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessages: Message[]) => {
    const resp = await edgeFunctionFetch("technical-assistant", {
      method: "POST",
      body: JSON.stringify({ messages: userMessages }),
    });

    if (resp.status === 429) {
      throw new Error("Limite de requisições excedido. Aguarde um momento.");
    }
    if (resp.status === 402) {
      throw new Error("Créditos esgotados. Contate o administrador.");
    }
    if (!resp.ok || !resp.body) {
      throw new Error("Falha ao conectar com o assistente");
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    // Use an array accumulator to avoid mutating a `let` variable inside a
    // closure — the React Compiler requires local variables used in closures to
    // be treated as immutable values.
    const contentChunks: string[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);

        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            contentChunks.push(content);
            const assistantContent = contentChunks.join("");
            setMessages(prev => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { ...m, content: assistantContent } : m
                );
              }
              return [...prev, { role: "assistant", content: assistantContent }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMsg: Message = { role: "user", content: messageText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(updatedMessages);
    } catch (error) {
      showErrorToast(error instanceof Error ? error : new Error(String(error)), 'Erro ao processar mensagem');
      // Remove the failed assistant message if any
      setMessages(prev => {
        if (prev[prev.length - 1]?.role === "assistant" && !prev[prev.length - 1].content) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl h-[80vh] flex flex-col glass-card border-border/50">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              Assistente Técnico IA
              <Badge variant="secondary" className="ml-2">Beta</Badge>
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Tire dúvidas sobre técnicas de gravação, máquinas, insumos e processos
          </p>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="p-4 rounded-full bg-gradient-to-br from-primary/10 to-purple-500/10 w-fit mx-auto mb-4">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Como posso ajudar?
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Sou especialista em técnicas de gravação e personalização.
                    Pergunte sobre Fiber Laser, Serigrafia, Sublimação, DTF, Tampografia e muito mais!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {techniqueSuggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto py-3 px-4 justify-start text-left hover:bg-primary/5"
                      onClick={() => sendMessage(suggestion.question)}
                    >
                      <suggestion.icon className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-xs">{suggestion.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="p-2 rounded-lg bg-primary/20 h-fit">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-foreground"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                    {message.role === "user" && (
                      <div className="p-2 rounded-lg bg-muted h-fit">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex gap-3">
                    <div className="p-2 rounded-lg bg-primary/20 h-fit">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t border-border/50">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua dúvida técnica..."
                className="min-h-[44px] max-h-32 resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={isLoading || !input.trim()}
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
