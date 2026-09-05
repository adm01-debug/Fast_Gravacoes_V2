import {
  Calendar, CalendarDays, CalendarRange, LayoutGrid, List, AlertTriangle, Settings, Users, Home,
  BarChart3, Gauge, Coins, Wrench, Brain, Code2, Zap, Bot, QrCode, RefreshCw,
  BookOpen, Palette, Download, Bell, ArrowRightLeft, Package, Activity, FileDown,
  Trophy, BatteryCharging, FileText, Cog, TrendingUp, Cpu, UserCircle, ShieldCheck,
  Factory, PackageCheck
} from 'lucide-react';
import { NavGroup } from './NavGroupComponent';
import { NavItem } from './NavButton';
import { type AppRole } from '@/features/auth';

// Define common role sets
const ALL_ROLES: AppRole[] = ['coordinator', 'manager', 'operator', 'admin'];
const STAFF_ONLY: AppRole[] = ['coordinator', 'manager', 'admin'];
const COORD_ONLY: AppRole[] = ['coordinator', 'admin'];

export const navGroups: NavGroup[] = [
  { 
    id: 'home', 
    icon: Home, 
    label: 'Principal', 
    items: [
      { icon: Home, label: 'Dashboard', href: '/', allowedRoles: ALL_ROLES }
    ], 
    defaultOpen: true 
  },
  { 
    id: 'planning', 
    icon: Calendar, 
    label: 'Planejamento', 
    items: [
      { icon: Calendar, label: 'Calendário Diário', href: '/calendar/daily', allowedRoles: STAFF_ONLY },
      { icon: CalendarDays, label: 'Calendário Semanal', href: '/calendar/weekly', allowedRoles: STAFF_ONLY },
      { icon: CalendarRange, label: 'Calendário Mensal', href: '/calendar/monthly', allowedRoles: STAFF_ONLY },
      { icon: LayoutGrid, label: 'Kanban', href: '/kanban', allowedRoles: ALL_ROLES },
      { icon: List, label: 'Pendências', href: '/pending', allowedRoles: COORD_ONLY },
    ]
  },
  { 
    id: 'analytics', 
    icon: BarChart3, 
    label: 'Analytics', 
    items: [
      { icon: BarChart3, label: 'BI Executivo', href: '/bi', allowedRoles: STAFF_ONLY },
      { icon: Factory, label: 'Produção 10/10', href: '/executive', allowedRoles: STAFF_ONLY },
      { icon: FileText, label: 'Construtor de Relatórios', href: '/report-builder', allowedRoles: STAFF_ONLY },
      { icon: TrendingUp, label: 'KPIs e Ocupação', href: '/kpis', allowedRoles: STAFF_ONLY },
      { icon: Gauge, label: 'OEE', href: '/oee', allowedRoles: STAFF_ONLY },
      { icon: Zap, label: 'Eficiência', href: '/efficiency', allowedRoles: STAFF_ONLY },
      { icon: Activity, label: 'SPC Qualidade', href: '/spc', allowedRoles: STAFF_ONLY },
      { icon: Coins, label: 'Custeio ABC', href: '/abc', allowedRoles: STAFF_ONLY },
    ]
  },
  { 
    id: 'operations', 
    icon: Wrench, 
    label: 'Operações', 
    items: [
      { icon: Wrench, label: 'TPM', href: '/tpm', allowedRoles: STAFF_ONLY },
      { icon: Cpu, label: 'Máquinas', href: '/machines', allowedRoles: STAFF_ONLY },
      { icon: ArrowRightLeft, label: 'Comparativo Máquinas', href: '/machines/compare', allowedRoles: STAFF_ONLY },
      { icon: BatteryCharging, label: 'Energia', href: '/energy', allowedRoles: STAFF_ONLY },
      { icon: PackageCheck, label: 'Manuseio e Embalagem', href: '/packaging', allowedRoles: ALL_ROLES },
      { icon: Package, label: 'Estoque', href: '/inventory', allowedRoles: STAFF_ONLY },
      { icon: Package, label: 'Rastreabilidade', href: '/traceability', allowedRoles: STAFF_ONLY },
    ]
  },
  { 
    id: 'team', 
    icon: Users, 
    label: 'Equipe', 
    items: [
      { icon: Users, label: 'Operadores', href: '/operators', allowedRoles: STAFF_ONLY },
      { icon: TrendingUp, label: 'Produtividade', href: '/operators/productivity', allowedRoles: STAFF_ONLY },
      { icon: Activity, label: 'Histórico de Ações', href: '/operator-history', allowedRoles: STAFF_ONLY },
      { icon: Trophy, label: 'Gamificação', href: '/gamification', allowedRoles: ALL_ROLES },
      { icon: ArrowRightLeft, label: 'Passagem de Turno', href: '/shift-handover', allowedRoles: ALL_ROLES },
      { icon: UserCircle, label: 'Visão Operador', href: '/operator', allowedRoles: ALL_ROLES },
    ]
  },
  { 
    id: 'intelligence', 
    icon: Brain, 
    label: 'Inteligência', 
    items: [
      { icon: Brain, label: 'ML Preditivo', href: '/ml-predictions', allowedRoles: STAFF_ONLY },
      { icon: Cpu, label: 'Digital Twin', href: '/digital-twin', allowedRoles: STAFF_ONLY },
      { icon: Bot, label: 'Assistente IA', href: '/assistant', allowedRoles: ALL_ROLES },
      { icon: BookOpen, label: 'Base de Conhecimento', href: '/knowledge', allowedRoles: ALL_ROLES },
      { icon: FileText, label: 'Documentos', href: '/documents', allowedRoles: STAFF_ONLY },
    ]
  },
  { 
    id: 'system', 
    icon: Cog, 
    label: 'Sistema', 
    items: [
      { icon: AlertTriangle, label: 'Alertas', href: '/alerts', allowedRoles: ALL_ROLES },
      { icon: Bell, label: 'Notificações', href: '/notifications', allowedRoles: ALL_ROLES },
      { icon: ShieldCheck, label: 'Audit Trail', href: '/audit', allowedRoles: STAFF_ONLY },
      { icon: QrCode, label: 'Scanner QR', href: '/scanner', allowedRoles: ALL_ROLES },
      { icon: Code2, label: 'Master API Hub', href: '/master-api', allowedRoles: STAFF_ONLY },
      { icon: Settings, label: 'Configurações', href: '/settings', allowedRoles: STAFF_ONLY },
    ]
  },
];

export const adminNavItems: NavItem[] = [
  { icon: Code2, label: 'Qualidade de Código', href: '/code-quality', allowedRoles: STAFF_ONLY },
  { icon: Activity, label: 'Telemetria e Performance', href: '/admin/telemetria', allowedRoles: STAFF_ONLY },
  { icon: RefreshCw, label: 'Bitrix24', href: '/integrations/bitrix24', allowedRoles: COORD_ONLY },
  { icon: Palette, label: 'Design System', href: '/design-system', allowedRoles: ALL_ROLES },
  { icon: Download, label: 'Instalar App', href: '/install', allowedRoles: ALL_ROLES },
];
