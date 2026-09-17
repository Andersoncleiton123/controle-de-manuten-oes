-- ============================================================================
-- Migração: amplia as posições de pneu aceitas para cobrir caminhões com
-- dois eixos traseiros de rodagem dupla (8 pneus na traseira + 2 na
-- dianteira = 10 no total), mantendo as posições antigas (dianteiro
-- esquerdo/direito, traseiro esquerdo/direito de eixo único) para veículos
-- mais simples.
--
-- Execute este arquivo inteiro no SQL Editor do Supabase, uma única vez,
-- depois de já ter aplicado supabase/schema.sql (e, se for o caso,
-- supabase/migration_pneu_sem_previsao.sql). Pode ser executado antes ou
-- depois dessa outra migração, a ordem entre elas não importa.
-- ============================================================================

-- O nome da constraint de check em "posicao" é gerado automaticamente pelo
-- Postgres; em vez de arriscar o nome errado, localizamos e removemos
-- dinamicamente qualquer check constraint da coluna antes de recriá-la.
do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'tire_changes'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%posicao%'
  loop
    execute format('alter table tire_changes drop constraint %I', con.conname);
  end loop;
end $$;

alter table tire_changes add constraint tire_changes_posicao_check check (posicao in (
  'dianteiro_esquerdo','dianteiro_direito',
  'traseiro_esquerdo','traseiro_direito',
  'traseiro_eixo1_esquerdo_externo','traseiro_eixo1_esquerdo_interno',
  'traseiro_eixo1_direito_interno','traseiro_eixo1_direito_externo',
  'traseiro_eixo2_esquerdo_externo','traseiro_eixo2_esquerdo_interno',
  'traseiro_eixo2_direito_interno','traseiro_eixo2_direito_externo'
));
