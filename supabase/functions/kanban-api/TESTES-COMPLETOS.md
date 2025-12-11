# 🧪 Testes Completos - Kanban API

## 📋 Checklist de Testes

### ✅ 1. Health Check
- [ ] GET `/health` - Deve retornar status OK

### ✅ 2. Autenticação
- [ ] Sem token - Deve retornar 401
- [ ] Token inválido - Deve retornar 401
- [ ] Token válido - Deve passar

### ✅ 3. Workspace Access
- [ ] Workspace inexistente - Deve retornar 403
- [ ] Usuário sem acesso - Deve retornar 403
- [ ] Usuário com acesso - Deve passar

### ✅ 4. Funis
- [ ] GET `/funnels` - Lista funis
- [ ] GET `/funnels/:id` - Busca funil específico
- [ ] Funil inexistente - Deve retornar 404

### ✅ 5. Colunas
- [ ] GET `/columns` - Lista colunas
- [ ] GET `/columns/:id` - Busca coluna específica
- [ ] Coluna inexistente - Deve retornar 404

### ✅ 6. Leads - Carregamento Inicial
- [ ] GET `/leads` - Carrega leads iniciais de todas as colunas
- [ ] Verificar estrutura de resposta
- [ ] Verificar que retorna apenas 10 leads por coluna
- [ ] Verificar que `total` está correto
- [ ] Verificar que `hasMore` está correto

### ✅ 7. Leads - Paginação
- [ ] GET `/columns/:id/leads?limit=10&offset=0` - Primeira página
- [ ] GET `/columns/:id/leads?limit=10&offset=10` - Segunda página
- [ ] Verificar que leads não se repetem
- [ ] Verificar que `hasMore` muda corretamente

### ✅ 8. Leads - Filtros
- [ ] Filtro `hasEmail=true` - Deve retornar apenas leads com emails_count > 0
- [ ] Filtro `hasWhatsapp=true` - Deve retornar apenas leads com whatsapp_valid = true
- [ ] Filtro `searchQuery` - Deve buscar em client_name e company
- [ ] Filtro `priority` - Deve filtrar por prioridade
- [ ] Filtros combinados - Deve aplicar todos os filtros
- [ ] Verificar que `total` reflete filtros aplicados

### ✅ 9. Leads - Lead Específico
- [ ] GET `/leads/:id` - Busca lead específico
- [ ] Lead inexistente - Deve retornar 404

### ✅ 10. Estatísticas
- [ ] GET `/stats` - Retorna estatísticas do funil
- [ ] Verificar estrutura de resposta
- [ ] Verificar cálculos (totalLeads, totalValue, etc.)

### ✅ 11. Performance
- [ ] Tempo de resposta < 500ms (carga inicial)
- [ ] Tempo de resposta < 200ms (load more)
- [ ] Tempo de resposta < 300ms (com filtros)

---

## 🚀 Executar Testes

Ver arquivo `TESTES-EXECUTAR.sql` para testes SQL diretos.

