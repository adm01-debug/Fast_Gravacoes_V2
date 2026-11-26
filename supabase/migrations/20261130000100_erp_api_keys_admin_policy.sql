-- A API ERP (supabase/functions/erp-api) autentica por `x-api-key` contra
-- `erp_api_keys.key_hash`, mas nunca houve tela para emitir ou revogar chaves:
-- a unica chave em producao foi gravada por script e a pagina /master-api
-- exibia uma chave ficticia.
--
-- A policy existente liberava apenas o papel `manager`. `admin` e o papel usado
-- pelas outras acoes administrativas do sistema (resolve_kpi_alert,
-- list_login_lockouts, release_login_lockout) e ficava sem acesso. Esta
-- migration recria a policy com os dois papeis e nao afrouxa o resto: continua
-- valendo so para `authenticated`, continua exigindo papel ativo (a checagem
-- mora em app_private.has_role) e continua sem alcancar `anon`.
--
-- A chave segue guardada apenas como hash SHA-256; nada aqui muda o formato
-- aceito por erp-api nem os valores ja gravados.

drop policy if exists "Managers can manage API keys" on public.erp_api_keys;
drop policy if exists "Managers and admins can manage API keys" on public.erp_api_keys;

create policy "Managers and admins can manage API keys"
on public.erp_api_keys
for all
to authenticated
using (
  app_private.has_role(auth.uid(), 'manager'::app_role)
  or app_private.has_role(auth.uid(), 'admin'::app_role)
)
with check (
  app_private.has_role(auth.uid(), 'manager'::app_role)
  or app_private.has_role(auth.uid(), 'admin'::app_role)
);