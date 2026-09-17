-- ============================================================================
-- IMPORTAÇÃO DE DADOS REAIS — planilha "CONTROLE DE REVISÕES.xlsx"
-- (pasta Nextcloud: 🚛 Uniccar)
--
-- Execute DEPOIS de rodar schema.sql, em um banco que ainda não tem esses
-- veículos cadastrados (rode uma única vez).
--
-- A planilha original é um controle manual, em texto livre, com trocas de
-- óleo do motor e de lubrificante da caixa/redutor da betoneira, agrupadas
-- por número de frota "BT 01" a "BT 12". Cada linha de troca de óleo virou
-- um registro em oil_changes; cada linha "BETONEIRA ..." virou um registro
-- em lubricant_changes. A "próxima troca" de óleo NÃO foi copiada da
-- planilha — ela é recalculada automaticamente pelo sistema (regra de
-- 6 meses / 10.000 km / 600 h) a partir dos valores executados abaixo.
--
-- Ajustes feitos ao transcrever (planilha tinha erros de digitação e campos
-- em texto livre misturando data/km/horímetro/produto numa única célula):
--   • BT 10, troca de 24/03/2026: a planilha tinha "24/03/20226" (ano com
--     dígito a mais) — corrigido para 2026.
--   • BT 12: placa na planilha estava sem hífen ("TSV6J09") — normalizada
--     para "TSV-6J09", no mesmo padrão das demais placas.
--   • BT 08, troca de 26/11/2025: a planilha indicava "próxima ... ou
--     18000h", quebrando a progressão 600h/1200h/1800h/2400h das trocas
--     seguintes (claramente um dígito a mais). Como a "próxima troca" não é
--     armazenada — é sempre recalculada a partir do registro seguinte —,
--     esse valor não foi usado; a leitura EXECUTADA (1.200h) foi mantida.
--   • Quando a planilha não registrou horímetro numa troca específica
--     (comum antes de 2026), o campo foi deixado em branco (NULL) — o
--     sistema calcula o status dessa trilha usando km e data; a leitura de
--     horímetro do veículo continua vindo do último valor conhecido em
--     qualquer registro (ver view vehicle_current_readings no schema.sql).
--   • A coluna "QUANDO LOCADO" (contexto comercial de locação) não foi
--     importada — não faz parte do modelo de dados deste sistema.
--   • Linhas sem data/km preenchidos (entradas em aberto/incompletas na
--     planilha) foram ignoradas.
--   • BT 04 e BT 07 não tinham linha de troca de lubrificante da betoneira
--     na planilha — nenhum registro de lubrificante foi criado para eles.
-- ============================================================================

insert into vehicles (id, tipo, identificador, nome) values
  ('f3863394-8407-4a77-9837-7d9e593f5088','betoneira','SDT-5F07','BT 01 - Convicta'),
  ('43ade546-6466-4550-8ccf-6f73134b6e47','betoneira','RGK-1F44','BT 02 - Schwing'),
  ('2a19d469-06ea-4386-b883-58b639fbaab9','betoneira','RHU-1F50','BT 03 - Convicta'),
  ('0026dfbb-a164-46c1-a8fd-02943fdb8a8f','betoneira','SEM-2G30','BT 04 - Liebherr'),
  ('35e5770b-5b9b-4d2f-99a6-8076c8092e98','betoneira','RGK-2E94','BT 05 - Schwing'),
  ('cb5c5117-2ca5-4084-b148-bc4ad3aa2c86','betoneira','RHA-3H54','BT 06 - Convicta'),
  ('5aac220b-fa23-4d64-9534-410d27c0edf9','betoneira','TSP-0A45','BT 07 - Convicta'),
  ('b57bef03-fcee-426d-9ab4-4db9e81ec38b','betoneira','RQL-4D33','BT 08 - Siti'),
  ('328f8262-31ec-4440-9763-b7023eafba10','betoneira','TSR-9H27','BT 09 - Siti'),
  ('a74e4ed2-030d-499f-8e6a-ea9692fc6853','betoneira','TSR-9H05','BT 10 - Siti'),
  ('a52f531e-d61b-4497-9679-766d368c9b58','betoneira','TSR-9H16','BT 11 - Siti'),
  ('7919cf22-01e3-479d-ad15-2f6aed86c985','betoneira','TSV-6J09','BT 12 - Siti');

insert into oil_changes (vehicle_id, local_troca, condutor, km_atual, horimetro_atual, data_ultima_troca) values
  -- BT 01 (SDT-5F07)
  ('f3863394-8407-4a77-9837-7d9e593f5088','OBRA/SS&B','FRANCISCO',44010,null,'2025-05-28'),
  ('f3863394-8407-4a77-9837-7d9e593f5088','LINDOMAR','ANDERSON',47560,null,'2025-11-11'),
  ('f3863394-8407-4a77-9837-7d9e593f5088','EDUCAR','MARIO',59184,5605,'2026-04-21'),
  ('f3863394-8407-4a77-9837-7d9e593f5088','FUSION TRUCK','ANDERSON',71350,6105,'2026-09-05'),
  -- BT 02 (RGK-1F44)
  ('43ade546-6466-4550-8ccf-6f73134b6e47','OUROLÂNDIA','FELIPE CONECTROM',90000,null,'2025-07-17'),
  ('43ade546-6466-4550-8ccf-6f73134b6e47','LINDOMAR','ANDERSON',92567,null,'2025-11-18'),
  ('43ade546-6466-4550-8ccf-6f73134b6e47','CENTER DIESEL','ANDERSON',102189,8201,'2026-04-10'),
  -- BT 03 (RHU-1F50)
  ('2a19d469-06ea-4386-b883-58b639fbaab9','LINDOMAR','JUDMELLI',77683,null,'2025-06-16'),
  ('2a19d469-06ea-4386-b883-58b639fbaab9','CASARAO DO OLEO','GIVANILDO',84077,6073,'2025-10-31'),
  ('2a19d469-06ea-4386-b883-58b639fbaab9','LINDOMAR','ANDERSON',90189,6618,'2026-03-16'),
  -- BT 04 (SEM-2G30)
  ('0026dfbb-a164-46c1-a8fd-02943fdb8a8f','LINDOMAR','UNIC JUDMELLI',17610,null,'2025-07-05'),
  ('0026dfbb-a164-46c1-a8fd-02943fdb8a8f','CEQUIP','ERIVAM',26643,null,'2026-01-28'),
  ('0026dfbb-a164-46c1-a8fd-02943fdb8a8f','LINDOMAR','JOAQUIM',35815,1376,'2026-05-02'),
  ('0026dfbb-a164-46c1-a8fd-02943fdb8a8f','LINDOMAR','JOAQUIM',45895,null,'2026-06-17'),
  -- BT 05 (RGK-2E94)
  ('35e5770b-5b9b-4d2f-99a6-8076c8092e98','LINDOMAR','NENEL',64417,null,'2025-04-26'),
  ('35e5770b-5b9b-4d2f-99a6-8076c8092e98','LINDOMAR','ANDERSON',69929,7457,'2025-11-11'),
  ('35e5770b-5b9b-4d2f-99a6-8076c8092e98','LINDOMAR','ANDERSON',81042,7877,'2026-04-20'),
  -- BT 06 (RHA-3H54)
  ('cb5c5117-2ca5-4084-b148-bc4ad3aa2c86','OUROLANDIA','JHONINHO',124601,null,'2025-08-04'),
  ('cb5c5117-2ca5-4084-b148-bc4ad3aa2c86','LINDOMAR','ANDERSON',127131,null,'2025-11-24'),
  ('cb5c5117-2ca5-4084-b148-bc4ad3aa2c86','EDUCAR','ERANDI',139328,9631,'2026-04-21'),
  -- BT 07 (TSP-0A45)
  ('5aac220b-fa23-4d64-9534-410d27c0edf9','GAMA CP/GRANDE 1ª','UBIRAGÍ',12910,600,'2025-04-16'),
  ('5aac220b-fa23-4d64-9534-410d27c0edf9','GAMA CP/GRANDE 2ª','UBIRAGÍ',21323,1200,'2025-06-13'),
  ('5aac220b-fa23-4d64-9534-410d27c0edf9','CEQUIP 3º','JOSE JAIRO',28225,1800,'2025-10-13'),
  ('5aac220b-fa23-4d64-9534-410d27c0edf9','CEQUIP 4º','JOSE JAIRO',35256,2400,'2026-01-21'),
  ('5aac220b-fa23-4d64-9534-410d27c0edf9','CEQUIP 5ª','JOSE JAIRO',42099,3119,'2026-06-13'),
  -- BT 08 (RQL-4D33)
  ('b57bef03-fcee-426d-9ab4-4db9e81ec38b','CEQUIP','GIVANILDO',8140,600,'2025-10-09'),
  ('b57bef03-fcee-426d-9ab4-4db9e81ec38b','CEQUIP','GIVANILDO',14309,1200,'2025-11-26'),
  ('b57bef03-fcee-426d-9ab4-4db9e81ec38b','CEQUIP','GIVANILDO',21148,1800,'2026-04-29'),
  ('b57bef03-fcee-426d-9ab4-4db9e81ec38b','CEQUIP','GIVANILDO',24306,2360,'2026-08-26'),
  -- BT 09 (TSR-9H27)
  ('328f8262-31ec-4440-9763-b7023eafba10','VIA DIESEL MOSSORO','Edam',7982,600,'2026-03-27'),
  -- BT 10 (TSR-9H05)
  ('a74e4ed2-030d-499f-8e6a-ea9692fc6853','VIA DIESEL MOSSORO','EDAM',6332,600,'2026-03-24'),
  -- BT 11 (TSR-9H16)
  ('a52f531e-d61b-4497-9679-766d368c9b58','VIA DIESEL MOSSORO','MAIA',7828,600,'2026-04-17'),
  ('a52f531e-d61b-4497-9679-766d368c9b58','VIA DIESEL MOSSORO','JOSENIR',19876,1253,'2026-08-05'),
  -- BT 12 (TSV-6J09)
  ('7919cf22-01e3-479d-ad15-2f6aed86c985','VIA DIESEL NATAL','NIVALDO',12663,600,'2026-03-30');

insert into lubricant_changes (equipamento_id, local_troca, horimetro_atual, data_ultima_troca, proxima_troca_data, proxima_troca_horas) values
  ('f3863394-8407-4a77-9837-7d9e593f5088','LINDOMAR',null,'2025-11-11','2026-11-11',null),
  ('43ade546-6466-4550-8ccf-6f73134b6e47','LINDOMAR',null,'2025-11-18','2026-11-18',null),
  ('2a19d469-06ea-4386-b883-58b639fbaab9','LINDOMAR',null,'2026-03-16','2027-03-16',9100),
  ('35e5770b-5b9b-4d2f-99a6-8076c8092e98','LINDOMAR',null,'2025-11-11','2026-11-11',null),
  ('cb5c5117-2ca5-4084-b148-bc4ad3aa2c86','LINDOMAR',null,'2025-11-24','2026-11-24',null),
  ('b57bef03-fcee-426d-9ab4-4db9e81ec38b','IGUATU',1400,'2026-02-07','2027-02-07',2400);
