import type { AppRole } from './types/auth.types';

// ============================================================
// FONTE ÚNICA DE PERMISSÕES DO SISTEMA
// Centraliza o mapa estático de permissões por papel e o catálogo
// exibido no PermissionManager. O catálogo é DERIVADO do mapa real
// (união de todas as roles), então a tela nunca mostra vocabulário
// divergente do runtime. A mesma lista alimenta o seed
// supabase/migrations/20261122010000_seed_role_permissions.sql.
// ============================================================

export type Permission = {
  permission: string;
  resource: string;
  label: string;
  description: string;
};

export const ROLE_PERMISSIONS: Record<AppRole, readonly string[]> = {
  admin: [
    'admin:all',
    'jobs:read',
    'jobs:create',
    'jobs:update',
    'jobs:delete',
    'machines:read',
    'machines:create',
    'machines:update',
    'machines:delete',
    'operators:read',
    'operators:create',
    'operators:update',
    'operators:delete',
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'users:change_role',
    'reports:read',
    'reports:export',
    'settings:read',
    'settings:update',
    'maintenance:read',
    'maintenance:create',
    'maintenance:update',
    'maintenance:delete',
    'quality:read',
    'quality:create',
    'quality:update',
    'traceability:read',
    'traceability:create',
    'technical_sheets:read',
    'technical_sheets:create',
    'technical_sheets:update',
    'technical_sheets:delete',
    'technical_sheets:approve',
    'goals:read',
    'goals:create',
    'goals:update',
    'goals:delete',
    'gamification:read',
    'gamification:manage',
    'alerts:read',
    'alerts:resolve',
    'energy:read',
    'energy:manage',
    'spc:read',
    'spc:manage',
    'shifts:read',
    'shifts:manage',
    'bitrix:read',
    'bitrix:sync',
    'audit:read',
    'inventory:read',
    'inventory:transfer',
    'inventory:adjust',
    'inventory:delete',
  ],
  coordinator: [
    // Acesso completo exceto admin:all (papéis não escalam para 'all';
    // permissões são concedidas/revogadas pela tela de permissões).
    'jobs:read',
    'jobs:create',
    'jobs:update',
    'jobs:delete',
    'machines:read',
    'machines:create',
    'machines:update',
    'machines:delete',
    'operators:read',
    'operators:create',
    'operators:update',
    'operators:delete',
    'users:read',
    'users:create',
    'users:update',
    'users:delete',
    'users:change_role',
    'reports:read',
    'reports:export',
    'settings:read',
    'settings:update',
    'maintenance:read',
    'maintenance:create',
    'maintenance:update',
    'maintenance:delete',
    'quality:read',
    'quality:create',
    'quality:update',
    'traceability:read',
    'traceability:create',
    'technical_sheets:read',
    'technical_sheets:create',
    'technical_sheets:update',
    'technical_sheets:delete',
    'technical_sheets:approve',
    'goals:read',
    'goals:create',
    'goals:update',
    'goals:delete',
    'gamification:read',
    'gamification:manage',
    'alerts:read',
    'alerts:resolve',
    'energy:read',
    'energy:manage',
    'spc:read',
    'spc:manage',
    'shifts:read',
    'shifts:manage',
    'bitrix:read',
    'bitrix:sync',
    'audit:read',
    'inventory:read',
    'inventory:transfer',
    'inventory:adjust',
    'inventory:delete',
  ],
  manager: [
    'jobs:read',
    'jobs:create',
    'jobs:update',
    'machines:read',
    'machines:update',
    'operators:read',
    'users:read',
    'reports:read',
    'reports:export',
    'settings:read',
    'maintenance:read',
    'maintenance:create',
    'maintenance:update',
    'quality:read',
    'quality:create',
    'quality:update',
    'traceability:read',
    'traceability:create',
    'technical_sheets:read',
    'technical_sheets:update',
    'technical_sheets:approve',
    'goals:read',
    'goals:create',
    'goals:update',
    'gamification:read',
    'alerts:read',
    'alerts:resolve',
    'energy:read',
    'spc:read',
    'spc:manage',
    'shifts:read',
    'shifts:manage',
    'bitrix:read',
    'audit:read',
    'inventory:read',
    'inventory:transfer',
    'inventory:adjust',
  ],
  operator: [
    'jobs:read',
    'jobs:update',
    'machines:read',
    'quality:read',
    'quality:create',
    'traceability:read',
    'technical_sheets:read',
    'gamification:read',
    'alerts:read',
    'shifts:read',
    'maintenance:read',
    'inventory:read',
  ],
};

export const RESOURCE_LABELS: Record<string, string> = {
  'admin': 'Administração',
  'alerts': 'Alertas',
  'audit': 'Auditoria',
  'bitrix': 'Bitrix',
  'energy': 'Energia',
  'gamification': 'Gamificação',
  'goals': 'Metas',
  'inventory': 'Inventário',
  'jobs': 'Agendamentos',
  'machines': 'Máquinas',
  'maintenance': 'Manutenção',
  'operators': 'Operadores',
  'quality': 'Qualidade',
  'reports': 'Relatórios',
  'settings': 'Configurações',
  'shifts': 'Turnos',
  'spc': 'Controle Estatístico (CEP)',
  'technical_sheets': 'Fichas Técnicas',
  'traceability': 'Rastreabilidade',
  'users': 'Usuários',
};

const ACTION_LABELS: Record<string, string> = {
  read: 'Visualizar', create: 'Criar', update: 'Editar', delete: 'Excluir',
  manage: 'Gerenciar', resolve: 'Resolver', sync: 'Sincronizar',
  approve: 'Aprovar', adjust: 'Ajustar', transfer: 'Transferir',
  export: 'Exportar', change_role: 'Alterar Papel', all: 'Acesso Total',
};

const ACTION_DESCRIPTIONS: Record<string, string> = {
  read: 'Permite visualizar informações',
  create: 'Permite criar novos registros',
  update: 'Permite editar registros existentes',
  delete: 'Permite excluir registros',
  manage: 'Permite gerenciar completamente este módulo',
  resolve: 'Permite resolver pendências e alertas',
  sync: 'Permite sincronizar dados externos',
  approve: 'Permite aprovar registros',
  adjust: 'Permite ajustar os níveis de estoque',
  transfer: 'Permite transferir itens entre estoques',
  export: 'Permite exportar dados',
  change_role: 'Permite alterar o papel de usuários',
  all: 'Permite acesso total a este módulo',
};

// Catálogo derivado: união de todas as permissões do mapa, em ordem
// estável, com label/description gerados dos mapas acima. Nada é
// hard-coded separadamente — o catálogo reflete o runtime sempre.
const ALL_PERMISSIONS = Array.from(
  new Set(Object.values(ROLE_PERMISSIONS).flat() as string[])
);

export const AVAILABLE_PERMISSIONS: Permission[] = ALL_PERMISSIONS.map((permission) => {
  const [resource, action] = permission.split(':') as [string, string];
  const resourceLabel = RESOURCE_LABELS[resource] || resource;
  const actionLabel = ACTION_LABELS[action] || action;
  const description = ACTION_DESCRIPTIONS[action] || ('Permite ' + actionLabel.toLowerCase());
  return {
    permission,
    resource,
    label: resourceLabel + ' — ' + actionLabel,
    description,
  };
});

