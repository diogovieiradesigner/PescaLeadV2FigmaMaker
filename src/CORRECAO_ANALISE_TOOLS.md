# ✅ CORREÇÃO: Análise de Tools - Sistema JÁ EXISTE!

## 🎯 MEA CULPA

**EU ESTAVA ERRADO!** O sistema de seleção inteligente de atendentes **JÁ ESTÁ IMPLEMENTADO** e funcionando.

---

## ✅ O QUE JÁ EXISTE (Confirmado no Código)

### **1. Tool `transferir_para_humano` COMPLETA**

Localização: `/supabase/functions/ai-process-conversation/index.ts` - Linha 427

#### **Fluxo Existente:**

```typescript
case "transferir_para_humano": {
  // 1. Montar contexto da conversa
  const conversationContext = `Motivo: ${args.motivo}\nResumo: ${args.resumo_conversa}\nPrioridade: ${args.prioridade}`;
  
  // 2. Selecionar melhor atendente (IA analisa trigger_conditions)
  const selectionResult = await selectBestAttendant(
    supabase, 
    openrouterApiKey, 
    context.agentId, 
    conversationContext, 
    logger
  );
  
  // 3. Pegar dados do atendente selecionado
  if (selectionResult.selected) {
    attendantId = selectionResult.selected.user_id;
    attendantName = selectionResult.selected.user_name;
    messageToCustomer = selectionResult.selected.message_to_customer;
    messageToAttendant = selectionResult.selected.message_to_attendant;
  }
  
  // 4. Executar transferência
  const transferResult = await supabase.rpc('transfer_conversation_to_human', {
    p_conversation_id: context.conversationId,
    p_attendant_user_id: attendantId,
    p_reason: args.motivo,
    p_context_summary: args.resumo_conversa,
    p_message_to_customer: messageToCustomer,
    p_message_to_attendant: messageToAttendant
  });
}
```

---

### **2. Função `selectBestAttendant` (Seleção Inteligente)**

Localização: Linha 125-170

#### **Como Funciona:**

```typescript
async function selectBestAttendant(supabase, openrouterApiKey, agentId, conversationContext, logger) {
  // 1. Busca atendentes configurados
  const { data: attendants } = await supabase.rpc("get_agent_attendants", { 
    p_agent_id: agentId 
  });
  
  // 2. Se não tem atendentes → transferência genérica
  if (!attendants || attendants.length === 0) {
    return { selected: null, reason: "no_attendants" };
  }
  
  // 3. Se tem apenas 1 atendente → seleciona automaticamente
  if (attendants.length === 1) {
    return { selected: attendants[0], reason: "single_attendant" };
  }
  
  // 4. Se tem múltiplos → usa LLM para escolher baseado em trigger_conditions
  const attendantOptions = attendants.map((a, idx) => ({
    index: idx + 1,
    name: a.user_name,
    user_id: a.user_id,
    trigger_conditions: a.trigger_conditions || "Sem condição específica"
  }));
  
  const selectionPrompt = `
    Você é um roteador de atendimento. 
    Analise o contexto da conversa e escolha o melhor atendente.
    
    CONTEXTO DA CONVERSA:
    ${conversationContext}
    
    ATENDENTES DISPONÍVEIS:
    ${attendantOptions.map(a => 
      `${a.index}. ${a.name}\n   Condição: ${a.trigger_conditions}`
    ).join('\n\n')}
    
    Responda APENAS com JSON:
    {"selected_index": <número>, "reasoning": "<breve justificativa>"}
  `;
  
  // Chama LLM (gpt-4o-mini) para decidir
  const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + openrouterApiKey
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [{ role: "user", content: selectionPrompt }],
      max_tokens: 150,
      temperature: 0.1
    })
  });
  
  // Parse resposta e retorna atendente selecionado
  const result = await llmResponse.json();
  const responseText = result.choices[0]?.message?.content || "";
  const parsed = JSON.parse(responseText);
  const selectedIndex = parsed.selected_index - 1;
  const reasoning = parsed.reasoning;
  
  return { 
    selected: attendants[selectedIndex],
    reason: "ai_selected",
    reasoning: reasoning,
    tokensUsed: tokensIn + tokensOut
  };
}
```

---

### **3. RPC `get_agent_attendants`**

Já existe no banco! Retorna:
- `user_id` - ID do atendente
- `user_name` - Nome do atendente
- `user_email` - Email
- `user_phone` - Telefone
- `trigger_conditions` - Condições para quando acionar (analisadas pela IA)
- `message_to_customer` - Mensagem personalizada para o cliente
- `message_to_attendant` - Mensagem personalizada para o atendente
- `priority` - Prioridade de seleção

---

### **4. RPC `transfer_conversation_to_human`**

Já existe! Faz:
1. ✅ Atualiza `conversations.attendant_type` → `'human'`
2. ✅ Atualiza `conversations.assigned_to` → ID do atendente
3. ✅ Atualiza `conversations.assigned_at` → timestamp
4. ✅ Atualiza `conversations.assigned_by` → `'ai'`
5. ✅ Encerra sessão IA com status `'transferred'`
6. ✅ **Cria notificação para o atendente** 🔔

---

## 🔍 ENTÃO QUAL É O PROBLEMA?

Se tudo já existe, por que a IA não está usando?

### **Possíveis Causas:**

### **1. ⚠️ Tool não está cadastrada no `get_agent_tools`**

A edge function busca as tools assim:
```typescript
const { data: tools } = await supabase.rpc("get_agent_tools", { p_agent_id: payload.agent_id });
```

**Verificar:**
- [ ] A função RPC `get_agent_tools` existe?
- [ ] Ela retorna a tool `transferir_para_humano` no formato correto?
- [ ] O schema da tool está completo (name, description, parameters)?

---

### **2. ⚠️ Prompt do agente não é claro o suficiente**

A IA precisa saber:
- **Quando** usar a tool
- **Como** preencher os parâmetros
- **Exemplos** práticos

**Prompt ruim:**
```
Você pode transferir para humano quando necessário.
```

**Prompt bom:**
```
=== TRANSFERÊNCIA PARA HUMANO ===

QUANDO TRANSFERIR:
✅ Cliente pede explicitamente para falar com humano
✅ Cliente está muito insatisfeito ou irritado
✅ Reclamação grave que você não consegue resolver
✅ Situação complexa fora do seu conhecimento
✅ Cliente menciona cancelamento ou desistência

QUANDO NÃO TRANSFERIR:
❌ Perguntas simples que você pode responder
❌ Apenas para confirmar informações
❌ Como primeira resposta sem tentar ajudar

COMO USAR A TOOL:
transferir_para_humano({
  "motivo": "Cliente solicitou atendimento humano",
  "resumo_conversa": "Cliente perguntou sobre [X], eu respondi [Y], ele pediu para falar com atendente",
  "prioridade": "high"  // ou "urgent" se for muito grave
})

IMPORTANTE: Após transferir, confirme ao cliente que um atendente vai responder.
```

---

### **3. ⚠️ Modelo da IA não suporta function calling bem**

Alguns modelos não chamam tools corretamente.

**Modelos bons para function calling:**
- ✅ `gpt-4o` (melhor)
- ✅ `gpt-4o-mini` (mais barato)
- ✅ `anthropic/claude-3.5-sonnet` (muito bom)
- ✅ `anthropic/claude-3-haiku` (barato e bom)

**Modelos ruins:**
- ❌ Modelos mais antigos
- ❌ Alguns modelos open-source

---

### **4. ⚠️ Atendentes não estão configurados**

Se `get_agent_attendants` retorna vazio, a transferência será **genérica** (sem atendente específico).

**Verificar:**
- [ ] Existe tabela de atendentes vinculada ao agente?
- [ ] Os atendentes têm `trigger_conditions` definidas?
- [ ] As mensagens personalizadas estão cadastradas?

---

## 🎯 PLANO DE AÇÃO CORRIGIDO

### **PASSO 1: Verificar RPC `get_agent_tools`**

```sql
-- Testar no SQL Editor do Supabase
SELECT * FROM get_agent_tools('seu-agent-id-aqui');
```

**Resultado esperado:**
```json
[
  {
    "type": "function",
    "function": {
      "name": "transferir_para_humano",
      "description": "Transfere a conversa para um atendente humano quando o cliente solicita ou em situações que exigem atenção humana",
      "parameters": {
        "type": "object",
        "properties": {
          "motivo": {
            "type": "string",
            "description": "Motivo da transferência (ex: 'Cliente solicitou atendimento humano')"
          },
          "resumo_conversa": {
            "type": "string",
            "description": "Breve resumo do que foi conversado até agora"
          },
          "prioridade": {
            "type": "string",
            "enum": ["low", "normal", "high", "urgent"],
            "description": "Nível de urgência da transferência"
          }
        },
        "required": ["motivo", "resumo_conversa"]
      }
    }
  },
  {
    "type": "function",
    "function": {
      "name": "finalizar_atendimento",
      // ...
    }
  },
  {
    "type": "function",
    "function": {
      "name": "atualizar_crm",
      // ...
    }
  }
]
```

Se não retornar nada ou estiver incompleto → **ESSE É O PROBLEMA!**

---

### **PASSO 2: Verificar `get_agent_attendants`**

```sql
-- Testar no SQL Editor
SELECT * FROM get_agent_attendants('seu-agent-id-aqui');
```

**Resultado esperado:**
```json
[
  {
    "user_id": "abc-123",
    "user_name": "João Silva",
    "user_email": "joao@example.com",
    "user_phone": "5521999999999",
    "trigger_conditions": "Transferir quando cliente mencionar vendas ou orçamento",
    "message_to_customer": "Um momento, estou transferindo você para nosso time de vendas!",
    "message_to_attendant": "Novo cliente interessado em orçamento. Favor atender.",
    "priority": 1
  }
]
```

Se retornar vazio → Transferência será genérica (sem notificação personalizada)

---

### **PASSO 3: Melhorar o Prompt**

Adicionar seção detalhada no `system_prompt` do agente explicando:
1. Quando usar `transferir_para_humano`
2. Como preencher os parâmetros
3. Exemplos práticos
4. O que dizer ao cliente após transferir

---

### **PASSO 4: Testar no Preview Mode**

1. Abrir conversa no modo preview
2. Enviar: "Quero falar com um atendente humano"
3. Ver nos logs do pipeline se a tool foi chamada
4. Verificar se atendente foi selecionado corretamente

---

## 🔧 SE PRECISAR CRIAR A RPC `get_agent_tools`

```sql
CREATE OR REPLACE FUNCTION get_agent_tools(p_agent_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN jsonb_build_array(
    -- Tool 1: Transferir para Humano
    jsonb_build_object(
      'type', 'function',
      'function', jsonb_build_object(
        'name', 'transferir_para_humano',
        'description', 'Transfere a conversa para um atendente humano quando o cliente solicita ou em situações que exigem atenção humana. Use quando: cliente pede explicitamente, reclamação grave, situação complexa, cliente muito insatisfeito.',
        'parameters', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object(
            'motivo', jsonb_build_object(
              'type', 'string',
              'description', 'Motivo claro da transferência (ex: "Cliente solicitou falar com gerente")'
            ),
            'resumo_conversa', jsonb_build_object(
              'type', 'string',
              'description', 'Resumo breve do que foi conversado até agora para contexto do atendente'
            ),
            'prioridade', jsonb_build_object(
              'type', 'string',
              'enum', jsonb_build_array('low', 'normal', 'high', 'urgent'),
              'description', 'Urgência: urgent (pediu humano/reclamação grave), high (insatisfeito), normal (oportunidade), low (informativo)'
            )
          ),
          'required', jsonb_build_array('motivo', 'resumo_conversa')
        )
      )
    ),
    
    -- Tool 2: Finalizar Atendimento
    jsonb_build_object(
      'type', 'function',
      'function', jsonb_build_object(
        'name', 'finalizar_atendimento',
        'description', 'Marca o atendimento como concluído quando a demanda do cliente foi totalmente resolvida',
        'parameters', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object(
            'resumo', jsonb_build_object(
              'type', 'string',
              'description', 'Resumo do que foi resolvido no atendimento'
            )
          ),
          'required', jsonb_build_array('resumo')
        )
      )
    ),
    
    -- Tool 3: Atualizar CRM
    jsonb_build_object(
      'type', 'function',
      'function', jsonb_build_object(
        'name', 'atualizar_crm',
        'description', 'Atualiza informações do lead no CRM quando o cliente fornece dados importantes durante a conversa',
        'parameters', jsonb_build_object(
          'type', 'object',
          'properties', jsonb_build_object(
            'campo', jsonb_build_object(
              'type', 'string',
              'description', 'Nome do campo a atualizar (ex: "empresa", "cargo", "telefone")'
            ),
            'valor', jsonb_build_object(
              'type', 'string',
              'description', 'Novo valor para o campo'
            ),
            'observacao', jsonb_build_object(
              'type', 'string',
              'description', 'Observação adicional sobre a atualização (opcional)'
            )
          ),
          'required', jsonb_build_array('campo', 'valor')
        )
      )
    )
  );
END;
$$;
```

---

## ✅ RESUMO DA CORREÇÃO

### **O que EU errei:**
❌ Disse que a tool de transferência não existia  
❌ Sugeri criar do zero algo que já estava pronto  
❌ Não verifiquei a função `selectBestAttendant` antes  

### **O que REALMENTE existe:**
✅ Tool `transferir_para_humano` completa e funcional  
✅ Seleção inteligente de atendentes via IA (`selectBestAttendant`)  
✅ RPC `get_agent_attendants` para buscar atendentes  
✅ RPC `transfer_conversation_to_human` para executar transferência  
✅ Sistema de notificações já integrado  

### **Problema real (provavelmente):**
⚠️ RPC `get_agent_tools` não existe ou está incompleta  
⚠️ Prompt do agente não explica como usar a tool  
⚠️ Atendentes não estão configurados no banco  

---

**Próximo passo:** Verificar se `get_agent_tools` existe e retorna as tools corretamente!
