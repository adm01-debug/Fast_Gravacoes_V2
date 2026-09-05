import { sanitizeCsvCell } from '@/lib/csvSafety';

// RFC-4180 quoted field: sanitize for formula injection first, then double
// any embedded quotes and wrap. The previous `"${value}"` interpolation
// never escaped embedded `"` characters, so a value containing one (e.g. a
// reason/item name with a quote) corrupted the row's column boundaries.
function csvField(value: string): string {
  return `"${sanitizeCsvCell(value).replace(/"/g, '""')}"`;
}

export interface InventoryMovementExportRow {
  id: string;
  created_at: string | null;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUST' | string;
  quantity: number;
  from_location?: string | null;
  to_location?: string | null;
  reason?: string | null;
  inventory_items?: { name?: string | null } | null;
  profiles?: { display_name?: string | null; full_name?: string | null } | null;
}

export function exportInventoryMovementsToCSV(movements: InventoryMovementExportRow[]) {
  if (!movements || movements.length === 0) return;

  const headers = [
    'ID',
    'Data/Hora',
    'Item',
    'Tipo',
    'Quantidade',
    'Usuário',
    'Origem',
    'Destino',
    'Motivo'
  ];

  const csvContent = [
    headers.join(','),
    ...movements.map(m => {
      const date = m.created_at ? new Date(m.created_at).toLocaleString('pt-BR') : '';
      const itemName = m.inventory_items?.name || 'N/A';
      const userName = m.profiles?.display_name || m.profiles?.full_name || 'N/A';
      const type = m.type === 'IN' ? 'Entrada' :
                   m.type === 'OUT' ? 'Saída' :
                   m.type === 'TRANSFER' ? 'Transferência' : 'Ajuste';

      return [
        m.id,
        csvField(date),
        csvField(itemName),
        type,
        m.quantity,
        csvField(userName),
        csvField(m.from_location || ''),
        csvField(m.to_location || ''),
        csvField(m.reason || '')
      ].join(',');
    })
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `historico_movimentacoes_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
