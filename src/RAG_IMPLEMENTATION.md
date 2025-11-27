# ✅ Base de Conhecimento (RAG) - IMPLEMENTADO

## 🎯 O que foi feito

Sistema completo de upload e gerenciamento de documentos para o Gemini File Search RAG.

### ✅ Hooks Criados

1. **`/hooks/useRagStore.ts`**
   - Gerencia a collection (store) do agente
   - Cria automaticamente o store quando necessário
   - Busca store existente ao carregar

2. **`/hooks/useRagDocuments.ts`**
   - Lista documentos do agente
   - Atualiza lista após upload/delete
   - Ordenação por data de criação

3. **`/hooks/useRagUpload.ts`**
   - Upload de documentos com validação
   - Conversão para Base64
   - Barra de progresso (0-100%)
   - Tipos suportados: PDF, DOCX, DOC, TXT, MD, HTML, CSV, JSON, XLSX
   - Tamanho máximo: 100MB

4. **`/hooks/useRagDelete.ts`**
   - Exclusão de documentos
   - Loading state por documento
   - Confirmação antes de deletar

5. **`/hooks/useRagEnabled.ts`** 🆕
   - Gerencia estado `rag_enabled` do agente
   - Habilita/desabilita consulta à base de conhecimento
   - Toggle sem deletar documentos

### ✅ Componentes Criados

1. **`/components/RagKnowledgeBase.tsx`**
   - UI completa de drag-and-drop
   - Upload área clicável
   - Lista de documentos com status
   - Indicadores visuais:
     - ✅ **Indexado** (verde)
     - ⏳ **Processando...** (amarelo)
     - ❌ **Erro** (vermelho)
     - 🕐 **Pendente** (cinza)
   - Tamanho real dos arquivos exibido
   - Botão de deletar com loading individual
   - Suporta tema dark/light

2. **`/components/RagEnabledSwitch.tsx`** 🆕
   - Switch para habilitar/desabilitar RAG
   - Estados visuais (Ativo/Inativo)
   - Desabilitado quando não há documentos
   - Toast de feedback ao alternar
   - Loading state ao salvar

### ✅ Integração

- Substituído código antigo no `AgentConfigForm`
- Removidas importações desnecessárias
- Código modular e reutilizável
- **Switch de RAG** integrado acima da área de upload

---

## 🔀 Switch de Habilitação do RAG 🆕

### 📋 **Funcionalidade**

O sistema agora possui um **switch visual** que permite ativar/desativar a consulta à Base de Conhecimento **sem deletar documentos**!

### ✅ **Benefícios**

- 🎛️ **Controle granular** - Liga/desliga RAG por agente
- 🧪 **Teste fácil** - Compare respostas com e sem RAG
- 💾 **Preserva dados** - Documentos permanecem salvos
- ⚡ **Efeito imediato** - Mudança aplicada na próxima mensagem

### 🎨 **Visual**

```
┌──────────────────────────────────────────────────┐
│  📖 Usar Base de Conhecimento    [====●] ON     │
│  O agente consultará os documentos...           │
│  🟢 Ativo                                       │
└──────────────────────────────────────────────────┘
```

### 📖 **Documentação Completa**

Veja **[RAG_ENABLED_SWITCH.md](./RAG_ENABLED_SWITCH.md)** para:
- Como funciona
- Estrutura do banco
- Como testar
- Troubleshooting

---

## 📦 Dependência Necessária

### ⚠️ IMPORTANTE: Instalar react-dropzone

```bash
npm install react-dropzone
```

ou

```bash
yarn add react-dropzone
```

Esta biblioteca é necessária para o drag-and-drop funcionar.

---

## 🔧 Como Usar

### No Componente

```tsx
import { RagKnowledgeBase } from './components/RagKnowledgeBase';

<RagKnowledgeBase 
  agentId={agentId} 
  isDark={isDark} 
/>
```

### Fluxo Automático

1. **Ao carregar**: Busca se existe collection/store para o agente
2. **Primeiro upload**: Cria automaticamente o store (com toast de feedback)
3. **Uploads seguintes**: Usa o store existente
4. **Lista atualizada**: Após cada upload ou delete

---

## 🎨 Features Visuais

### Upload Area
- Drag-and-drop funcional
- Ou clique para selecionar arquivo
- Barra de progresso animada
- Estados visuais claros

### Lista de Documentos
- Nome do arquivo truncado se muito longo
- Tamanho em bytes/KB/MB
- Status com cores:
  - Verde: Documento indexado e pronto
  - Amarelo: Processando no Gemini
  - Vermelho: Erro no processamento
  - Cinza: Aguardando processamento
- Botão delete com confirmação
- Loading spinner individual ao deletar

### Estados Especiais
- **Sem agente salvo**: Mensagem "Salve o agente primeiro"
- **Sem documentos**: Ícone e texto explicativo
- **Loading**: Spinner animado
- **Upload em progresso**: Barra de progresso

---

## 📊 Estrutura de Dados

### Collection (Store)
```typescript
{
  id: string;
  agent_id: string;
  external_store_id: string;  // ID do Google
  name: string;
  total_documents: number;
  is_active: boolean;
}
```

### Document
```typescript
{
  id: string;
  agent_id: string;
  collection_id: string;
  title: string;
  file_type: string;
  external_file_id: string;  // ID do Google
  processing_status: 'pending' | 'processing' | 'completed' | 'failed';
  metadata: {
    original_size: number;
    mime_type: string;
  };
}
```

---

## 🔄 Endpoints Utilizados

**Base URL**: `https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/ai-rag-manage`

### Actions:
- `create_store` - Criar novo store para agente
- `upload_document` - Upload de documento em Base64
- `delete_document` - Deletar por external_file_id

### ⚠️ Importante: Delete com `force=true`

O backend **deve** usar `force=true` ao deletar no Gemini:
```
DELETE {document_name}?force=true&key={API_KEY}
```

**Por quê?** O Google Gemini indexa documentos em chunks (pedaços). Por segurança, a API não permite deletar documentos com chunks sem o `force=true`. Sem esse parâmetro, você receberá:
```
Error 400: Cannot delete non-empty Document
```

---

## ✅ Validações Implementadas

### Tipo de Arquivo
- PDF, DOCX, DOC, TXT, MD, HTML, CSV, JSON, XLSX
- Mensagem de erro clara se tipo não suportado

### Tamanho
- Máximo: 100MB
- Mostra tamanho do arquivo na mensagem de erro

### Estado do Agente
- Bloqueia upload se agente não foi salvo
- Mensagem de aviso clara

---

## 🧪 Como Testar

1. **Abrir página de configuração de agente**
2. **Salvar o agente** (se ainda não foi salvo)
3. **Arrastar um PDF** para a área de upload
4. **Verificar**:
   - Toast "Configurando base de conhecimento..." (primeira vez)
   - Barra de progresso aparece
   - Toast "Documento enviado com sucesso!"
   - Documento aparece na lista com status "Pendente"
5. **Aguardar alguns segundos** e recarregar página
6. **Verificar** se status mudou para "Indexado"
7. **Clicar no ícone de lixeira**
8. **Confirmar exclusão**
9. **Verificar** que documento foi removido

---

## 🐛 Debug & Troubleshooting

### Logs no Console
```
[useRagStore] Collection loaded: <nome>
[useRagStore] Creating new store for agent: <id>
[useRagUpload] Starting upload: <filename>
[useRagUpload] Upload successful: <filename>
[useRagDocuments] Documents loaded: <count>
[useRagDelete] Deleting document: <title>
```

### Verificar no Supabase
```sql
-- Ver collections
SELECT * FROM ai_rag_collections WHERE agent_id = '<agent_id>';

-- Ver documentos
SELECT * FROM ai_rag_documents WHERE agent_id = '<agent_id>';
```

### ❌ Erros Comuns

#### **Error 400: Cannot delete non-empty Document**
**Causa:** Backend não está usando `force=true` no delete  
**Solução:** Adicionar `?force=true` ao endpoint do Gemini:
```typescript
`${document_name}?force=true&key=${API_KEY}`
```

#### **Upload falha silenciosamente**
**Causa:** Arquivo maior que 100MB ou tipo não suportado  
**Solução:** Verificar console - deve mostrar erro de validação

#### **Documentos não aparecem na lista**
**Causa:** `agent_id` incorreto ou collection não existe  
**Solução:** Verificar console - deve mostrar "Collection loaded: None"

#### **"Salve o agente primeiro"**
**Causa:** `agentId` é `null`  
**Solução:** Salvar o agente antes de fazer upload

---

## 🎉 Melhorias vs Versão Anterior

### Antes ❌
- Código todo dentro do AgentConfigForm
- Sem drag-and-drop
- Sem barra de progresso
- Exibia "0 vetores" incorretamente
- Sem auto-criação de store
- Código não reutilizável

### Agora ✅
- Código modular (hooks + componente)
- Drag-and-drop funcional
- Barra de progresso animada
- Exibe tamanho real dos arquivos
- Cria store automaticamente
- Reutilizável em qualquer lugar
- Estados visuais claros
- Melhor UX e feedback

---

## 📝 Próximos Passos (Opcional)

- [ ] Preview de documentos ao clicar
- [ ] Editar nome/descrição do documento
- [ ] Filtros por tipo de arquivo
- [ ] Busca por nome de documento
- [ ] Upload múltiplo simultâneo
- [ ] Reprocessar documento com erro
- [ ] Estatísticas de uso (tokens, etc)

---

## ⚠️ IMPORTANTE: Integração Backend Pendente

### 🔧 O Que Falta Fazer

O **frontend está 100% pronto**, mas o **backend** precisa ser atualizado para respeitar o campo `rag_enabled`.

#### 📝 Checklist Backend

- [ ] **Verificar se coluna existe** no banco:
  ```sql
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name='ai_agents' AND column_name='rag_enabled';
  ```

- [ ] **Criar coluna se não existir**:
  ```sql
  ALTER TABLE ai_agents 
  ADD COLUMN IF NOT EXISTS rag_enabled BOOLEAN DEFAULT true;
  ```

- [ ] **Atualizar Edge Function** que processa conversações:
  ```typescript
  // Buscar agente com rag_enabled
  const agent = await supabase
    .from('ai_agents')
    .select('*, rag_enabled')
    .eq('id', agentId)
    .single();
  
  // Verificar antes de fazer RAG
  if (agent.rag_enabled && agent.rag_collection_id) {
    // Consultar Gemini File Search
    const ragResults = await searchGemini(...);
    // Adicionar ao contexto
  } else {
    console.log('[ai-process] RAG disabled for this agent');
  }
  ```

- [ ] **Adicionar logs** para debug:
  ```typescript
  console.log(`[ai-process] Agent: ${agent.name}, RAG enabled: ${agent.rag_enabled}`);
  ```

---

## 🚀 Sistema Frontend Pronto!

O sistema de RAG está **100% funcional** no frontend e integrado com Gemini File Search.
