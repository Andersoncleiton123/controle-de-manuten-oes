-- ============================================================================
-- Sistema de Controle de Manutenção de Frota — schema Supabase (Postgres)
-- Execute este arquivo inteiro no SQL Editor do seu projeto Supabase.
-- Sem autenticação/multiusuário: RLS permanece desabilitada (padrão do
-- Postgres/Supabase para tabelas novas) e concedemos acesso total às roles
-- anon/authenticated. Não use este schema para dados sensíveis em produção
-- sem revisar essa política.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Constantes de janela de alerta (documentação):
--   Geral / óleo / pneu / lubrificante -> "próximo do prazo" quando faltar
--   <= 30 dias, <= 500 km ou <= 50 h para o limite (o que for aplicável).
-- ----------------------------------------------------------------------------

-- ============================================================================
-- TABELAS
-- ============================================================================

create table vehicles (
  id             uuid primary key default gen_random_uuid(),
  tipo           text not null check (tipo in ('caminhao','betoneira')),
  identificador  text not null,   -- placa ou número de identificação
  nome           text             -- apelido, opcional
);

create table maintenance_records (
  id                     uuid primary key default gen_random_uuid(),
  vehicle_id             uuid not null references vehicles(id) on delete cascade,
  tipo_manutencao        text not null check (tipo_manutencao in ('preventiva','corretiva')),
  data_manutencao        date not null,
  km_horas               numeric not null check (km_horas >= 0),
  unidade_medida         text not null check (unidade_medida in ('km','horas')),
  servico                text not null,
  custo                  numeric not null default 0 check (custo >= 0),
  responsavel            text not null,
  proxima_manutencao_data date,
  horimetro              numeric check (horimetro >= 0) -- opcional, além do km_horas
);
create index on maintenance_records (vehicle_id);

create table oil_changes (
  id                 uuid primary key default gen_random_uuid(),
  vehicle_id         uuid not null references vehicles(id) on delete cascade,
  local_troca        text not null,
  condutor           text not null,
  km_atual           numeric not null check (km_atual >= 0),
  horimetro_atual    numeric check (horimetro_atual >= 0), -- opcional: nem todo veículo/lançamento tem horímetro
  data_ultima_troca  date not null,
  -- Regra de negócio: próxima troca = o que ocorrer primeiro entre
  -- 6 meses, 10.000 km ou 600 h a partir dos valores acima.
  proxima_troca_data  date    generated always as ( (data_ultima_troca + interval '6 months')::date ) stored,
  proxima_troca_km    numeric generated always as ( km_atual + 10000 ) stored,
  proxima_troca_horas numeric generated always as ( case when horimetro_atual is null then null else horimetro_atual + 600 end ) stored,
  observacoes        text -- usado pelo formulário unificado "Nova manutenção"
);
create index on oil_changes (vehicle_id);

create table tire_changes (
  id             uuid primary key default gen_random_uuid(),
  vehicle_id     uuid not null references vehicles(id) on delete cascade,
  -- 'traseiro_esquerdo'/'traseiro_direito' servem para veículos com eixo
  -- traseiro único; 'traseiro_eixoN_*' cobrem veículos com dois eixos
  -- traseiros e rodagem dupla (interno/externo) por lado, ex.: caminhões
  -- com 10 pneus (2 dianteiros + 8 traseiros).
  posicao        text not null check (posicao in (
    'dianteiro_esquerdo','dianteiro_direito',
    'traseiro_esquerdo','traseiro_direito',
    'traseiro_eixo1_esquerdo_externo','traseiro_eixo1_esquerdo_interno',
    'traseiro_eixo1_direito_interno','traseiro_eixo1_direito_externo',
    'traseiro_eixo2_esquerdo_externo','traseiro_eixo2_esquerdo_interno',
    'traseiro_eixo2_direito_interno','traseiro_eixo2_direito_externo'
  )),
  data_troca     date not null,
  km_troca       numeric not null check (km_troca >= 0),
  fabricante     text not null,
  local_aquisicao text not null,
  observacoes    text -- campo livre, sem cálculo/alerta associado
);
create index on tire_changes (vehicle_id);

create table lubricant_changes (
  id                 uuid primary key default gen_random_uuid(),
  equipamento_id     uuid not null references vehicles(id) on delete cascade,
  local_troca        text not null,
  horimetro_atual    numeric check (horimetro_atual >= 0), -- opcional: nem todo lançamento registra horímetro
  data_ultima_troca  date not null,
  proxima_troca_data date,
  proxima_troca_horas numeric,
  constraint lubricant_next_change_required check (proxima_troca_data is not null or proxima_troca_horas is not null)
);
create index on lubricant_changes (equipamento_id);

-- ============================================================================
-- LEITURA ATUAL DE KM / HORÍMETRO POR VEÍCULO
-- Não existe uma entidade dedicada de "odômetro atual"; usamos o maior valor
-- de km/horas já registrado em qualquer lançamento do veículo como proxy da
-- leitura atual. Isso garante que o status é recalculado automaticamente
-- sempre que um novo registro (com km/horas mais recentes) é criado.
-- ============================================================================

create or replace view vehicle_current_readings as
select
  v.id as vehicle_id,
  greatest(
    coalesce((select max(km_horas) from maintenance_records m where m.vehicle_id = v.id and m.unidade_medida = 'km'), 0),
    coalesce((select max(km_atual)  from oil_changes o where o.vehicle_id = v.id), 0),
    coalesce((select max(km_troca)  from tire_changes t where t.vehicle_id = v.id), 0)
  ) as km_atual,
  greatest(
    coalesce((select max(km_horas) from maintenance_records m where m.vehicle_id = v.id and m.unidade_medida = 'horas'), 0),
    coalesce((select max(horimetro_atual) from oil_changes o where o.vehicle_id = v.id), 0),
    coalesce((select max(horimetro_atual) from lubricant_changes l where l.equipamento_id = v.id), 0)
  ) as horimetro_atual
from vehicles v;

-- ============================================================================
-- ÚLTIMAS DATAS POR VEÍCULO (tela Início: revisão, manutenção, troca de óleo)
-- Revisão = manutenção tipo 'preventiva'; manutenção = tipo 'corretiva'.
-- ============================================================================

create or replace view vehicle_last_dates as
select
  v.id as vehicle_id,
  v.tipo as vehicle_tipo,
  v.identificador,
  v.nome,
  (select max(m.data_manutencao) from maintenance_records m where m.vehicle_id = v.id and m.tipo_manutencao = 'preventiva') as ultima_revisao,
  (select max(m.data_manutencao) from maintenance_records m where m.vehicle_id = v.id and m.tipo_manutencao = 'corretiva') as ultima_manutencao,
  (select max(o.data_ultima_troca) from oil_changes o where o.vehicle_id = v.id) as ultima_troca_oleo
from vehicles v
order by v.identificador;

-- ============================================================================
-- VIEWS DE STATUS (calculado em tempo real a cada consulta — nunca fica velho)
-- status: 'em_dia' | 'proximo' | 'atrasado'
-- ============================================================================

create or replace view maintenance_records_status as
select
  m.*,
  case
    when m.proxima_manutencao_data is null then 'em_dia'
    when m.proxima_manutencao_data < current_date then 'atrasado'
    when m.proxima_manutencao_data <= current_date + interval '30 days' then 'proximo'
    else 'em_dia'
  end as status,
  -- usado para separar o histórico geral (caminhões) das manutenções de
  -- betoneiras em telas distintas
  v.tipo as vehicle_tipo
from maintenance_records m
join vehicles v on v.id = m.vehicle_id;

create or replace view oil_changes_status as
select
  o.*,
  r.km_atual as vehicle_km_atual,
  r.horimetro_atual as vehicle_horimetro_atual,
  case
    when o.proxima_troca_data < current_date
      or r.km_atual >= o.proxima_troca_km
      or (o.proxima_troca_horas is not null and r.horimetro_atual >= o.proxima_troca_horas)
      then 'atrasado'
    when o.proxima_troca_data <= current_date + interval '30 days'
      or r.km_atual >= o.proxima_troca_km - 500
      or (o.proxima_troca_horas is not null and r.horimetro_atual >= o.proxima_troca_horas - 50)
      then 'proximo'
    else 'em_dia'
  end as status
from oil_changes o
join vehicle_current_readings r on r.vehicle_id = o.vehicle_id;

-- Pneu não tem previsão confiável de próxima troca (veículo em condição
-- severa não segue um intervalo fixo de data/km), então o status fica
-- sempre "em dia": o registro é só histórico, sem cálculo de vencimento
-- nem alerta.
create or replace view tire_changes_status as
select
  t.*,
  r.km_atual as vehicle_km_atual,
  'em_dia'::text as status
from tire_changes t
join vehicle_current_readings r on r.vehicle_id = t.vehicle_id;

create or replace view lubricant_changes_status as
select
  l.*,
  l.equipamento_id as vehicle_id,
  r.horimetro_atual as vehicle_horimetro_atual,
  case
    when (l.proxima_troca_data is not null and l.proxima_troca_data < current_date)
      or (l.proxima_troca_horas is not null and r.horimetro_atual >= l.proxima_troca_horas)
      then 'atrasado'
    when (l.proxima_troca_data is not null and l.proxima_troca_data <= current_date + interval '30 days')
      or (l.proxima_troca_horas is not null and r.horimetro_atual >= l.proxima_troca_horas - 50)
      then 'proximo'
    else 'em_dia'
  end as status
from lubricant_changes l
join vehicle_current_readings r on r.vehicle_id = l.equipamento_id;

-- ============================================================================
-- ÚLTIMO REGISTRO POR TRILHA
-- Óleo e lubrificante têm uma linha do tempo por veículo; pneu, uma por
-- posição. Uma vez que o histórico é importado, um lançamento antigo já
-- superado por um mais recente não deve continuar contando como "atrasado"
-- no status agregado/alertas — só o lançamento mais recente de cada trilha
-- representa a situação atual. (Manutenção geral fica de fora: cada registro
-- é um item de serviço independente, sem uma trilha única que o substitua.)
-- ============================================================================

create or replace view oil_changes_latest as
select distinct on (vehicle_id) *
from oil_changes_status
order by vehicle_id, data_ultima_troca desc, km_atual desc;

create or replace view tire_changes_latest as
select distinct on (vehicle_id, posicao) *
from tire_changes_status
order by vehicle_id, posicao, data_troca desc, km_troca desc;

create or replace view lubricant_changes_latest as
select distinct on (vehicle_id) *
from lubricant_changes_status
order by vehicle_id, data_ultima_troca desc;

-- ============================================================================
-- STATUS AGREGADO POR VEÍCULO E CATEGORIA (pior status entre os registros)
-- status: 'em_dia' | 'proximo' | 'atrasado' | null (sem registro na categoria)
-- ============================================================================

create or replace view vehicle_status_geral as
select
  v.id as vehicle_id, v.tipo as vehicle_tipo,
  case
    when exists (select 1 from maintenance_records_status s where s.vehicle_id = v.id and s.status = 'atrasado') then 'atrasado'
    when exists (select 1 from maintenance_records_status s where s.vehicle_id = v.id and s.status = 'proximo') then 'proximo'
    when exists (select 1 from maintenance_records_status s where s.vehicle_id = v.id) then 'em_dia'
    else null
  end as status
from vehicles v;

create or replace view vehicle_status_oleo as
select
  v.id as vehicle_id, v.tipo as vehicle_tipo,
  case
    when exists (select 1 from oil_changes_latest s where s.vehicle_id = v.id and s.status = 'atrasado') then 'atrasado'
    when exists (select 1 from oil_changes_latest s where s.vehicle_id = v.id and s.status = 'proximo') then 'proximo'
    when exists (select 1 from oil_changes_latest s where s.vehicle_id = v.id) then 'em_dia'
    else null
  end as status
from vehicles v;

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

create or replace view vehicle_status_lubrificante as
select
  v.id as vehicle_id, v.tipo as vehicle_tipo,
  case
    when exists (select 1 from lubricant_changes_latest s where s.vehicle_id = v.id and s.status = 'atrasado') then 'atrasado'
    when exists (select 1 from lubricant_changes_latest s where s.vehicle_id = v.id and s.status = 'proximo') then 'proximo'
    when exists (select 1 from lubricant_changes_latest s where s.vehicle_id = v.id) then 'em_dia'
    else null
  end as status
from vehicles v;

-- ============================================================================
-- DASHBOARD: contagem de veículos por status, por categoria de registro
-- ============================================================================

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

-- ============================================================================
-- ALERTAS: todos os registros "próximo" ou "atrasado", já com dados do veículo
-- ============================================================================

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

-- ============================================================================
-- PRIVILÉGIOS (sem autenticação: anon tem acesso total às tabelas/views)
-- ============================================================================

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant select on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
