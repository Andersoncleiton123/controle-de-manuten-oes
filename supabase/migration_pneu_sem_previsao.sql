-- ============================================================================
-- Migração: remove a previsão de próxima troca de pneu (data/km) e adiciona
-- um campo de observações livre.
--
-- Motivo: os veículos operam em condição severa, então não há como prever
-- de forma confiável quando a próxima troca de pneu vai ocorrer. O status
-- de pneu (em_dia/proximo/atrasado) passa a ser sempre "em dia" — o
-- registro vira puramente histórico, sem cálculo de vencimento nem alerta.
--
-- Execute este arquivo inteiro no SQL Editor do Supabase, uma única vez,
-- no projeto que já tem supabase/schema.sql aplicado. Depois desta
-- migração, schema.sql já reflete o novo estado (útil para projetos novos).
-- ============================================================================

-- tire_changes_status é a base de toda a cadeia de views de pneu
-- (tire_changes_latest -> vehicle_status_pneu -> dashboard_counts /
-- alerts_view). Derrubar com cascade e recriar tudo na ordem certa evita
-- ter que destrinchar manualmente cada dependência.
drop view if exists tire_changes_status cascade;

alter table tire_changes drop constraint if exists tire_next_change_required;
alter table tire_changes drop column if exists proxima_troca_data;
alter table tire_changes drop column if exists proxima_troca_km;
alter table tire_changes add column if not exists observacoes text;

create or replace view tire_changes_status as
select
  t.*,
  r.km_atual as vehicle_km_atual,
  'em_dia'::text as status
from tire_changes t
join vehicle_current_readings r on r.vehicle_id = t.vehicle_id;

create or replace view tire_changes_latest as
select distinct on (vehicle_id, posicao) *
from tire_changes_status
order by vehicle_id, posicao, data_troca desc, km_troca desc;

create or replace view vehicle_status_pneu as
select
  v.id as vehicle_id, v.tipo as vehicle_tipo,
  case
    when exists (select 1 from tire_changes_latest s where s.vehicle_id = v.id and s.status = 'atrasado') then 'atrasado'
    when exists (select 1 from tire_changes_latest s where s.vehicle_id = v.id and s.status = 'proximo') then 'proximo'
    when exists (select 1 from tire_changes_latest s where s.vehicle_id = v.id) then 'em_dia'
    else null
  end as status
from vehicles v;

create or replace view dashboard_counts as
select 'geral'::text as categoria, status, count(*)::int as total
  from vehicle_status_geral where status is not null group by status
union all
select 'oleo', status, count(*)::int
  from vehicle_status_oleo where status is not null group by status
union all
select 'pneu', status, count(*)::int
  from vehicle_status_pneu where status is not null group by status
union all
select 'lubrificante', status, count(*)::int
  from vehicle_status_lubrificante where status is not null group by status;

create or replace view alerts_view as
select
  'geral'::text as origem, ms.id as record_id, ms.vehicle_id,
  v.nome as vehicle_nome, v.identificador as vehicle_identificador, v.tipo as vehicle_tipo,
  ms.servico as descricao, ms.proxima_manutencao_data as data_referencia, ms.status
from maintenance_records_status ms
join vehicles v on v.id = ms.vehicle_id
where ms.status in ('proximo','atrasado')

union all

select
  'oleo', os.id, os.vehicle_id,
  v.nome, v.identificador, v.tipo,
  'Troca de óleo' as descricao, os.proxima_troca_data as data_referencia, os.status
from oil_changes_latest os
join vehicles v on v.id = os.vehicle_id
where os.status in ('proximo','atrasado')

union all

select
  'pneu', ts.id, ts.vehicle_id,
  v.nome, v.identificador, v.tipo,
  ('Pneu ' || replace(ts.posicao,'_',' ')) as descricao, null::date as data_referencia, ts.status
from tire_changes_latest ts
join vehicles v on v.id = ts.vehicle_id
where ts.status in ('proximo','atrasado')

union all

select
  'lubrificante', ls.id, ls.vehicle_id,
  v.nome, v.identificador, v.tipo,
  'Lubrificante' as descricao, ls.proxima_troca_data as data_referencia, ls.status
from lubricant_changes_latest ls
join vehicles v on v.id = ls.vehicle_id
where ls.status in ('proximo','atrasado');
