import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { showErrorToast } from '@/lib/errorHandling';

export interface DbShippingProvider {
  id: string;
  name: string;
  contact_info: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DbShipment {
  id: string;
  job_id: string | null;
  provider_id: string | null;
  tracking_code: string | null;
  status: 'pending' | 'in_transit' | 'delivered' | 'returned' | 'cancelled';
  origin: string | null;
  destination: string | null;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  notes: string | null;
  freight_cost: number | null;
  insurance_cost: number | null;
  tax_cost: number | null;
  cost_currency: string | null;
  created_at: string;
  updated_at: string;
  provider?: DbShippingProvider;
  job?: { id: string; order_number: string; client: string; product?: string } | null;
}

export function useLogistics() {
  const queryClient = useQueryClient();

  const providers = useQuery({
    queryKey: ['shipping-providers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_providers')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as DbShippingProvider[];
    }
  });

  const shipments = useQuery({
    queryKey: ['shipments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipments')
        .select('*, provider:shipping_providers(*), job:jobs(order_number, client, product)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DbShipment[];
    }
  });

  const createShipment = useMutation({
    mutationFn: async (input: Partial<DbShipment>) => {
      // Strip joined relation fields — they are not columns on `shipments`.
      const { provider, job, ...data } = input;
      void provider;
      void job;
      const { data: shipment, error } = await supabase
        .from('shipments')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      // Update job status if linked
      if (data.job_id) {
        await supabase
          .from('jobs')
          .update({
            shipment_id: shipment.id,
            shipping_status: data.status
          })
          .eq('id', data.job_id);
      }

      return shipment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Envio criado com sucesso');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao criar envio');
    }
  });

  const updateShipment = useMutation({
    mutationFn: async ({ id, data: input }: { id: string; data: Partial<DbShipment> }) => {
      // Strip joined relation fields — they are not columns on `shipments`.
      const { provider, job, ...data } = input;
      void provider;
      void job;
      const { error } = await supabase
        .from('shipments')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      // Sync with job if status changed
      if (data.status) {
        const { data: shipment } = await supabase.from('shipments').select('job_id').eq('id', id).single();
        if (shipment?.job_id) {
          await supabase
            .from('jobs')
            .update({ shipping_status: data.status })
            .eq('id', shipment.job_id);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipments'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success('Envio atualizado com sucesso');
    },
    onError: (error) => {
      showErrorToast(error, 'Erro ao atualizar envio');
    }
  });

  return {
    providers,
    shipments,
    createShipment,
    updateShipment
  };
}
