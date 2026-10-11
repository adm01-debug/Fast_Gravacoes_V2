import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: 'Alt + ←', action: 'Voltar para a página anterior' },
  { keys: 'Alt + B', action: 'Voltar para a página anterior' },
  { keys: 'Alt + H', action: 'Ir para o início' },
  { keys: 'Alt + N', action: 'Abrir notificações' },
  { keys: 'Alt + S', action: 'Abrir busca global' },
  { keys: 'Alt + R', action: 'Recarregar dados' },
  { keys: '⌘/Ctrl + K', action: 'Paleta de comandos' },
  { keys: '?', action: 'Mostrar esta ajuda' },
];

/**
 * Ajuda de atalhos de teclado — abre com a tecla "?" fora de campos de
 * texto e via evento "fg:show-shortcuts" disparado pela UI.
 */
export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }
      if (event.key === '?') {
        event.preventDefault();
        setOpen(true);
      }
    };

    const onShow = () => setOpen(true);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('fg:show-shortcuts', onShow);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('fg:show-shortcuts', onShow);
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
          <DialogDescription>
            Navegue mais rápido pelo sistema
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {SHORTCUTS.map(({ keys, action }) => (
            <li key={keys} className="flex items-center justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{action}</span>
              <kbd className="inline-flex h-6 select-none items-center rounded border bg-muted px-2 font-mono text-xs font-medium">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
