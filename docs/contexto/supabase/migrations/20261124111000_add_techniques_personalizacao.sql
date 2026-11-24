-- ---------------------------------------------------------------------------
-- Tecnicas de personalizacao que o Promo Design usa nas ordens de servico mas
-- que nao existiam no dicionario de public.techniques daqui. Sem elas o evento
-- os.closed chega com technique_id nulo e o job nao nasce (o adapter do Design
-- marcava o evento como 'skipped').
--
-- ON CONFLICT DO NOTHING: se a tecnica ja existir com ajuste local de cor,
-- short_name ou setup_time feito pela operacao, nada e sobrescrito.
-- ---------------------------------------------------------------------------
INSERT INTO public.techniques (id, name, short_name, color, setup_time) VALUES
  ('embossing', 'Embossing',    'EMB', '#7c3aed', 20),
  ('corte',     'Corte',        'CRT', '#0ea5e9', 10),
  ('decalque',  'Decalque',     'DCL', '#84cc16', 25),
  ('hotstamp',  'Hot Stamping', 'HOT', '#f43f5e', 20)
ON CONFLICT (id) DO NOTHING

COMMENT ON TABLE public.techniques IS
  'Dicionario de tecnicas de personalizacao. Ids em minusculas sem acento; o Promo Design mapeia o texto livre da OS para estes ids via integration_technique_map.'
