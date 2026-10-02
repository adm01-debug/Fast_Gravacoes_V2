import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const formatLastSeen = (date: Date | undefined) => {
  if (!date) return null;
  return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
};
