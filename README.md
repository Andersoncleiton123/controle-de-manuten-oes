# Controle de Manutenção de Frota

Sistema web para controle de manutenção de veículos e equipamentos de frota
(caminhões e betoneiras): cadastro de veículos, manutenções gerais, trocas de
óleo, trocas de pneu, trocas de lubrificante da betoneira, histórico, alertas
e um dashboard resumido.

Identidade visual baseada nos mockups fornecidos (`Controle de revisão
veicular.zip`): app-shell centralizado estilo mobile, header azul (#1c4f9c),
cards brancos arredondados com sombra suave, bolinhas de status
verde/amarelo/vermelho e navegação inferior com 5 abas.

## Stack

- **Backend/banco de dados**: [Supabase](https://supabase.com) (Postgres +
  API REST automática via PostgREST). O cálculo de status ("em dia" /
  "próximo do prazo" / "atrasado") é feito em **views SQL**, então ele é
  sempre recalculado na hora da consulta — nunca fica desatualizado.
- **Frontend**: HTML/CSS/JavaScript puro, sem framework e sem build (a
  máquina usada para gerar este projeto não tinha Node.js/Python/.NET
  instalados). A página carrega o cliente `supabase-js` via CDN
  (jsdelivr) e conversa diretamente com o Supabase.

Não há autenticação/multiusuário. Como consequência, a *anon key* do
Supabase tem acesso total de leitura/escrita às tabelas — adequado para um
protótipo de uso interno, não recomendado se os dados forem sensíveis ou o
projeto for exposto publicamente sem revisão adicional.

## Como configurar

### 1. Criar o projeto Supabase

Crie um projeto gratuito em https://supabase.com/dashboard e anote:

- **Project URL** (Project Settings → API)
- **anon public key** (Project Settings → API)

### 2. Rodar o schema do banco

No painel do Supabase, abra **SQL Editor**, cole todo o conteúdo de
[`supabase/schema.sql`](supabase/schema.sql) e execute. Isso cria:

- Tabelas: `vehicles`, `maintenance_records`, `oil_changes`, `tire_changes`,
  `lubricant_changes`.
- Views de status (`*_status`, `*_latest`, `vehicle_status_*`,
  `dashboard_counts`, `alerts_view`) — não é preciso mexer nelas, o frontend
  já consome diretamente.

O banco começa vazio — não há dados fictícios pré-carregados.

### 2.1. (Opcional) Importar o histórico da planilha "CONTROLE DE REVISÕES"

Se quiser trazer o histórico de trocas de óleo e lubrificante das betoneiras
BT 01 a BT 12 que já estava controlado em planilha
(`Nextcloud/🚛 Uniccar/CONTROLE DE REVISÕES.xlsx`), rode também
[`supabase/seed_from_planilha.sql`](supabase/seed_from_planilha.sql) logo
depois do `schema.sql`, uma única vez. O cabeçalho do arquivo documenta os
ajustes feitos ao transcrever a planilha (datas com erro de digitação,
placa sem hífen, etc.) — vale conferir antes de rodar.

Isso também motivou um ajuste no schema em relação à primeira versão: o
**horímetro atual é opcional** em óleo e lubrificante (`horimetro_atual`
aceita `NULL`), porque boa parte do histórico da planilha só registrava km,
sem horímetro. Quando não informado, o status daquela trilha passa a
depender só de km e data.

### 3. Configurar o frontend

Edite [`web/assets/config.js`](web/assets/config.js) e preencha:

```js
const SUPABASE_URL = "https://SEU-PROJETO.supabase.co";
const SUPABASE_ANON_KEY = "SUA_ANON_KEY";
```

### 4. Abrir o app

Não há servidor/build necessário. Duas opções:

- Abra `web/index.html` diretamente no navegador (duplo clique ou
  `file://...`).
- Ou sirva a pasta `web/` com qualquer servidor estático simples, se
  preferir evitar restrições de `file://` no seu navegador.

## Navegação

A barra inferior tem 5 abas, adaptadas dos mockups (que não previam conta de
usuário nem as telas de Veículos/Óleo/Alertas como abas próprias):

| Aba | Arquivo | Função |
|---|---|---|
| Início | `web/index.html` | Dashboard resumido (contagem por status/categoria) + prévia dos alertas mais urgentes |
| Histórico | `web/manutencoes.html` | Registro de manutenção geral (preventiva/corretiva) + histórico filtrável por veículo, tipo e status |
| Pneus | `web/pneus.html` | Registro de troca de pneu por posição + histórico |
| Betoneira | `web/lubrificante.html` | Registro e histórico de troca de lubrificante das betoneiras |
| Mais | `web/mais.html` | Menu para as telas sem aba própria: Veículos, Troca de Óleo e Alertas |

Páginas alcançadas por "Mais"/"Início" mas sem aba própria:

| Página | Arquivo | Função |
|---|---|---|
| Veículos | `web/veiculos.html` | CRUD de veículos/equipamentos |
| Troca de óleo | `web/oleo.html` | Registro e histórico de trocas de óleo |
| Alertas | `web/alertas.html` | Lista unificada de tudo que está "próximo do prazo" ou "atrasado", ordenado por urgência |

## Regras de negócio implementadas

- **Status** (`em_dia` / `proximo` / `atrasado`) calculado em views SQL,
  sempre em tempo real:
  - Manutenção geral: baseado apenas na data prevista da próxima
    manutenção (janela de alerta: 30 dias).
  - Óleo: `próxima troca = min(data última troca + 6 meses, km atual +
    10.000, horímetro atual + 600h)` — implementado como colunas geradas
    (`generated always as`) na tabela `oil_changes`. Fica atrasado se
    qualquer um dos três limites for ultrapassado; fica "próximo" se
    qualquer um estiver a 30 dias / 500 km / 50 h do limite.
  - Lubrificante: a "próxima troca" é informada manualmente no formulário
    (por data e/ou por horímetro, pelo menos um dos dois), pois a
    especificação não define uma fórmula fixa. O status usa as mesmas
    janelas de alerta (30 dias / 50 h).
  - Pneu: não há previsão de próxima troca — os veículos operam em
    condição severa, então não é possível prever de forma confiável
    quando a próxima troca vai ocorrer. O registro de troca de pneu é
    puramente histórico (com um campo livre de observações); o status
    fica sempre `em_dia` e nunca gera alerta.
- **Leitura atual de km/horímetro por veículo**: não existe uma entidade
  dedicada de "odômetro atual" na especificação. O sistema usa o maior
  valor de km/horas já registrado em qualquer lançamento do veículo
  (manutenção geral, óleo, pneu) como proxy da leitura atual — isso é o
  que faz o status recalcular automaticamente quando um novo registro com
  km/horas mais recente é lançado.
- **Alertas**: view unificada (`alerts_view`) juntando os quatro tipos de
  registro em "próximo" ou "atrasado", ordenados por urgência (atrasado
  primeiro) e depois pela data de referência mais próxima.
- **Óleo, pneu (por posição) e lubrificante têm histórico, mas o status
  agregado (dashboard/alertas) olha só o lançamento mais recente de cada
  trilha** (`oil_changes_latest`, `tire_changes_latest`,
  `lubricant_changes_latest`). Sem isso, ao importar/acumular histórico, uma
  troca antiga já substituída por uma mais nova continuaria contando como
  "atrasado" para sempre. As páginas de histórico continuam mostrando o
  status calculado de cada linha individualmente. Manutenção geral não usa
  essa lógica — cada registro é um item de serviço independente.
- **Validação de formulários**: campos obrigatórios, datas válidas e
  valores numéricos não-negativos, verificados no navegador antes do envio
  (além das constraints `check` no banco).

## Estrutura de arquivos

```
supabase/schema.sql              # schema completo (tabelas + views + grants)
supabase/seed_from_planilha.sql  # importação opcional do histórico da planilha (BT 01-12)
web/index.html               # Início (dashboard + prévia de alertas)
web/manutencoes.html         # Histórico (manutenção geral + histórico)
web/pneus.html                # Pneus
web/lubrificante.html         # Betoneira (lubrificante)
web/mais.html                  # Mais (menu: Veículos, Óleo, Alertas)
web/veiculos.html            # CRUD de veículos (via Mais)
web/oleo.html                 # troca de óleo (via Mais)
web/alertas.html              # alertas (via Início)
web/assets/style.css         # identidade visual (cores, cards, nav inferior)
web/assets/config.js         # credenciais do Supabase (preencher)
web/assets/supabaseClient.js # inicialização do cliente supabase-js
web/assets/utils.js          # validação de formulário, formatação, badges de status
web/assets/nav.js            # navegação inferior (5 abas) comum às páginas
web/assets/*.js              # lógica de cada página
```
