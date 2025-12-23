# 🧪 Guia de Teste: Detecção Automática de Mensagens Externas

## 🎯 Objetivo do Teste

Validar se a funcionalidade de detecção automática de mensagens externas está funcionando corretamente na conversa específica: **2f65dfb2-d9dd-488f-80cd-94f0efbea182**

## ✅ Status da Implementação

### **✅ Deploy Realizado com Sucesso**
- **Versão Anterior:** 287 (15/12/2025)
- **Versão Atual:** 288 (23/12/2025 16:58:34)
- **Status:** 🟢 **ATIVA E FUNCIONAL**

### **Funcionalidade Implementada:**
- ✅ Detecção automática de `fromMe = true`
- ✅ Mudança automática de `attendant_type: 'ai'` → `'human'`
- ✅ Logs detalhados para monitoramento
- ✅ Tratamento robusto de erros

## 🧪 Cenários de Teste

### **Teste 1: Validar Estado Atual da Conversa**

**Passos:**
1. Acesse a conversa: **2f65dfb2-d9dd-488f-80cd-94f0efbea182**
2. Verifique o tipo de atendimento atual
3. Confirme se está como "I.A" ou "AI"

**Resultado Esperado:** Conversa deve estar em modo AI

### **Teste 2: Enviar Mensagem via WhatsApp Celular**

**Passos:**
1. Abra o WhatsApp no seu celular
2. Vá na conversa com o cliente
3. Envie uma mensagem de teste (ex: "Teste de detecção automática")
4. Aguarde 5-10 segundos
5. Volte para o sistema web

**Resultado Esperado:**
- ✅ Mensagem deve aparecer no sistema (lado direito)
- ✅ Tipo de atendimento deve mudar automaticamente para "Humano"
- ✅ Logs devem mostrar a detecção

### **Teste 3: Verificar Logs do Sistema**

**Como Verificar:**
1. Acesse o dashboard do Supabase
2. Vá em Functions → make-server-e4f9d774 → Logs
3. Procure por logs com o prefixo: `🤖→👤 [UAZAPI-WEBHOOK]`

**Logs Esperados:**
```
🤖→👤 [UAZAPI-WEBHOOK] Mensagem do atendente detectada via WhatsApp Web/celular
📋 [UAZAPI-WEBHOOK] Conversa encontrada: 2f65dfb2-d9dd-488f-80cd-94f0efbea182, tipo atual: ai
🔄 [UAZAPI-WEBHOOK] Alterando tipo de atendimento de AI para humano...
✅ [UAZAPI-WEBHOOK] Tipo de atendimento alterado para humano com sucesso
```

### **Teste 4: Enviar Segunda Mensagem (Verificar Estado)**

**Passos:**
1. Envie outra mensagem via WhatsApp celular
2. Verifique se o sistema não tenta mudar novamente (já está em humano)

**Resultado Esperado:**
```
🤖→👤 [UAZAPI-WEBHOOK] Mensagem do atendente detectada via WhatsApp Web/celular
📋 [UAZAPI-WEBHOOK] Conversa encontrada: 2f65dfb2-d9dd-488f-80cd-94f0efbea182, tipo atual: human
ℹ️ [UAZAPI-WEBHOOK] Conversa já está em modo human, não precisa alterar
```

## 🔍 Como Verificar os Logs

### **Dashboard Supabase:**
1. Acesse: https://supabase.com/dashboard/project/nlbcwaxkeaddfocigwuk
2. Vá em **Edge Functions**
3. Clique em **make-server-e4f9d774**
4. Vá em **Logs**
5. Procure por logs recentes com timestamp de hoje

### **Logs da Função:**
- **Função:** make-server-e4f9d774
- **Logs de Webhook:** Procure por `UAZAPI-WEBHOOK`
- **Filtro:** Últimas 2 horas

## 📊 Critérios de Validação

### **✅ Teste PASSOU se:**
- [ ] Mensagem enviada via celular aparece no sistema
- [ ] Tipo de atendimento muda de AI para Humano
- [ ] Logs mostram detecção correta
- [ ] Segunda mensagem não tenta mudar novamente
- [ ] Não há erros nos logs

### **❌ Teste FALHOU se:**
- [ ] Mensagem não aparece no sistema
- [ ] Tipo de atendimento não muda
- [ ] Logs não mostram detecção
- [ ] Há erros nos logs
- [ ] Sistema trava ou apresenta problemas

## 🚨 Possíveis Problemas e Soluções

### **Problema 1: Mensagem não aparece**
**Possíveis Causas:**
- Webhook não está chegando
- Erro no processamento da mensagem

**Solução:**
- Verificar logs de webhook
- Confirmar se webhook está configurado na uazapi

### **Problema 2: Tipo não muda**
**Possíveis Causas:**
- Erro na consulta do banco
- Permissões insuficientes
- Campo `attendant_type` não existe

**Solução:**
- Verificar logs de erro
- Confirmar estrutura da tabela `conversations`
- Verificar permissões do service role

### **Problema 3: Logs não aparecem**
**Possíveis Causas:**
- Função não está sendo executada
- Nível de log muito restritivo
- Cache do browser

**Solução:**
- Verificar se função está ativa
- Limpar cache do browser
- Aguardar alguns minutos para logs aparecerem

## 📝 Relatório de Teste

### **Template para Preenchimento:**

```
DATA DO TESTE: _______________
CONVERSA TESTADA: 2f65dfb2-d9dd-488f-80cd-94f0efbea182

TESTE 1 - Estado Inicial:
✅/❌ Tipo inicial: _______________

TESTE 2 - Envio via Celular:
✅/❌ Mensagem apareceu no sistema
✅/❌ Tipo mudou para Humano
✅/❌ Logs mostram detecção

TESTE 3 - Segunda Mensagem:
✅/❌ Não tentou mudar novamente
✅/❌ Logs mostram estado correto

RESULTADO GERAL: ✅ PASSOU / ❌ FALHOU

OBSERVAÇÕES:
_________________________________
_________________________________
```

## 🎯 Próximos Passos

### **Se o Teste PASSOU:**
1. ✅ Funcionalidade está operacional
2. ✅ Pode ser usada em produção
3. ✅ Documentar para equipe

### **Se o Teste FALHOU:**
1. ❌ Investigar logs de erro
2. ❌ Verificar configuração do webhook
3. ❌ Validar estrutura do banco
4. ❌ Corrigir problemas identificados

## 📞 Suporte

### **Em caso de problemas:**
1. Verificar logs detalhados
2. Capturar screenshot dos logs
3. Anotar timestamp exato do erro
4. Reportar com detalhes para análise

---

**Status:** 🟢 **PRONTO PARA TESTE**  
**Versão:** 288 (23/12/2025)  
**Funcionalidade:** Detecção Automática de Mensagens Externas