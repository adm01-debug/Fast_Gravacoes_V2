-- Com security_events na publicacao realtime, o painel passou a reagir a toda
-- linha inserida. A politica "Users can insert own log entries" deixa qualquer
-- `authenticated` gravar com `user_id = auth.uid()`, inclusive severity 'critical'
-- ou 'high' — ou seja, um usuario comum conseguia disparar toast critico falso
-- para coordenadores. Evento do sistema (service_role) nao tem `sub` no JWT, logo
-- `auth.uid()` e NULL; esses continuam com a severidade que o backend escolheu.
CREATE OR REPLACE FUNCTION public.security_events_limita_severidade_do_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.severity NOT IN ('info', 'warning') THEN
    NEW.severity := 'warning';
  END IF;
  RETURN NEW;
END;
$$

REVOKE ALL ON FUNCTION public.security_events_limita_severidade_do_cliente() FROM PUBLIC

REVOKE ALL ON FUNCTION public.security_events_limita_severidade_do_cliente() FROM anon

REVOKE ALL ON FUNCTION public.security_events_limita_severidade_do_cliente() FROM authenticated

DROP TRIGGER IF EXISTS security_events_limita_severidade_do_cliente ON public.security_events

CREATE TRIGGER security_events_limita_severidade_do_cliente
  BEFORE INSERT ON public.security_events
  FOR EACH ROW
  EXECUTE FUNCTION public.security_events_limita_severidade_do_cliente()
