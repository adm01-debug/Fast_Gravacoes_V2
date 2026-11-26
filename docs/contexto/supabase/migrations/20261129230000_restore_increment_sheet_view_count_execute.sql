-- A migration de 19/06/2026 revogou o EXECUTE de public.increment_sheet_view_count(uuid)
-- e concedeu apenas a service_role. Producao segue funcionando porque o grant foi
-- refeito por fora do versionamento; um ambiente reconstruido pelas migrations
-- nasceria com o contador de acessos da ficha tecnica sem poder ser incrementado.
GRANT EXECUTE ON FUNCTION public.increment_sheet_view_count(uuid) TO authenticated
