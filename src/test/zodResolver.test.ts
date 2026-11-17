import { describe, it, expect } from 'vitest';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Regressao: @hookform/resolvers@3 lia ZodError.errors, campo removido no
// zod v4 — o resolver deixava de popular `errors` e TODA mensagem de
// validacao sumia da UI (ex.: wizard de nova OS aceitava campo vazio sem
// avisar). Este teste falha se o par resolver/zod voltar a ficar incompativel.
const schema = z.object({
  order_number: z.string().min(1, 'Numero da OS e obrigatorio').trim(),
  priority: z.string().default('medium'),
  quantity: z.coerce.number().int().positive('Quantidade deve ser positiva'),
});

describe('zodResolver + zod v4', () => {
  it('propaga a mensagem de cada campo invalido', async () => {
    const resolver = zodResolver(schema);
    const result = await resolver({ order_number: '', quantity: '0' }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(result.errors.order_number?.message).toBe('Numero da OS e obrigatorio');
    expect(result.errors.quantity?.message).toBe('Quantidade deve ser positiva');
  });

  it('retorna os valores ja coagidos quando tudo e valido', async () => {
    const resolver = zodResolver(schema);
    const result = await resolver({ order_number: ' OS-1 ', quantity: '5' }, undefined, {
      fields: {},
      shouldUseNativeValidation: false,
    });

    expect(result.errors).toEqual({});
    expect(result.values).toEqual({ order_number: 'OS-1', priority: 'medium', quantity: 5 });
  });
});