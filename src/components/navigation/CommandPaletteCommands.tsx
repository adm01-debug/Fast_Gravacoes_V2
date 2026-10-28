import * as React from "react";
import {
  LayoutDashboard, Calendar, Kanban, BarChart3, Users, Settings, Clock, FileText,
  Zap, Shield, Factory, ScanLine, Bell, Gauge, TrendingUp, Sparkles,
  Moon, Sun, LogOut, Plus, RefreshCw, Download, Filter,
  ArrowRight, Keyboard, HelpCircle, Activity, Package, Layers, History
} from "lucide-react";

export type CommandCategory = "navigation" | "actions" | "settings" | "recent" | "contextual" | "jobs" | "search";

export interface CommandItemType {
  id: string;
  name: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category: CommandCategory;
  keywords?: string[];
  priority?: number;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
}

interface BuildCommandsArgs {
  navigateTo: (path: string, commandId: string) => void;
  executeAction: (commandId: string, action: () => void) => void;
  confirmIfDirty: (navigate: () => void) => void;
  theme: string | undefined;
  setTheme: (t: string) => void;
  signOut: () => void;
  setOpen: (open: boolean) => void;
}

export function buildAllCommands({
  navigateTo, executeAction, confirmIfDirty, theme, setTheme, signOut, setOpen
}: BuildCommandsArgs): CommandItemType[] {
  return [
    { id: "nav-dashboard", name: "Dashboard", description: "Visão geral do sistema", icon: <LayoutDashboard className="h-4 w-4" />, shortcut: "⌘D", action: () => navigateTo("/", "nav-dashboard"), category: "navigation", keywords: ["home", "início", "painel", "principal"], priority: 100 },
    { id: "nav-calendar-daily", name: "Calendário Diário", description: "Programação do dia", icon: <Calendar className="h-4 w-4" />, action: () => navigateTo("/calendar/daily", "nav-calendar-daily"), category: "navigation", keywords: ["agenda", "programação", "dia", "hoje"], priority: 90 },
    { id: "nav-calendar-weekly", name: "Calendário Semanal", description: "Programação da semana", icon: <Calendar className="h-4 w-4" />, action: () => navigateTo("/calendar/weekly", "nav-calendar-weekly"), category: "navigation", keywords: ["agenda", "semana", "semanal"], priority: 89 },
    { id: "nav-kanban", name: "Kanban Board", description: "Quadro de tarefas visual", icon: <Kanban className="h-4 w-4" />, action: () => navigateTo("/kanban", "nav-kanban"), category: "navigation", keywords: ["board", "tarefas", "cards", "visual"], priority: 95 },
    { id: "nav-kpis", name: "KPIs Dashboard", description: "Indicadores de performance", icon: <BarChart3 className="h-4 w-4" />, action: () => navigateTo("/kpis", "nav-kpis"), category: "navigation", keywords: ["métricas", "indicadores", "performance", "dados"], priority: 85 },
    { id: "nav-oee", name: "OEE Dashboard", description: "Overall Equipment Effectiveness", icon: <Gauge className="h-4 w-4" />, action: () => navigateTo("/oee", "nav-oee"), category: "navigation", keywords: ["eficiência", "máquinas", "equipamentos", "oee"], priority: 84 },
    { id: "nav-efficiency", name: "Eficiência Operacional", description: "Análise de eficiência", icon: <TrendingUp className="h-4 w-4" />, action: () => navigateTo("/efficiency", "nav-efficiency"), category: "navigation", keywords: ["produtividade", "análise", "rendimento"], priority: 83 },
    { id: "nav-operators", name: "Gestão de Operadores", description: "Equipe e produtividade", icon: <Users className="h-4 w-4" />, action: () => navigateTo("/operators", "nav-operators"), category: "navigation", keywords: ["equipe", "funcionários", "pessoas", "time"], priority: 80 },
    { id: "nav-machines", name: "Gestão de Máquinas", description: "Equipamentos e manutenção", icon: <Factory className="h-4 w-4" />, action: () => navigateTo("/machines", "nav-machines"), category: "navigation", keywords: ["equipamentos", "ativos", "manutenção"], priority: 79 },
    { id: "nav-queue", name: "Fila de Espera", description: "Jobs pendentes", icon: <Layers className="h-4 w-4" />, action: () => navigateTo("/pending", "nav-queue"), category: "navigation", keywords: ["pendentes", "aguardando", "buffer"], priority: 78 },
    { id: "nav-scanner", name: "Scanner QR Code", description: "Leitura de códigos", icon: <ScanLine className="h-4 w-4" />, action: () => navigateTo("/scanner", "nav-scanner"), category: "navigation", keywords: ["qrcode", "leitura", "código", "scan"], priority: 70 },
    { id: "nav-notifications", name: "Central de Notificações", description: "Alertas e avisos", icon: <Bell className="h-4 w-4" />, action: () => navigateTo("/notifications", "nav-notifications"), category: "navigation", keywords: ["alertas", "avisos", "mensagens"], priority: 75 },
    { id: "nav-gamification", name: "Gamificação", description: "Rankings e conquistas", icon: <Sparkles className="h-4 w-4" />, action: () => navigateTo("/gamification", "nav-gamification"), category: "navigation", keywords: ["pontos", "ranking", "conquistas", "xp"], priority: 65 },
    { id: "nav-documents", name: "Documentos Técnicos", description: "Gestão documental", icon: <FileText className="h-4 w-4" />, action: () => navigateTo("/documents", "nav-documents"), category: "navigation", keywords: ["arquivos", "pdfs", "manuais"], priority: 60 },
    { id: "nav-traceability", name: "Rastreabilidade", description: "Tracking de lotes", icon: <Package className="h-4 w-4" />, action: () => navigateTo("/traceability", "nav-traceability"), category: "navigation", keywords: ["lotes", "tracking", "histórico"], priority: 55 },
    { id: "nav-shift", name: "Passagem de Turno", description: "Handover entre turnos", icon: <RefreshCw className="h-4 w-4" />, action: () => navigateTo("/shift-handover", "nav-shift"), category: "navigation", keywords: ["turno", "handover", "passagem"], priority: 50 },
    { id: "nav-tpm", name: "TPM Dashboard", description: "Total Productive Maintenance", icon: <Clock className="h-4 w-4" />, action: () => navigateTo("/tpm", "nav-tpm"), category: "navigation", keywords: ["manutenção", "preventiva", "tpm"], priority: 45 },
    { id: "nav-spc", name: "SPC Dashboard", description: "Controle Estatístico", icon: <Activity className="h-4 w-4" />, action: () => navigateTo("/spc", "nav-spc"), category: "navigation", keywords: ["estatística", "controle", "qualidade"], priority: 44 },
    { id: "nav-bi", name: "Business Intelligence", description: "Análises avançadas", icon: <BarChart3 className="h-4 w-4" />, action: () => navigateTo("/bi", "nav-bi"), category: "navigation", keywords: ["bi", "analytics", "relatórios"], priority: 43 },
    { id: "nav-security", name: "Segurança", description: "Dashboard de segurança", icon: <Shield className="h-4 w-4" />, action: () => navigateTo("/security", "nav-security"), category: "navigation", keywords: ["auditoria", "logs", "acessos"], priority: 40 },
    { id: "nav-settings", name: "Configurações", description: "Configurações do sistema", icon: <Settings className="h-4 w-4" />, shortcut: "⌘,", action: () => navigateTo("/settings", "nav-settings"), category: "navigation", keywords: ["preferências", "opções", "config"], priority: 35 },
    { id: "action-new-job", name: "Criar Nova Ordem", description: "Nova ordem de produção", icon: <Plus className="h-4 w-4 text-success" />, shortcut: "⌘N", action: () => navigateTo("/new-job", "action-new-job"), category: "actions", keywords: ["criar", "adicionar", "ordem", "nova"], priority: 100, badge: "Ação", badgeVariant: "default" },
    { id: "action-refresh", name: "Atualizar Dados", description: "Recarregar informações", icon: <RefreshCw className="h-4 w-4 text-blue-400" />, shortcut: "⌘R", action: () => executeAction("action-refresh", () => { setOpen(false); confirmIfDirty(() => window.location.reload()); }), category: "actions", keywords: ["refresh", "reload", "atualizar"], priority: 90 },
    { id: "action-export", name: "Exportar Dados", description: "Download em Excel/CSV", icon: <Download className="h-4 w-4 text-primary" />, action: () => setOpen(false), category: "actions", keywords: ["download", "excel", "csv", "exportar"], priority: 80 },
    { id: "action-filter", name: "Abrir Filtros", description: "Filtrar visualização", icon: <Filter className="h-4 w-4" />, shortcut: "⌘F", action: () => setOpen(false), category: "actions", keywords: ["filtrar", "buscar", "pesquisar"], priority: 75 },
    { id: "settings-theme", name: theme === "dark" ? "Ativar Modo Claro" : "Ativar Modo Escuro", description: "Alternar tema do sistema", icon: theme === "dark" ? <Sun className="h-4 w-4 text-warning" /> : <Moon className="h-4 w-4 text-primary" />, shortcut: "⌘T", action: () => executeAction("settings-theme", () => { setTheme(theme === "dark" ? "light" : "dark"); setOpen(false); }), category: "settings", keywords: ["tema", "dark", "light", "escuro", "claro"], priority: 60 },
    { id: "settings-shortcuts", name: "Ver Atalhos de Teclado", description: "Lista de atalhos", icon: <Keyboard className="h-4 w-4" />, shortcut: "⌘/", action: () => setOpen(false), category: "settings", keywords: ["keyboard", "atalhos", "teclas"], priority: 55 },
    { id: "settings-help", name: "Central de Ajuda", description: "Documentação e suporte", icon: <HelpCircle className="h-4 w-4" />, action: () => navigateTo("/knowledge", "settings-help"), category: "settings", keywords: ["ajuda", "help", "suporte", "docs"], priority: 50 },
    { id: "settings-logout", name: "Sair do Sistema", description: "Encerrar sessão", icon: <LogOut className="h-4 w-4 text-destructive" />, action: () => executeAction("settings-logout", () => { setOpen(false); confirmIfDirty(() => signOut()); }), category: "settings", keywords: ["logout", "desconectar", "sair"], priority: 10 },
  ];
}

export function buildContextualCommands(pathname: string, setOpen: (o: boolean) => void): CommandItemType[] {
  const commands: CommandItemType[] = [];
  if (pathname === "/" || pathname.includes("dashboard")) {
    commands.push({ id: "ctx-customize-dashboard", name: "Personalizar Dashboard", description: "Reorganizar widgets", icon: <Layers className="h-4 w-4 text-accent-foreground" />, action: () => setOpen(false), category: "contextual", priority: 100 });
  }
  if (pathname.includes("kanban")) {
    commands.push(
      { id: "ctx-add-column", name: "Adicionar Coluna", description: "Nova coluna no Kanban", icon: <Plus className="h-4 w-4" />, action: () => setOpen(false), category: "contextual", priority: 100 },
      { id: "ctx-collapse-all", name: "Recolher Todas Colunas", icon: <Layers className="h-4 w-4" />, action: () => setOpen(false), category: "contextual", priority: 90 }
    );
  }
  if (pathname.includes("operators")) {
    commands.push({ id: "ctx-add-operator", name: "Adicionar Operador", description: "Novo operador", icon: <Plus className="h-4 w-4" />, action: () => setOpen(false), category: "contextual", priority: 100 });
  }
  return commands;
}

export function fuzzyMatch(pattern: string, str: string): { match: boolean; score: number } {
  if (!pattern) return { match: true, score: 0 };
  const patternLower = pattern.toLowerCase();
  const strLower = str.toLowerCase();
  if (strLower.includes(patternLower)) return { match: true, score: 100 - strLower.indexOf(patternLower) };
  let patternIdx = 0, score = 0, consecutiveMatches = 0;
  for (let i = 0; i < strLower.length && patternIdx < patternLower.length; i++) {
    if (strLower[i] === patternLower[patternIdx]) { patternIdx++; consecutiveMatches++; score += consecutiveMatches * 2; } else { consecutiveMatches = 0; }
  }
  const match = patternIdx === patternLower.length;
  return { match, score: match ? score : 0 };
}

export function searchCommands(commands: CommandItemType[], query: string): CommandItemType[] {
  if (!query) return commands;
  return commands
    .map(cmd => {
      const nameMatch = fuzzyMatch(query, cmd.name);
      const descMatch = cmd.description ? fuzzyMatch(query, cmd.description) : { match: false, score: 0 };
      const keywordMatches = (cmd.keywords || []).map(k => fuzzyMatch(query, k));
      const bestKeywordScore = Math.max(0, ...keywordMatches.map(m => m.score));
      const totalScore = Math.max(nameMatch.score * 2, descMatch.score, bestKeywordScore) + (cmd.priority || 0);
      const match = nameMatch.match || descMatch.match || keywordMatches.some(m => m.match);
      return { cmd, score: totalScore, match };
    })
    .filter(r => r.match)
    .sort((a, b) => b.score - a.score)
    .map(r => r.cmd);
}
