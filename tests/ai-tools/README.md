# Testes Automatizados - AI Tools

Sistema de testes automatizados para validar as ferramentas do agente de IA do Pesca Lead.

## Como Executar

### Usando Deno (Recomendado)

```bash
# Instalar Deno se não tiver
# Windows (PowerShell):
irm https://deno.land/install.ps1 | iex

# Executar testes
deno run --allow-net tests/ai-tools/run-tests.ts
```

### Usando Node.js com tsx

```bash
# Instalar tsx globalmente
npm install -g tsx

# Executar
tsx tests/ai-tools/run-tests.ts
```

## Estrutura dos Testes

```
tests/ai-tools/
├── run-tests.ts          # Script principal (simplificado)
├── test-config.ts        # Configurações
├── test-helpers.ts       # Funções auxiliares
├── test-runner.ts        # Runner completo (Deno)
└── tests/
    ├── consultar-disponibilidade.ts
    ├── agendar-reuniao.ts
    ├── finalizar-atendimento.ts
    ├── transferir-para-humano.ts
    └── atualizar-crm.ts
```

## Testes Incluídos

### consultar_disponibilidade (3 testes)
- CD-01: Consulta básica - amanhã
- CD-02: Consulta manhã
- CD-03: Dia sem expediente - sábado

### agendar_reuniao (2 testes)
- AR-01: Agendamento básico
- AR-02: Agendamento domingo (deve recusar)

### finalizar_atendimento (1 teste)
- FA-01: Finalização básica

### transferir_para_humano (1 teste)
- TH-01: Transferência direta

### atualizar_crm (2 testes)
- AC-01: Atualizar nome do cliente
- AC-02: Atualizar empresa

## O que os Testes Fazem

1. **Setup**: Cria um lead e conversa de teste temporários
2. **Execução**: Envia mensagens para a Edge Function de IA
3. **Validação**: Verifica respostas e estado do banco de dados
4. **Cleanup**: Remove todos os dados de teste criados

## Exemplo de Output

```
╔═══════════════════════════════════════════════════════════╗
║     🎣 PESCA LEAD - TESTES AUTOMATIZADOS AI TOOLS 🤖      ║
╚═══════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════
   🧪 SETUP DO AMBIENTE DE TESTES
═══════════════════════════════════════════════════════════

→ Buscando workspace...
  ✓ Workspace: abc-123
→ Buscando agente de IA...
  ✓ Agente: def-456
→ Criando lead de teste...
  ✓ Lead: ghi-789
...

═══ CONSULTAR_DISPONIBILIDADE ═══

  ✓ PASSOU [CD-01] Consulta básica - amanhã (1234ms)
  ✓ PASSOU [CD-02] Consulta manhã (987ms)
  ✓ PASSOU [CD-03] Dia sem expediente - sábado (1100ms)

═══ AGENDAR_REUNIAO ═══

  ✓ PASSOU [AR-01] Agendamento básico (2345ms)
  ✓ PASSOU [AR-02] Agendamento domingo (1567ms)

...

═══════════════════════════════════════════════════════════
   📊 RESUMO
═══════════════════════════════════════════════════════════

  Total: 9
  Passou: 8
  Falhou: 1
  Taxa: 88.9%
```

## Adicionando Novos Testes

Para adicionar um novo teste, edite o array `TESTS` em `run-tests.ts`:

```typescript
{
  id: 'XX-01',
  name: 'Nome do teste',
  category: 'nome_da_tool',
  message: 'Mensagem enviada para a IA',
  validate: async (ctx, response) => {
    // Validação personalizada
    const aiResponse = response.data?.response || '';
    if (/* condição de sucesso */) {
      return { passed: true, message: 'Sucesso' };
    }
    return { passed: false, message: 'Falhou' };
  },
  needsNewConversation: true // Se precisa criar nova conversa
}
```

## Notas

- Os testes usam a Edge Function real, não mocks
- Cada teste cria dados temporários que são limpos ao final
- O tempo de execução depende da latência da API da OpenAI
- Recomenda-se executar em horários de baixo uso
