-- Etapa 13 do plano de 24/09 (docs/plano-50-etapas-260924.md).
-- "Users can insert waste records" tinha with_check = true — qualquer usuário
-- autenticado podia inserir um registro de refugo sem checagem de papel/dono.
-- Alinha com o padrão já usado em packaging_defects (has_any_active_role +
-- checagem de dono quando operator_id é informado).

drop policy if exists "Users can insert waste records" on public.packaging_waste;

create policy "Users can insert waste records"
on public.packaging_waste
for insert
to authenticated
with check (
  has_any_active_role()
  and (operator_id is null or operator_id = auth.uid())
);
