import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { AlertTriangle, AlertCircle, Box, Check, CheckCircle, Layers, Palette, Ruler, Search, Settings, Sparkles, Star, User, X, Zap, Home, Menu, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, ExternalLink, Link, Plus, Minus, Edit, Trash2, Save, Download, Upload, Copy, Send, Share2, RefreshCw, RefreshCcw, RotateCw, RotateCcw, Users, Lock, Unlock, Key, Shield, ShieldCheck, Eye, EyeOff, Fingerprint, Bell, Mail, Phone, MessageSquare, Info, HelpCircle, XCircle, MinusCircle, PlusCircle, Trophy, Award, Flame, Coins, Target, Heart, ThumbsUp, ThumbsDown, Gift, FileText, Folder, FolderOpen, Camera, Video, Music, Volume2, VolumeX, Calendar, Clock, TrendingUp, Activity, BarChart, PieChart, LineChart, Gauge, Filter, Grid, List, TableIcon, LayoutGrid, Maximize, Minimize, ZoomIn, ZoomOut, Move, Grip, MoreHorizontal, MoreVertical, Scan, QrCode, Printer, Wifi, WifiOff, Cloud, Database, Server, Cpu, MousePointer2, Wand2, Package, Truck, Factory, Warehouse, Building, ShoppingCart, CreditCard, DollarSign, Percent, Tag, Bookmark, Flag, Sun, Moon, CloudRain, Thermometer, Droplet, Wind, Umbrella, Terminal, Code, GitBranch, Battery, BatteryCharging, Power, Loader2, MapPin, Compass, Globe, Crosshair, Github, Linkedin, Twitter, Facebook, Instagram, Youtube, Square, Circle, Play, Type, Clipboard as ClipboardIcon, FileIcon, ImageIcon, Map as MapIcon, Navigation as NavigationIcon, type LucideIcon } from 'lucide-react';

export function IconsSection() {
  const [searchTerm, setSearchTerm] = useState('');

  const iconCategories: { category: string; icons: { name: string; Icon: LucideIcon }[] }[] = [
    {
      category: 'Navegação',
      icons: [
        { name: 'Home', Icon: Home },
        { name: 'Menu', Icon: Menu },
        { name: 'ChevronUp', Icon: ChevronUp },
        { name: 'ChevronDown', Icon: ChevronDown },
        { name: 'ChevronLeft', Icon: ChevronLeft },
        { name: 'ChevronRight', Icon: ChevronRight },
        { name: 'ArrowUp', Icon: ArrowUp },
        { name: 'ArrowDown', Icon: ArrowDown },
        { name: 'ArrowLeft', Icon: ArrowLeft },
        { name: 'ArrowRight', Icon: ArrowRight },
        { name: 'ExternalLink', Icon: ExternalLink },
        { name: 'Link', Icon: Link },
      ],
    },
    {
      category: 'Ações',
      icons: [
        { name: 'Plus', Icon: Plus },
        { name: 'Minus', Icon: Minus },
        { name: 'Check', Icon: Check },
        { name: 'X', Icon: X },
        { name: 'Edit', Icon: Edit },
        { name: 'Trash2', Icon: Trash2 },
        { name: 'Save', Icon: Save },
        { name: 'Download', Icon: Download },
        { name: 'Upload', Icon: Upload },
        { name: 'Copy', Icon: Copy },
        { name: 'Clipboard', Icon: ClipboardIcon },
        { name: 'Send', Icon: Send },
        { name: 'Share2', Icon: Share2 },
        { name: 'RefreshCw', Icon: RefreshCw },
        { name: 'RefreshCcw', Icon: RefreshCcw },
        { name: 'RotateCw', Icon: RotateCw },
        { name: 'RotateCcw', Icon: RotateCcw },
      ],
    },
    {
      category: 'Usuário & Autenticação',
      icons: [
        { name: 'User', Icon: User },
        { name: 'Users', Icon: Users },
        { name: 'Lock', Icon: Lock },
        { name: 'Unlock', Icon: Unlock },
        { name: 'Key', Icon: Key },
        { name: 'Shield', Icon: Shield },
        { name: 'ShieldCheck', Icon: ShieldCheck },
        { name: 'Eye', Icon: Eye },
        { name: 'EyeOff', Icon: EyeOff },
        { name: 'Fingerprint', Icon: Fingerprint },
      ],
    },
    {
      category: 'Comunicação',
      icons: [
        { name: 'Bell', Icon: Bell },
        { name: 'Mail', Icon: Mail },
        { name: 'Phone', Icon: Phone },
        { name: 'MessageSquare', Icon: MessageSquare },
      ],
    },
    {
      category: 'Status & Alertas',
      icons: [
        { name: 'AlertTriangle', Icon: AlertTriangle },
        { name: 'AlertCircle', Icon: AlertCircle },
        { name: 'Info', Icon: Info },
        { name: 'HelpCircle', Icon: HelpCircle },
        { name: 'CheckCircle', Icon: CheckCircle },
        { name: 'XCircle', Icon: XCircle },
        { name: 'MinusCircle', Icon: MinusCircle },
        { name: 'PlusCircle', Icon: PlusCircle },
      ],
    },
    {
      category: 'Gamificação',
      icons: [
        { name: 'Trophy', Icon: Trophy },
        { name: 'Award', Icon: Award },
        { name: 'Star', Icon: Star },
        { name: 'Flame', Icon: Flame },
        { name: 'Sparkles', Icon: Sparkles },
        { name: 'Coins', Icon: Coins },
        { name: 'Target', Icon: Target },
        { name: 'Zap', Icon: Zap },
        { name: 'Heart', Icon: Heart },
        { name: 'ThumbsUp', Icon: ThumbsUp },
        { name: 'ThumbsDown', Icon: ThumbsDown },
        { name: 'Gift', Icon: Gift },
      ],
    },
    {
      category: 'Arquivos & Mídia',
      icons: [
        { name: 'File', Icon: FileIcon },
        { name: 'FileText', Icon: FileText },
        { name: 'Folder', Icon: Folder },
        { name: 'FolderOpen', Icon: FolderOpen },
        { name: 'Image', Icon: ImageIcon },
        { name: 'Camera', Icon: Camera },
        { name: 'Video', Icon: Video },
        { name: 'Music', Icon: Music },
        { name: 'Volume2', Icon: Volume2 },
        { name: 'VolumeX', Icon: VolumeX },
      ],
    },
    {
      category: 'Data & Tempo',
      icons: [
        { name: 'Calendar', Icon: Calendar },
        { name: 'Clock', Icon: Clock },
        { name: 'TrendingUp', Icon: TrendingUp },
        { name: 'Activity', Icon: Activity },
        { name: 'BarChart', Icon: BarChart },
        { name: 'PieChart', Icon: PieChart },
        { name: 'LineChart', Icon: LineChart },
        { name: 'Gauge', Icon: Gauge },
      ],
    },
    {
      category: 'Interface',
      icons: [
        { name: 'Settings', Icon: Settings },
        { name: 'Search', Icon: Search },
        { name: 'Filter', Icon: Filter },
        { name: 'Grid', Icon: Grid },
        { name: 'List', Icon: List },
        { name: 'Table', Icon: TableIcon },
        { name: 'LayoutGrid', Icon: LayoutGrid },
        { name: 'Maximize', Icon: Maximize },
        { name: 'Minimize', Icon: Minimize },
        { name: 'ZoomIn', Icon: ZoomIn },
        { name: 'ZoomOut', Icon: ZoomOut },
        { name: 'Move', Icon: Move },
        { name: 'Grip', Icon: Grip },
        { name: 'MoreHorizontal', Icon: MoreHorizontal },
        { name: 'MoreVertical', Icon: MoreVertical },
      ],
    },
    {
      category: 'Produção & Logística',
      icons: [
        { name: 'Package', Icon: Package },
        { name: 'Box', Icon: Box },
        { name: 'Truck', Icon: Truck },
        { name: 'Factory', Icon: Factory },
        { name: 'Warehouse', Icon: Warehouse },
        { name: 'Building', Icon: Building },
        { name: 'QrCode', Icon: QrCode },
        { name: 'Scan', Icon: Scan },
        { name: 'Printer', Icon: Printer },
      ],
    },
    {
      category: 'E-commerce',
      icons: [
        { name: 'ShoppingCart', Icon: ShoppingCart },
        { name: 'CreditCard', Icon: CreditCard },
        { name: 'DollarSign', Icon: DollarSign },
        { name: 'Percent', Icon: Percent },
        { name: 'Tag', Icon: Tag },
        { name: 'Bookmark', Icon: Bookmark },
        { name: 'Flag', Icon: Flag },
      ],
    },
    {
      category: 'Clima & Ambiente',
      icons: [
        { name: 'Sun', Icon: Sun },
        { name: 'Moon', Icon: Moon },
        { name: 'Cloud', Icon: Cloud },
        { name: 'CloudRain', Icon: CloudRain },
        { name: 'Thermometer', Icon: Thermometer },
        { name: 'Droplet', Icon: Droplet },
        { name: 'Wind', Icon: Wind },
        { name: 'Umbrella', Icon: Umbrella },
      ],
    },
    {
      category: 'Tecnologia',
      icons: [
        { name: 'Cpu', Icon: Cpu },
        { name: 'Database', Icon: Database },
        { name: 'Server', Icon: Server },
        { name: 'Terminal', Icon: Terminal },
        { name: 'Code', Icon: Code },
        { name: 'GitBranch', Icon: GitBranch },
        { name: 'Wifi', Icon: Wifi },
        { name: 'WifiOff', Icon: WifiOff },
        { name: 'Battery', Icon: Battery },
        { name: 'BatteryCharging', Icon: BatteryCharging },
        { name: 'Power', Icon: Power },
        { name: 'Loader2', Icon: Loader2 },
      ],
    },
    {
      category: 'Localização',
      icons: [
        { name: 'MapPin', Icon: MapPin },
        { name: 'Map', Icon: MapIcon },
        { name: 'Navigation', Icon: NavigationIcon },
        { name: 'Compass', Icon: Compass },
        { name: 'Globe', Icon: Globe },
        { name: 'Crosshair', Icon: Crosshair },
      ],
    },
    {
      category: 'Redes Sociais',
      icons: [
        { name: 'Github', Icon: Github },
        { name: 'Linkedin', Icon: Linkedin },
        { name: 'Twitter', Icon: Twitter },
        { name: 'Facebook', Icon: Facebook },
        { name: 'Instagram', Icon: Instagram },
        { name: 'Youtube', Icon: Youtube },
      ],
    },
    {
      category: 'Formas & Design',
      icons: [
        { name: 'Square', Icon: Square },
        { name: 'Circle', Icon: Circle },
        { name: 'Layers', Icon: Layers },
        { name: 'Palette', Icon: Palette },
        { name: 'Wand2', Icon: Wand2 },
        { name: 'MousePointer2', Icon: MousePointer2 },
        { name: 'Play', Icon: Play },
        { name: 'Type', Icon: Type },
        { name: 'Ruler', Icon: Ruler },
      ],
    },
  ];

  const allIcons = iconCategories.flatMap((cat) => cat.icons);

  const filteredCategories = searchTerm
    ? [
        {
          category: 'Resultados da Busca',
          icons: allIcons.filter((icon) =>
            icon.name.toLowerCase().includes(searchTerm.toLowerCase())
          ),
        },
      ]
    : iconCategories;

  const totalIcons = allIcons.length;

  return (
    <div className="space-y-6">
      {/* Search & Stats */}
      <Card className="card-interactive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Biblioteca de Ícones
          </CardTitle>
          <CardDescription>
            {totalIcons} ícones do Lucide React organizados por categoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar ícone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Badge variant="secondary" className="gap-1">
              <Box className="h-3 w-3" />
              {totalIcons} ícones
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Icon Categories */}
      {filteredCategories.map((category) => (
        category.icons.length > 0 && (
          <Card key={category.category} className="card-interactive">
            <CardHeader>
              <CardTitle className="text-lg">{category.category}</CardTitle>
              <CardDescription>{category.icons.length} ícones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
                {category.icons.map(({ name, Icon }) => (
                  <div
                    key={name}
                    className="group flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer"
                    title={name}
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center truncate w-full">
                      {name}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      ))}

      {/* Icon Sizes */}
      <Card className="card-interactive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ruler className="h-5 w-5 text-primary" />
            Tamanhos de Ícones
          </CardTitle>
          <CardDescription>Variações de tamanho padrão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-8">
            {[
              { size: 'h-3 w-3', label: '12px', desc: 'Extra Small' },
              { size: 'h-4 w-4', label: '16px', desc: 'Small' },
              { size: 'h-5 w-5', label: '20px', desc: 'Default' },
              { size: 'h-6 w-6', label: '24px', desc: 'Medium' },
              { size: 'h-8 w-8', label: '32px', desc: 'Large' },
              { size: 'h-10 w-10', label: '40px', desc: 'XL' },
              { size: 'h-12 w-12', label: '48px', desc: '2XL' },
              { size: 'h-16 w-16', label: '64px', desc: '3XL' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <Star className={`${item.size} text-primary`} />
                <span className="text-xs font-mono text-primary">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Icon Colors */}
      <Card className="card-interactive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Cores de Ícones
          </CardTitle>
          <CardDescription>Cores semânticas para ícones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {[
              { color: 'text-foreground', label: 'foreground' },
              { color: 'text-muted-foreground', label: 'muted' },
              { color: 'text-primary', label: 'primary' },
              { color: 'text-secondary', label: 'secondary' },
              { color: 'text-accent', label: 'accent' },
              { color: 'text-destructive', label: 'destructive' },
              { color: 'text-[hsl(var(--success))]', label: 'success' },
              { color: 'text-[hsl(var(--warning))]', label: 'warning' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                  <Star className={`h-6 w-6 ${item.color}`} />
                </div>
                <span className="text-xs font-mono text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Icon with Background */}
      <Card className="card-interactive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Ícones com Background
          </CardTitle>
          <CardDescription>Estilos de ícones com fundos coloridos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div className="w-12 h-12 rounded-lg gradient-secondary flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div className="w-12 h-12 rounded-lg gradient-success flex items-center justify-center">
              <Check className="h-6 w-6 text-white" />
            </div>
            <div className="w-12 h-12 rounded-lg bg-destructive flex items-center justify-center">
              <X className="h-6 w-6 text-white" />
            </div>
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              <Settings className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--success))] flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="w-12 h-12 rounded-full bg-[hsl(var(--warning))] flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
