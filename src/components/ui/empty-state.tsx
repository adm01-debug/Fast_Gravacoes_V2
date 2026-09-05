import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import {
  FileQuestion,
  Search,
  Inbox,
  FolderOpen,
  Users,
  Calendar,
  AlertCircle,
  Plus,
  Package,
  Wrench,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  Settings,
  ShieldAlert,
  Zap,
} from "lucide-react";

type EmptyStateVariant =
  | "default"
  | "search"
  | "no-data"
  | "no-results"
  | "no-access"
  | "empty-folder"
  | "no-users"
  | "no-events"
  | "error"
  | "success"
  | "maintenance"
  | "analytics"
  | "notifications"
  | "settings"
  | "security"
  | "performance";

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: "sm" | "md" | "lg";
  illustration?: boolean;
}

// SVG Illustrations for empty states
const Illustrations = {
  noData: (
    <svg viewBox="0 0 200 150" className="w-full h-full" fill="none">
      <motion.circle
        cx="100"
        cy="75"
        r="60"
        className="fill-muted/30"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      />
      <motion.path
        d="M70 60 L130 60 L130 110 L70 110 Z"
        className="fill-muted stroke-muted-foreground/30"
        strokeWidth="2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      />
      <motion.path
        d="M80 75 L120 75"
        className="stroke-muted-foreground/40"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      />
      <motion.path
        d="M80 85 L110 85"
        className="stroke-muted-foreground/40"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      />
      <motion.path
        d="M80 95 L100 95"
        className="stroke-muted-foreground/40"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 200 150" className="w-full h-full" fill="none">
      <motion.circle
        cx="90"
        cy="70"
        r="35"
        className="stroke-muted-foreground/30"
        strokeWidth="4"
        fill="none"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, type: "spring" }}
      />
      <motion.line
        x1="115"
        y1="95"
        x2="145"
        y2="125"
        className="stroke-muted-foreground/40"
        strokeWidth="6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
      />
      <motion.text
        x="90"
        y="75"
        textAnchor="middle"
        className="fill-muted-foreground/30 text-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        ?
      </motion.text>
    </svg>
  ),
  success: (
    <svg viewBox="0 0 200 150" className="w-full h-full" fill="none">
      <motion.circle
        cx="100"
        cy="75"
        r="50"
        className="fill-success/10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      />
      <motion.circle
        cx="100"
        cy="75"
        r="35"
        className="fill-success/20"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, type: "spring" }}
      />
      <motion.path
        d="M80 75 L95 90 L125 60"
        className="stroke-success"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 200 150" className="w-full h-full" fill="none">
      <motion.circle
        cx="100"
        cy="75"
        r="50"
        className="fill-destructive/10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.5, type: "spring" }}
      />
      <motion.path
        d="M80 55 L120 95"
        className="stroke-destructive"
        strokeWidth="6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      />
      <motion.path
        d="M120 55 L80 95"
        className="stroke-destructive"
        strokeWidth="6"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
      />
    </svg>
  ),
};

const variantConfig: Record<
  EmptyStateVariant,
  { icon: React.ReactNode; title: string; description: string; illustration?: keyof typeof Illustrations }
> = {
  default: {
    icon: <Inbox className="h-12 w-12" />,
    title: "Nada aqui ainda",
    description: "Comece adicionando seu primeiro item.",
    illustration: "noData",
  },
  search: {
    icon: <Search className="h-12 w-12" />,
    title: "Nenhum resultado encontrado",
    description: "Tente ajustar os filtros ou termos de busca.",
    illustration: "search",
  },
  "no-data": {
    icon: <FileQuestion className="h-12 w-12" />,
    title: "Sem dados disponíveis",
    description: "Os dados aparecerão aqui quando estiverem disponíveis.",
    illustration: "noData",
  },
  "no-results": {
    icon: <Search className="h-12 w-12" />,
    title: "Sem resultados",
    description: "Não encontramos nada com os critérios atuais.",
    illustration: "search",
  },
  "no-access": {
    icon: <ShieldAlert className="h-12 w-12" />,
    title: "Acesso restrito",
    description: "Você não tem permissão para visualizar este conteúdo.",
  },
  "empty-folder": {
    icon: <FolderOpen className="h-12 w-12" />,
    title: "Pasta vazia",
    description: "Esta pasta não contém arquivos.",
    illustration: "noData",
  },
  "no-users": {
    icon: <Users className="h-12 w-12" />,
    title: "Nenhum usuário",
    description: "Adicione usuários para começar.",
  },
  "no-events": {
    icon: <Calendar className="h-12 w-12" />,
    title: "Sem eventos",
    description: "Não há eventos programados para este período.",
  },
  error: {
    icon: <AlertCircle className="h-12 w-12" />,
    title: "Algo deu errado",
    description: "Ocorreu um erro ao carregar os dados. Tente novamente.",
    illustration: "error",
  },
  success: {
    icon: <CheckCircle2 className="h-12 w-12" />,
    title: "Tudo certo!",
    description: "A operação foi concluída com sucesso.",
    illustration: "success",
  },
  maintenance: {
    icon: <Wrench className="h-12 w-12" />,
    title: "Nenhuma manutenção",
    description: "Não há manutenções programadas ou pendentes.",
  },
  analytics: {
    icon: <BarChart3 className="h-12 w-12" />,
    title: "Dados insuficientes",
    description: "Aguarde mais dados para visualizar os relatórios.",
  },
  notifications: {
    icon: <Bell className="h-12 w-12" />,
    title: "Tudo em dia!",
    description: "Você não tem notificações pendentes.",
  },
  settings: {
    icon: <Settings className="h-12 w-12" />,
    title: "Nenhuma configuração",
    description: "Configure as preferências do sistema.",
  },
  security: {
    icon: <ShieldAlert className="h-12 w-12" />,
    title: "Sem alertas",
    description: "Nenhum problema de segurança detectado.",
  },
  performance: {
    icon: <Zap className="h-12 w-12" />,
    title: "Sem dados de performance",
    description: "Os dados de performance aparecerão aqui.",
  },
};

const sizeClasses = {
  sm: {
    container: "py-8",
    icon: "h-10 w-10",
    title: "text-base",
    description: "text-sm",
  },
  md: {
    container: "py-12",
    icon: "h-12 w-12",
    title: "text-lg",
    description: "text-sm",
  },
  lg: {
    container: "py-16",
    icon: "h-16 w-16",
    title: "text-xl",
    description: "text-base",
  },
};

export function EmptyState({
  variant = "default",
  title,
  description,
  icon,
  action,
  secondaryAction,
  className,
  size = "md",
  illustration = true,
}: EmptyStateProps) {
  const config = variantConfig[variant];
  const sizes = sizeClasses[size];
  const illustrationKey = config.illustration;

  const displayTitle = title || config.title;
  const displayDescription = description || config.description;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        sizes.container,
        className
      )}
    >
      {/* SVG Illustration or Icon */}
      {illustration && illustrationKey && Illustrations[illustrationKey] ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 15 }}
          className={cn(
            "mb-4",
            size === "sm" ? "w-24 h-18" : size === "lg" ? "w-40 h-30" : "w-32 h-24"
          )}
        >
          {Illustrations[illustrationKey]}
        </motion.div>
      ) : (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", damping: 15 }}
          className="mb-4 rounded-2xl bg-muted/50 border border-border/50 p-4"
        >
          {icon ? (
            React.cloneElement(icon as React.ReactElement, {
              className: cn(sizes.icon, "text-muted-foreground/60"),
            })
          ) : (
            React.cloneElement(config.icon as React.ReactElement, {
              className: cn(sizes.icon, "text-muted-foreground/60"),
            })
          )}
        </motion.div>
      )}

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className={cn("text-title font-semibold text-foreground mb-1.5", sizes.title)}
      >
        {displayTitle}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className={cn("text-muted-foreground max-w-md", sizes.description)}
      >
        {displayDescription}
      </motion.p>

      {(action || secondaryAction) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex flex-wrap items-center gap-3"
        >
          {action && (
            <Button onClick={action.onClick} className="gap-2">
              {action.icon || <Plus className="h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outline" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

// Preset empty states for common use cases
export const EmptyStates = {
  NoJobs: () => {
    const navigate = useNavigate();
    return (
      <EmptyState
        variant="no-data"
        title="Nenhuma ordem de produção"
        description="Crie sua primeira ordem de produção para começar."
        action={{ label: "Nova Ordem", onClick: () => navigate("/new-job") }}
      />
    );
  },

  NoOperators: () => {
    const navigate = useNavigate();
    return (
      <EmptyState
        variant="no-users"
        title="Nenhum operador cadastrado"
        description="Adicione operadores para gerenciar sua equipe."
        action={{ label: "Adicionar Operador", onClick: () => navigate("/operators") }}
      />
    );
  },

  NoSearchResults: ({ query }: { query: string }) => (
    <EmptyState
      variant="search"
      title="Nenhum resultado encontrado"
      description={`Não encontramos resultados para "${query}". Tente outros termos.`}
    />
  ),

  NoNotifications: () => (
    <EmptyState
      variant="default"
      icon={<Inbox className="h-12 w-12" />}
      title="Tudo em dia!"
      description="Você não tem notificações pendentes."
    />
  ),

  NoMachines: () => {
    const navigate = useNavigate();
    return (
      <EmptyState
        variant="no-data"
        title="Nenhuma máquina cadastrada"
        description="Cadastre suas máquinas para gerenciar a produção."
        action={{ label: "Adicionar Máquina", onClick: () => navigate("/machines") }}
      />
    );
  },
};
