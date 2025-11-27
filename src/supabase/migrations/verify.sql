SELECT 
  '✅ Tabelas Criadas' as status,
  COUNT(*) as total,
  STRING_AGG(table_name, ', ' ORDER BY table_name) as tabelas
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN (
  'users',
  'workspaces', 
  'workspace_members',
  'funnels',
  'funnel_columns',
  'leads',
  'lead_activities',
  'lead_attachments',
  'custom_fields',
  'lead_custom_values',
  'instances',
  'inboxes',
  'inbox_instances',
  'agents',
  'workspace_invites',
  'conversations',
  'messages',
  'audit_log',
  'funnel_stats'
);

-- Deve retornar: total = 19