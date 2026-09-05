import { useState, useEffect, useMemo } from 'react';
import { useInventory } from '@/features/inventory';
import { useOperatorDashboardData } from '@/features/production';
import { Package, Printer, FileText, Hash } from 'lucide-react';
import { CommandItemType } from './CommandPaletteCommands';
import { useNavigate } from 'react-router-dom';

export function useCommandEntities(query: string, setOpen: (open: boolean) => void) {
  const { items: inventoryItems } = useInventory();
  const { machines, jobs } = useOperatorDashboardData();
  const navigate = useNavigate();

  const entityResults = useMemo(() => {
    if (query.length < 2 && query.length !== 0) return [];

    const results: CommandItemType[] = [];
    const lowerQuery = query.toLowerCase();

    // If query is empty, suggest active things
    if (query.length === 0) {
      machines.filter(m => m.is_active).slice(0, 2).forEach(machine => {
        results.push({
          id: `suggested-mach-${machine.id}`,
          name: machine.name,
          description: "Máquina Ativa",
          icon: <Printer className="h-4 w-4 text-blue-500" />,
          action: () => { navigate('/machines'); setOpen(false); },
          category: 'search',
          priority: 50
        });
      });
      return results;
    }

    // Search Inventory
    inventoryItems.filter(item => 
      item.name.toLowerCase().includes(lowerQuery) || 
      item.category.toLowerCase().includes(lowerQuery)
    ).slice(0, 2).forEach(item => {
      results.push({
        id: `entity-inv-${item.id}`,
        name: item.name,
        description: `Material: ${item.current_stock} ${item.unit} | ${item.category}`,
        icon: <Package className="h-4 w-4 text-warning" />,
        action: () => {
          navigate('/inventory');
          setOpen(false);
        },
        category: 'search',
        priority: 50
      });
    });

    // Search Machines
    machines.filter(m => 
      m.name.toLowerCase().includes(lowerQuery) || 
      m.code.toLowerCase().includes(lowerQuery)
    ).slice(0, 2).forEach(machine => {
      results.push({
        id: `entity-mach-${machine.id}`,
        name: machine.name,
        description: `Máquina: ${machine.code} | ${machine.is_active ? 'Ativa' : 'Inativa'}`,
        icon: <Printer className="h-4 w-4 text-blue-500" />,
        action: () => {
          navigate('/machines');
          setOpen(false);
        },
        category: 'search',
        priority: 50
      });
    });

    // Search Jobs (OPs)
    jobs.filter(j => 
      j.order_number?.toLowerCase().includes(lowerQuery) || 
      j.client?.toLowerCase().includes(lowerQuery)
    ).slice(0, 3).forEach(job => {
      results.push({
        id: `entity-job-${job.id}`,
        name: `OP ${job.order_number || job.id.slice(0, 8)}`,
        description: `Cliente: ${job.client || 'N/A'} | Status: ${job.status}`,
        icon: <Hash className="h-4 w-4 text-success" />,
        action: () => {
          navigate('/kanban');
          setOpen(false);
        },
        category: 'search',
        priority: 60
      });
    });

    return results;
  }, [query, inventoryItems, machines, jobs, navigate, setOpen]);

  return entityResults;
}
