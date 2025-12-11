# 🎨 Prompt para Figma Maker: Alterar Coluna dos Leads Extraídos

## 📋 Contexto da Funcionalidade

**Objetivo:** Permitir que o usuário altere a coluna (e opcionalmente o kanban) dos leads que já foram extraídos em uma execução de extração específica.

**Cenário de Uso:**
- Usuário executou uma extração e os leads foram criados em uma coluna específica
- Usuário quer mover esses leads para outra coluna do mesmo kanban ou para outro kanban
- Processamento acontece de forma assíncrona para evitar timeouts com grandes volumes

---

## 🎯 Requisitos da Interface

### **1. Localização da Funcionalidade**

**Onde adicionar:**
- Na tela de **detalhes da execução de extração** (run)
- Botão/ação: **"Alterar Coluna dos Leads"** ou **"Mover Leads"**
- Posicionar próximo às informações da execução (status, quantidade de leads, etc.)

**Contexto visual:**
- A execução mostra informações como:
  - Nome da extração
  - Data/hora de execução
  - Status (em andamento, concluída, falhou)
  - Quantidade de leads extraídos
  - Kanban e coluna atual onde os leads estão

---

### **2. Componente: Modal de Alteração de Coluna**

**Estrutura do Modal:**

```
┌─────────────────────────────────────────────────────────┐
│  Alterar Coluna dos Leads Extraídos              [X]   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  📊 Informações da Execução                            │
│  ──────────────────────────────────────                │
│  Extração: Restaurantes - 10/12/2025 09:07            │
│  Total de leads: 478                                    │
│  Kanban atual: teste                                   │
│  Coluna atual: Novo Lead                               │
│                                                         │
│  🎯 Nova Configuração                                  │
│  ──────────────────────────────────────                │
│                                                         │
│  Kanban: [Dropdown: Selecionar Kanban ▼]              │
│  └─ Emails Gih                                         │
│  └─ teste                                              │
│  └─ Outros kanbans...                                  │
│                                                         │
│  Coluna: [Dropdown: Selecionar Coluna ▼]              │
│  └─ Novo                                               │
│  └─ Contato Inicial                                    │
│  └─ Proposta                                           │
│  └─ Negociação                                         │
│  └─ Fechado                                            │
│                                                         │
│  ⚠️ Aviso                                              │
│  ──────────────────────────────────────                │
│  Esta ação moverá todos os 478 leads desta execução   │
│  para a coluna selecionada. O processamento pode       │
│  levar alguns minutos para grandes volumes.           │
│                                                         │
│  [Cancelar]                    [Confirmar Movimentação]│
└─────────────────────────────────────────────────────────┘
```

---

### **3. Detalhamento dos Elementos**

#### **A. Cabeçalho do Modal**
- **Título:** "Alterar Coluna dos Leads Extraídos"
- **Ícone:** Ícone de movimento/transferência (setas ou drag)
- **Botão fechar:** X no canto superior direito

#### **B. Seção: Informações da Execução**
- **Layout:** Cards ou seção destacada com fundo sutil
- **Informações exibidas:**
  - Nome da extração (ex: "Restaurantes - 10/12/2025 09:07")
  - Total de leads extraídos (número destacado)
  - Kanban atual (nome do kanban)
  - Coluna atual (nome da coluna)
- **Visual:** Informações em formato de lista ou cards pequenos

#### **C. Seção: Nova Configuração**

**Dropdown de Kanban:**
- **Label:** "Kanban"
- **Placeholder:** "Selecione um kanban"
- **Comportamento:**
  - Lista todos os kanbans disponíveis do workspace
  - Mostra nome do kanban
  - Opcional: mostrar quantidade de leads no kanban
- **Valor padrão:** Kanban atual (selecionado por padrão)

**Dropdown de Coluna:**
- **Label:** "Coluna"
- **Placeholder:** "Selecione uma coluna"
- **Comportamento:**
  - Lista colunas do kanban selecionado
  - Atualiza dinamicamente quando kanban muda
  - Mostra nome da coluna
  - Opcional: mostrar quantidade de leads na coluna
- **Valor padrão:** Coluna atual (selecionado por padrão)

**Validação visual:**
- Se usuário selecionar mesmo kanban e mesma coluna → mostrar aviso: "Os leads já estão nesta coluna"
- Desabilitar botão "Confirmar" se seleção for igual à atual

#### **D. Seção: Aviso/Informação**
- **Ícone:** ⚠️ ou ℹ️
- **Mensagem:** 
  - Informar quantidade total de leads que serão movidos
  - Avisar que processamento é assíncrono
  - Informar tempo estimado (ex: "Pode levar 1-2 minutos para 500 leads")
- **Visual:** Caixa de aviso com fundo amarelo claro ou azul claro

#### **E. Botões de Ação**
- **Cancelar:**
  - Estilo: Botão secundário/outline
  - Posição: Esquerda
  - Ação: Fechar modal sem alterações

- **Confirmar Movimentação:**
  - Estilo: Botão primário (cor destacada)
  - Posição: Direita
  - Estado inicial: Habilitado (se validação passar)
  - Ação: Enviar requisição para API

---

### **4. Estados da Interface**

#### **Estado Inicial (Modal Aberto)**
- Dropdowns carregados com valores atuais
- Botão "Confirmar" habilitado (se seleção diferente)
- Aviso mostrando quantidade de leads

#### **Estado: Processando**
- **Após clicar em "Confirmar":**
  - Botão "Confirmar" muda para "Processando..." e fica desabilitado
  - Mostrar spinner/loading
  - Modal não fecha automaticamente
  - Mostrar mensagem: "Movimentação enfileirada. Processando..."

#### **Estado: Sucesso**
- **Após processamento:**
  - Mostrar mensagem de sucesso: "✅ 478 leads movidos com sucesso!"
  - Botão "Confirmar" muda para "Concluído" (verde)
  - Opcional: Botão "Fechar" para fechar modal
  - Auto-fechar após 3 segundos

#### **Estado: Erro**
- **Se houver erro:**
  - Mostrar mensagem de erro em vermelho
  - Botão "Confirmar" volta ao estado normal
  - Permitir tentar novamente

---

### **5. Feedback Visual Durante Processamento**

**Opção 1: Barra de Progresso**
```
Processando movimentação...
[████████░░░░░░░░░░] 60% (287/478 leads movidos)
```

**Opção 2: Contador Atualizado**
```
✅ 287 leads movidos
⏳ 191 leads restantes
```

**Opção 3: Status Simples**
```
⏳ Processando... Isso pode levar alguns minutos.
```

---

### **6. Integração com API**

**Endpoint a ser chamado:**
```
POST /functions/v1/make-server-e4f9d774
```

**Payload:**
```json
{
  "action": "queue_lead_migration",
  "run_id": "uuid-da-execucao",
  "funnel_id": "uuid-do-kanban",
  "column_id": "uuid-da-coluna"
}
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message_id": 12345,
  "run_id": "uuid",
  "run_name": "Restaurantes - 10/12/2025 09:07",
  "message": "Movimentação enfileirada: 478 leads serão movidos"
}
```

**Resposta de Erro:**
```json
{
  "success": false,
  "error": "Run não encontrada"
}
```

---

### **7. Requisitos de UX**

#### **Acessibilidade:**
- Labels claros para todos os campos
- Suporte a navegação por teclado (Tab, Enter, Esc)
- Foco visual nos elementos interativos
- Contraste adequado de cores

#### **Responsividade:**
- Modal responsivo para mobile
- Dropdowns adaptáveis em telas pequenas
- Botões com tamanho adequado para touch

#### **Microinterações:**
- Animação suave ao abrir/fechar modal
- Feedback visual ao selecionar dropdowns
- Hover states nos botões
- Transições suaves entre estados

---

### **8. Casos de Uso Especiais**

#### **Caso 1: Execução em Andamento**
- Se execução ainda está em andamento:
  - Mostrar aviso: "Esta execução ainda está em andamento. Apenas leads já extraídos serão movidos."
  - Permitir movimentação parcial

#### **Caso 2: Muitos Leads**
- Se quantidade > 1000 leads:
  - Aviso mais destacado sobre tempo de processamento
  - Opcional: Permitir cancelar processamento (se ainda não iniciado)

#### **Caso 3: Leads Já Movidos**
- Se leads já foram movidos anteriormente:
  - Mostrar histórico: "Última movimentação: 10/12/2025 14:30"
  - Permitir nova movimentação

---

### **9. Paleta de Cores Sugerida**

- **Modal background:** Branco (#FFFFFF)
- **Botão primário:** Azul primário do sistema
- **Botão secundário:** Cinza claro (#E5E7EB)
- **Aviso:** Amarelo claro (#FEF3C7) ou Azul claro (#DBEAFE)
- **Erro:** Vermelho claro (#FEE2E2)
- **Sucesso:** Verde claro (#D1FAE5)
- **Texto:** Cinza escuro (#1F2937)

---

### **10. Ícones Sugeridos**

- **Título do modal:** `↔️` ou `📦` ou `🔄`
- **Informações:** `📊` ou `ℹ️`
- **Aviso:** `⚠️` ou `ℹ️`
- **Sucesso:** `✅`
- **Erro:** `❌`
- **Processando:** `⏳` ou spinner animado

---

## 📝 Checklist de Implementação

- [ ] Modal com estrutura completa
- [ ] Dropdown de kanban funcional
- [ ] Dropdown de coluna dinâmico (atualiza com kanban)
- [ ] Validação de seleção (não permitir mesma coluna)
- [ ] Seção de informações da execução
- [ ] Aviso sobre quantidade de leads
- [ ] Estados: inicial, processando, sucesso, erro
- [ ] Feedback visual durante processamento
- [ ] Integração com API
- [ ] Responsividade mobile
- [ ] Acessibilidade (teclado, foco, contraste)
- [ ] Microinterações e animações
- [ ] Tratamento de erros
- [ ] Mensagens de sucesso/erro

---

## 🎯 Resultado Esperado

Uma interface intuitiva e clara que permite ao usuário:
1. Visualizar informações da execução atual
2. Selecionar novo kanban e coluna facilmente
3. Entender o impacto da ação (quantidade de leads)
4. Confirmar a movimentação com segurança
5. Acompanhar o progresso do processamento
6. Receber feedback claro sobre sucesso ou erro

---

## 📌 Notas Adicionais

- **Performance:** Dropdowns devem carregar rapidamente (considerar cache de kanbans/colunas)
- **Segurança:** Validar permissões do usuário antes de permitir movimentação
- **Histórico:** Considerar mostrar histórico de movimentações anteriores (futuro)
- **Bulk Actions:** Considerar permitir selecionar múltiplas execuções para movimentação em massa (futuro)

