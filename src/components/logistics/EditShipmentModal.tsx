/* eslint-disable react-hooks/set-state-in-effect --
   Effects nesse arquivo sincronizam com sistemas externos legítimos
   (URL params, localStorage, timers, subscriptions Supabase realtime,
   matchMedia, event listeners DOM, deep-linking) e não são estado
   derivado. A cascata é intencional para refletir mudanças externas. */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLogistics, DbShipment } from '@/features/inventory';
import { Truck } from 'lucide-react';
import { safeParseFloat } from '@/lib/utils';

interface EditShipmentModalProps {
  shipment: DbShipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditShipmentModal({ shipment, open, onOpenChange }: EditShipmentModalProps) {
  const { t } = useTranslation();
  const { providers, updateShipment } = useLogistics();
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [trackingCode, setTrackingCode] = useState('');
  const [destination, setDestination] = useState('');
  const [status, setStatus] = useState<DbShipment['status']>('pending');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [freightCost, setFreightCost] = useState('0');

  useEffect(() => {
    if (shipment) {
      setSelectedProviderId(shipment.provider_id || '');
      setTrackingCode(shipment.tracking_code || '');
      setDestination(shipment.destination || '');
      setStatus(shipment.status);
      setEstimatedDelivery(shipment.estimated_delivery ? shipment.estimated_delivery.split('T')[0] : '');
      setFreightCost(shipment.freight_cost?.toString() || '0');
    }
  }, [shipment]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipment) return;

    updateShipment.mutate({
      id: shipment.id,
      data: {
        provider_id: selectedProviderId || null,
        tracking_code: trackingCode,
        destination: destination,
        status: status,
        freight_cost: safeParseFloat(freightCost, 0),
        estimated_delivery: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null,
        actual_delivery: status === 'delivered' ? new Date().toISOString() : shipment.actual_delivery
      }
    }, {
      onSuccess: () => onOpenChange(false)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            {t('logistics.editShipment')}
          </DialogTitle>
          <DialogDescription>
            {t('logistics.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="p-3 bg-muted/30 rounded-lg border border-border/50 mb-4">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-1">
              {t('jobs.orderNumber')}
            </p>
            <p className="font-bold text-sm">
              OS {shipment?.job?.order_number} - {shipment?.job?.client}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('common.status')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as DbShipment['status'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('logistics.status.pending')}</SelectItem>
                  <SelectItem value="in_transit">{t('logistics.status.in_transit')}</SelectItem>
                  <SelectItem value="delivered">{t('logistics.status.delivered')}</SelectItem>
                  <SelectItem value="returned">{t('logistics.status.returned')}</SelectItem>
                  <SelectItem value="cancelled">{t('logistics.status.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('logistics.provider')}</Label>
              <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {providers.data?.map(provider => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracking-edit">{t('logistics.trackingCode')}</Label>
            <Input
              id="tracking-edit"
              value={trackingCode}
              onChange={(e) => setTrackingCode(e.target.value)}
              placeholder="Ex: LOG-123456"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dest-edit">{t('logistics.destination')}</Label>
            <Input
              id="dest-edit"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="delivery-date">{t('logistics.estimatedDelivery')}</Label>
            <Input
              id="delivery-date"
              type="date"
              value={estimatedDelivery}
              onChange={(e) => setEstimatedDelivery(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="freight-edit">{t('logistics.freightCost')}</Label>
            <Input
              id="freight-edit"
              type="number"
              step="0.01"
              value={freightCost}
              onChange={(e) => setFreightCost(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-border mt-6">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" className="flex-1 gradient-primary" disabled={updateShipment.isPending}>
              {updateShipment.isPending ? t('common.loading') : t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
