import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Registra um acesso à ficha técnica (`technical_sheets.view_count`).
 *
 * O contador aparece no cabeçalho da ficha e no resumo da base ("ACESSOS"),
 * mas a RPC `increment_sheet_view_count` não era chamada em nenhum lugar do
 * app, então a métrica ficava parada em zero. A marcação é feita uma vez por
 * ficha e por sessão — só o aba/OS aberta conta, não cada re-render.
 */
export const useRegisterSheetView = (sheetId: string | null) => {
  const registrados = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!sheetId || registrados.current.has(sheetId)) return;
    registrados.current.add(sheetId);

    void supabase
      .rpc('increment_sheet_view_count', { sheet_id: sheetId })
      .then(({ error }) => {
        if (error) {
          console.warn('[technical-sheets] acesso não registrado:', error.message);
        }
      });
  }, [sheetId]);
};