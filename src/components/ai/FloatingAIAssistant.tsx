import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sparkles,
  Send,
  X,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Loader2,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const defaultSuggestions = [
  { id: "1", text: "Como posso melhorar a eficiência?", icon: <Lightbulb className="h-4 w-4 mr-2" /> },
  { id: "2", text: "Mostre relatórios de produção", icon: <Lightbulb className="h-4 w-4 mr-2" /> },
  { id: "3", text: "Quais jobs estão atrasados?", icon: <Lightbulb className="h-4 w-4 mr-2" /> },
];

export function FloatingAIAssistant() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isMinimized, setIsMinimized] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  React.useEffect(() => {
    if (isOpen && !isMinimized) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMinimized]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Entendi sua solicitação! Estou analisando os dados...",
        "Baseado nos dados de produção, posso sugerir algumas melhorias.",
        "Os indicadores mostram uma tendência positiva nas últimas semanas.",
        "Posso ajudar você a explorar os dashboards para mais detalhes.",
      ];

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-response`,
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="lg"
              onClick={() => setIsOpen(true)}
              aria-label="Abrir assistente IA"
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-gradient-to-br from-primary to-primary/80"
            >
              <Sparkles className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat widget */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-48px)]",
              isMinimized && "w-auto"
            )}
          >
            <Card className="shadow-2xl border-primary/20 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  <CardTitle className="text-sm font-medium">Assistente IA</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                    onClick={() => setIsMinimized(!isMinimized)}
                    aria-label={isMinimized ? 'Expandir chat' : 'Minimizar chat'}
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
                    onClick={() => setIsOpen(false)}
                    aria-label="Fechar assistente"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              <AnimatePresence>
                {!isMinimized && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ScrollArea ref={scrollRef} className="h-80">
                      <CardContent className="p-4 space-y-4">
                        {messages.length === 0 ? (
                          <div className="text-center py-8">
                            <Sparkles className="h-12 w-12 mx-auto text-primary/30 mb-3" />
                            <p className="text-sm text-muted-foreground">
                              Olá! Como posso ajudar você hoje?
                            </p>
                            <div className="mt-4 space-y-2">
                              {defaultSuggestions.map((suggestion) => (
                                <Button
                                  key={suggestion.id}
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-start text-left h-auto py-2"
                                  onClick={() => handleSuggestionClick(suggestion.text)}
                                >
                                  {suggestion.icon}
                                  <span className="truncate">{suggestion.text}</span>
                                </Button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          messages.map((message) => (
                            <motion.div
                              key={message.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={cn(
                                "flex gap-2",
                                message.role === "user" ? "flex-row-reverse" : ""
                              )}
                            >
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className={message.role === "assistant" ? "bg-primary text-primary-foreground" : ""}>
                                  {message.role === "assistant" ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                                </AvatarFallback>
                              </Avatar>
                              <div className={cn("flex-1", message.role === "user" ? "text-right" : "")}>
                                <div
                                  className={cn(
                                    "inline-block p-3 rounded-lg text-sm max-w-[85%]",
                                    message.role === "assistant" ? "bg-muted" : "bg-primary text-primary-foreground"
                                  )}
                                >
                                  {message.content}
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}

                        {isLoading && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                <Bot className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm text-muted-foreground">Pensando...</span>
                            </div>
                          </motion.div>
                        )}
                      </CardContent>
                    </ScrollArea>

                    <CardFooter className="p-3 border-t">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSend();
                        }}
                        className="flex gap-2 w-full"
                      >
                        <Input
                          ref={inputRef}
                          value={input}
                          onChange={(e) => setInput(e.target.value)}
                          placeholder="Pergunte algo..."
                          disabled={isLoading}
                          className="flex-1"
                        />
                        <Button type="submit" size="icon" disabled={!input.trim() || isLoading}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </form>
                    </CardFooter>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
