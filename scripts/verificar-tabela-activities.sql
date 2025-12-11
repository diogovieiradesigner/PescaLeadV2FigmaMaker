-- Script para verificar a estrutura da tabela de atividades
-- Execute no SQL Editor do Supabase Dashboard: https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk/sql

-- 1. Verificar se a tabela existe e qual o nome exato
SELECT 
  table_schema,
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%activit%' OR table_name LIKE '%activity%')
ORDER BY table_name;

-- 2. Verificar todas as tabelas que podem ser relacionadas a atividades
SELECT 
  table_schema,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (
    table_name LIKE '%lead%activit%' OR
    table_name LIKE '%activit%lead%' OR
    table_name = 'lead_activities' OR
    table_name = 'lead_activity' OR
    table_name = 'activities' OR
    table_name = 'activity'
  )
ORDER BY table_name;

-- 3. Se encontrar a tabela, verificar sua estrutura
-- (Execute esta query substituindo 'lead_activities' pelo nome encontrado acima)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lead_activities'  -- Ajuste o nome se necessário
ORDER BY ordinal_position;

-- 4. Verificar se há RLS habilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE '%activit%' OR tablename LIKE '%activity%');

-- 5. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND (tablename LIKE '%activit%' OR tablename LIKE '%activity%');
