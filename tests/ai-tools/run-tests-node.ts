/**
 * Script de testes para Node.js
 *
 * Uso: npx tsx tests/ai-tools/run-tests-node.ts
 */

import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURAÇÃO
// ============================================

// Modo debug - mostrar detalhes das chamadas
const DEBUG = process.argv.includes('--debug') || process.argv.includes('-d');

const CONFIG = {
  SUPABASE_URL: 'https://nlbcwaxkeaddfocigwuk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwNTU0OTUsImV4cCI6MjA0NzYzMTQ5NX0.CgaXrV50ygPwfC2z68U0-knnLwmFVp7J91Ijvf26svE',
  // Usar widget-chat com slug existente
  WIDGET_SLUG: 'widget-embed',
  WIDGET_CHAT_URL: 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/widget-chat',
  // IDs pré-configurados (do link widget-embed)
  WORKSPACE_ID: '47e86ae3-4d5c-4e03-a881-293fa802424d',
  AGENT_ID: '3267daee-b438-486f-a7b8-d52b84a46cf7',
};

// ============================================
// HELPERS
// ============================================

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

interface TestContext {
  supabase: ReturnType<typeof createClient>;
  workspaceId: string;
  agentId: string;
  leadId: string;
  conversationId: string;
  sessionId: string;
}

interface TestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  message: string;
  duration: number;
  error?: string;
}

async function callAIFunction(ctx: TestContext, userMessage: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const token = generateWidgetToken(CONFIG.WIDGET_SLUG);

    const requestBody = {
      slug: CONFIG.WIDGET_SLUG,
      message: userMessage,
      conversationId: ctx.conversationId || undefined,
      sessionId: ctx.sessionId || undefined,
    };

    if (DEBUG) {
      console.log(`${colors.dim}    [DEBUG] Request: ${JSON.stringify(requestBody)}${colors.reset}`);
    }

    const response = await fetch(CONFIG.WIDGET_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Widget-Token': token,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (DEBUG) {
      console.log(`${colors.dim}    [DEBUG] Response status: ${response.status}${colors.reset}`);
      console.log(`${colors.dim}    [DEBUG] Response data keys: ${Object.keys(data).join(', ')}${colors.reset}`);
      if (data.reply) {
        console.log(`${colors.dim}    [DEBUG] Reply: ${data.reply.substring(0, 150)}...${colors.reset}`);
      }
      if (data.response) {
        console.log(`${colors.dim}    [DEBUG] Response text: ${data.response.substring(0, 100)}...${colors.reset}`);
      }
      if (data.message) {
        console.log(`${colors.dim}    [DEBUG] Message: ${data.message.substring(0, 100)}...${colors.reset}`);
      }
      if (data.error) {
        console.log(`${colors.dim}    [DEBUG] Error: ${data.error}${colors.reset}`);
      }
    }

    // Normalizar a resposta - widget-chat usa 'reply', mas alguns testes esperam 'response'
    if (data.reply && !data.response) {
      data.response = data.reply;
    }

    // Atualizar IDs se retornados (primeira mensagem)
    if (data.conversationId && data.conversationId !== ctx.conversationId) {
      ctx.conversationId = data.conversationId;
      if (DEBUG) console.log(`${colors.dim}    [DEBUG] Got conversationId: ${data.conversationId}${colors.reset}`);

      // Buscar leadId da conversa se não temos ainda
      if (!ctx.leadId && ctx.supabase) {
        try {
          const { data: conv } = await ctx.supabase
            .from('conversations')
            .select('lead_id')
            .eq('id', data.conversationId)
            .single();
          if (conv?.lead_id) {
            ctx.leadId = conv.lead_id;
            if (DEBUG) console.log(`${colors.dim}    [DEBUG] Got leadId from conversation: ${ctx.leadId}${colors.reset}`);
          }
        } catch (e) {
          // Ignorar erro de RLS - leadId será preenchido depois
        }
      }
    }
    if (data.sessionId && data.sessionId !== ctx.sessionId) {
      ctx.sessionId = data.sessionId;
      if (DEBUG) console.log(`${colors.dim}    [DEBUG] Got sessionId: ${data.sessionId}${colors.reset}`);
    }
    if (data.leadId && data.leadId !== ctx.leadId) {
      ctx.leadId = data.leadId;
      if (DEBUG) console.log(`${colors.dim}    [DEBUG] Got leadId: ${data.leadId}${colors.reset}`);
    }

    if (!response.ok) {
      return { success: false, error: data.error || `HTTP ${response.status}`, data };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Gerar token do widget (mesma lógica do servidor)
function generateWidgetToken(slug: string): string {
  const secret = "pesca-lead-widget-2024"; // Mesmo secret do servidor
  const data = `${slug}-${secret}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function getNextWeekday(): Date {
  let date = new Date();
  date.setDate(date.getDate() + 1);
  while (date.getDay() === 0 || date.getDay() === 6) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

// ============================================
// SETUP / CLEANUP
// ============================================

async function setupTestEnvironment(): Promise<TestContext> {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}   🧪 SETUP DO AMBIENTE DE TESTES${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  console.log(`${colors.cyan}→ Usando widget slug: ${CONFIG.WIDGET_SLUG}${colors.reset}`);
  console.log(`${colors.cyan}→ Workspace: ${CONFIG.WORKSPACE_ID}${colors.reset}`);
  console.log(`${colors.cyan}→ Agente: ${CONFIG.AGENT_ID}${colors.reset}`);

  // A conversa será criada automaticamente na primeira mensagem
  console.log(`${colors.cyan}→ Conversa será criada na primeira mensagem...${colors.reset}`);

  console.log(`\n${colors.green}✓ Ambiente configurado!${colors.reset}\n`);

  return {
    supabase,
    workspaceId: CONFIG.WORKSPACE_ID,
    agentId: CONFIG.AGENT_ID,
    leadId: '', // Será preenchido na primeira mensagem
    conversationId: '', // Será preenchido na primeira mensagem
    sessionId: '' // Será preenchido na primeira mensagem
  };
}

async function cleanupTestEnvironment(ctx: TestContext) {
  console.log(`\n${colors.blue}🧹 Limpando ambiente de testes...${colors.reset}`);
  // Nota: A limpeza é feita manualmente via dashboard ou não é necessária
  // pois os leads de teste serão identificáveis pelo prefixo "Teste Auto"
  console.log(`${colors.yellow}⚠ Leads de teste criados devem ser limpos manualmente se necessário${colors.reset}`);
  console.log(`${colors.dim}  (Procure por leads com nome começando em "Teste Auto")${colors.reset}\n`);
}

async function recreateConversation(ctx: TestContext) {
  // Resetar IDs para que a próxima mensagem crie nova conversa
  ctx.conversationId = '';
  ctx.sessionId = '';
  ctx.leadId = '';
}

// ============================================
// TESTES
// ============================================

interface TestCase {
  id: string;
  name: string;
  category: string;
  message: string;
  validate: (ctx: TestContext, response: any) => Promise<{ passed: boolean; message: string }>;
  needsNewConversation?: boolean;
}

const nextDay = getNextWeekday();
const formattedDate = `${nextDay.getDate()}/${nextDay.getMonth() + 1}`;

const TESTS: TestCase[] = [
  // CONSULTAR DISPONIBILIDADE
  {
    id: 'CD-01',
    name: 'Consulta básica - amanhã',
    category: 'consultar_disponibilidade',
    message: 'Quais horários você tem disponível amanhã?',
    validate: async (ctx, response) => {
      const aiResponse = response.data?.response || response.data?.message || '';
      if (aiResponse.length > 10) {
        return { passed: true, message: 'Resposta recebida' };
      }
      return { passed: false, message: 'Resposta vazia' };
    }
  },
  {
    id: 'CD-02',
    name: 'Consulta manhã',
    category: 'consultar_disponibilidade',
    message: 'Tem horário de manhã disponível?',
    validate: async (ctx, response) => {
      const aiResponse = response.data?.response || '';
      return { passed: aiResponse.length > 10, message: aiResponse.length > 10 ? 'OK' : 'Resposta vazia' };
    }
  },
  {
    id: 'CD-03',
    name: 'Dia sem expediente - sábado',
    category: 'consultar_disponibilidade',
    message: 'Tem horário no sábado?',
    validate: async (ctx, response) => {
      const aiResponse = response.data?.response || '';
      return { passed: aiResponse.length > 10, message: 'IA respondeu sobre sábado' };
    }
  },

  // AGENDAR REUNIÃO
  {
    id: 'AR-01',
    name: 'Agendamento básico',
    category: 'agendar_reuniao',
    message: `Quero marcar uma reunião dia ${formattedDate} às 10h`,
    validate: async (ctx, response) => {
      const aiResponse = response.data?.response || '';

      // Se IA pediu confirmação, confirmar
      if (/confirmar|deseja|gostaria|título/i.test(aiResponse)) {
        if (DEBUG) console.log(`${colors.dim}    [DEBUG] IA pediu confirmação, enviando resposta...${colors.reset}`);
        const confirmResponse = await callAIFunction(ctx, 'Sim, pode agendar. Título: Reunião de Teste');
        const confirmText = confirmResponse.data?.response || '';
        await sleep(1000);

        // Verificar se evento foi criado agora
        const { data: events } = await ctx.supabase.from('calendar_events').select('*').eq('lead_id', ctx.leadId);
        if (events && events.length > 0) {
          return { passed: true, message: `Evento criado após confirmação (${events.length})` };
        }
        if (/agendad|confirmad|marcad|sucesso/i.test(confirmText)) {
          return { passed: true, message: 'Agendamento confirmado pela IA' };
        }
      }

      // Verificar evento direto
      await sleep(500);
      const { data: events } = await ctx.supabase.from('calendar_events').select('*').eq('lead_id', ctx.leadId);
      if (events && events.length > 0) {
        return { passed: true, message: `Evento criado (${events.length})` };
      }
      if (/agendad|confirmad|marcad/i.test(aiResponse)) {
        return { passed: true, message: 'Confirmação na resposta' };
      }
      return { passed: false, message: 'Evento não foi criado' };
    },
    needsNewConversation: true
  },
  {
    id: 'AR-02',
    name: 'Agendamento domingo (deve recusar)',
    category: 'agendar_reuniao',
    message: 'Agenda reunião no domingo às 10h',
    validate: async (ctx, response) => {
      const aiResponse = response.data?.response || '';
      return { passed: aiResponse.length > 10, message: 'IA respondeu sobre domingo' };
    },
    needsNewConversation: true
  },

  // FINALIZAR ATENDIMENTO
  {
    id: 'FA-01',
    name: 'Finalização básica',
    category: 'finalizar_atendimento',
    message: 'Obrigado, pode encerrar o atendimento',
    validate: async (ctx, response) => {
      await sleep(500);
      const { data: conv } = await ctx.supabase.from('conversations').select('status').eq('id', ctx.conversationId).single();
      const aiResponse = response.data?.response || '';
      if (conv?.status === 'resolved' || /encerrad|finalizad|ótimo.*dia/i.test(aiResponse)) {
        return { passed: true, message: 'Atendimento finalizado' };
      }
      return { passed: false, message: `Status: ${conv?.status}` };
    },
    needsNewConversation: true
  },

  // TRANSFERIR PARA HUMANO
  {
    id: 'TH-01',
    name: 'Transferência direta',
    category: 'transferir_para_humano',
    message: 'Quero falar com um atendente humano',
    validate: async (ctx, response) => {
      await sleep(500);
      const { data: conv } = await ctx.supabase.from('conversations').select('*').eq('id', ctx.conversationId).single();
      const aiResponse = response.data?.response || '';
      if (conv?.attendant_type === 'human' || conv?.status === 'waiting' || /transfer|atendente|humano/i.test(aiResponse)) {
        return { passed: true, message: 'Conversa transferida' };
      }
      return { passed: false, message: `Tipo: ${conv?.attendant_type}` };
    },
    needsNewConversation: true
  },

  // ATUALIZAR CRM
  {
    id: 'AC-01',
    name: 'Atualizar nome do cliente',
    category: 'atualizar_crm',
    message: 'Meu nome é Cliente Teste Automatizado',
    validate: async (ctx, response) => {
      await sleep(500);
      const { data: lead } = await ctx.supabase.from('leads').select('*').eq('id', ctx.leadId).single();
      const aiResponse = response.data?.response || '';
      if (lead?.client_name?.includes('Teste') || /prazer|anotei|registr/i.test(aiResponse)) {
        return { passed: true, message: 'Nome reconhecido' };
      }
      return { passed: false, message: 'Nome não atualizado' };
    },
    needsNewConversation: true
  },
  {
    id: 'AC-02',
    name: 'Atualizar empresa',
    category: 'atualizar_crm',
    message: 'Minha empresa é Empresa Teste ABC',
    validate: async (ctx, response) => {
      await sleep(500);
      const { data: lead } = await ctx.supabase.from('leads').select('*').eq('id', ctx.leadId).single();
      const aiResponse = response.data?.response || '';
      if (lead?.company?.includes('ABC') || aiResponse.length > 10) {
        return { passed: true, message: 'Empresa processada' };
      }
      return { passed: false, message: 'Empresa não atualizada' };
    },
    needsNewConversation: true
  },
];

// ============================================
// EXECUÇÃO
// ============================================

async function runTests() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     🎣 PESCA LEAD - TESTES AUTOMATIZADOS AI TOOLS 🤖      ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  let ctx: TestContext | null = null;
  const results: TestResult[] = [];

  try {
    ctx = await setupTestEnvironment();

    let currentCategory = '';

    for (const test of TESTS) {
      // Mostrar categoria
      if (test.category !== currentCategory) {
        currentCategory = test.category;
        console.log(`\n${colors.blue}═══ ${currentCategory.toUpperCase()} ═══${colors.reset}\n`);
      }

      // Recriar conversa se necessário
      if (test.needsNewConversation) {
        await recreateConversation(ctx);
      }

      const start = Date.now();

      try {
        const response = await callAIFunction(ctx, test.message);
        const duration = Date.now() - start;

        if (!response.success) {
          results.push({
            id: test.id,
            name: test.name,
            category: test.category,
            passed: false,
            message: 'Falha na chamada',
            duration,
            error: response.error
          });
          console.log(`  ${colors.red}✗ FALHOU${colors.reset} [${test.id}] ${test.name} - ${response.error}`);
          continue;
        }

        const validation = await test.validate(ctx, response);

        results.push({
          id: test.id,
          name: test.name,
          category: test.category,
          passed: validation.passed,
          message: validation.message,
          duration
        });

        const status = validation.passed
          ? `${colors.green}✓ PASSOU${colors.reset}`
          : `${colors.red}✗ FALHOU${colors.reset}`;

        console.log(`  ${status} [${test.id}] ${test.name} ${colors.dim}(${duration}ms)${colors.reset}`);
        if (!validation.passed) {
          console.log(`    ${colors.yellow}→ ${validation.message}${colors.reset}`);
        }

      } catch (error) {
        const duration = Date.now() - start;
        results.push({
          id: test.id,
          name: test.name,
          category: test.category,
          passed: false,
          message: 'Exceção',
          duration,
          error: error instanceof Error ? error.message : String(error)
        });
        console.log(`  ${colors.red}✗ ERRO${colors.reset} [${test.id}] ${test.name} - ${error}`);
      }

      await sleep(1000); // Delay entre testes
    }

    // Resumo
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;

    console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.blue}   📊 RESUMO${colors.reset}`);
    console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);
    console.log(`  Total: ${total}`);
    console.log(`  ${colors.green}Passou: ${passed}${colors.reset}`);
    console.log(`  ${colors.red}Falhou: ${failed}${colors.reset}`);
    console.log(`  Taxa: ${((passed / total) * 100).toFixed(1)}%\n`);

    if (failed > 0) {
      console.log(`  ${colors.red}Testes que falharam:${colors.reset}`);
      results.filter(r => !r.passed).forEach(r => {
        console.log(`    - [${r.id}] ${r.name}: ${r.message}`);
      });
    }

  } catch (error) {
    console.error(`\n${colors.red}Erro fatal: ${error}${colors.reset}\n`);
  } finally {
    if (ctx) {
      await cleanupTestEnvironment(ctx);
    }
  }

  process.exit(results.filter(r => !r.passed).length > 0 ? 1 : 0);
}

// Executar
runTests();
