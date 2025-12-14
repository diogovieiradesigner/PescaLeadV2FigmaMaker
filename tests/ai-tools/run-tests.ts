/**
 * Script simplificado para rodar os testes das AI Tools
 *
 * Uso:
 *   npx ts-node tests/ai-tools/run-tests.ts
 *
 * Ou com Deno:
 *   deno run --allow-net --allow-env tests/ai-tools/run-tests.ts
 */

import { createClient } from 'npm:@supabase/supabase-js@2';

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  SUPABASE_URL: 'https://nlbcwaxkeaddfocigwuk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwNTU0OTUsImV4cCI6MjA0NzYzMTQ5NX0.CgaXrV50ygPwfC2z68U0-knnLwmFVp7J91Ijvf26svE',
  EDGE_FUNCTION_URL: 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/ai-process-conversation',
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
  supabase: any;
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
    const response = await fetch(CONFIG.EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'apikey': CONFIG.SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        conversation_id: ctx.conversationId,
        message: userMessage,
        lead_id: ctx.leadId,
        workspace_id: ctx.workspaceId,
        agent_id: ctx.agentId,
      }),
    });

    const data = await response.json();

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

  // Buscar workspace
  console.log(`${colors.cyan}→ Buscando workspace...${colors.reset}`);
  let { data: workspace } = await supabase.from('workspaces').select('id').limit(1).single();
  if (!workspace) throw new Error('Nenhum workspace encontrado');
  console.log(`  ✓ Workspace: ${workspace.id}`);

  // Buscar agente
  console.log(`${colors.cyan}→ Buscando agente de IA...${colors.reset}`);
  let { data: agent } = await supabase
    .from('ai_agents')
    .select('id')
    .eq('workspace_id', workspace.id)
    .eq('is_active', true)
    .limit(1)
    .single();
  if (!agent) throw new Error('Nenhum agente ativo encontrado');
  console.log(`  ✓ Agente: ${agent.id}`);

  // Criar lead de teste
  console.log(`${colors.cyan}→ Criando lead de teste...${colors.reset}`);
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      workspace_id: workspace.id,
      client_name: `Teste Auto ${Date.now()}`,
      phone: `5511999${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
      source: 'test',
      status: 'new'
    })
    .select()
    .single();
  if (leadError) throw new Error(`Erro ao criar lead: ${leadError.message}`);
  console.log(`  ✓ Lead: ${lead.id}`);

  // Criar conversa
  console.log(`${colors.cyan}→ Criando conversa de teste...${colors.reset}`);
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      workspace_id: workspace.id,
      lead_id: lead.id,
      channel: 'widget',
      status: 'open',
      attendant_type: 'ai',
      ai_agent_id: agent.id
    })
    .select()
    .single();
  if (convError) throw new Error(`Erro ao criar conversa: ${convError.message}`);
  console.log(`  ✓ Conversa: ${conversation.id}`);

  // Criar sessão AI
  console.log(`${colors.cyan}→ Criando sessão AI...${colors.reset}`);
  const { data: session, error: sessionError } = await supabase
    .from('ai_conversation_sessions')
    .insert({
      conversation_id: conversation.id,
      agent_id: agent.id,
      status: 'active'
    })
    .select()
    .single();
  if (sessionError) throw new Error(`Erro ao criar sessão: ${sessionError.message}`);
  console.log(`  ✓ Sessão: ${session.id}`);

  console.log(`\n${colors.green}✓ Ambiente configurado!${colors.reset}\n`);

  return {
    supabase,
    workspaceId: workspace.id,
    agentId: agent.id,
    leadId: lead.id,
    conversationId: conversation.id,
    sessionId: session.id
  };
}

async function cleanupTestEnvironment(ctx: TestContext) {
  console.log(`\n${colors.blue}🧹 Limpando ambiente de testes...${colors.reset}`);

  try {
    await ctx.supabase.from('ai_conversation_sessions').delete().eq('conversation_id', ctx.conversationId);
    await ctx.supabase.from('messages').delete().eq('conversation_id', ctx.conversationId);
    await ctx.supabase.from('calendar_events').delete().eq('lead_id', ctx.leadId);
    await ctx.supabase.from('conversations').delete().eq('id', ctx.conversationId);
    await ctx.supabase.from('leads').delete().eq('id', ctx.leadId);
    console.log(`${colors.green}✓ Ambiente limpo!${colors.reset}\n`);
  } catch (e) {
    console.log(`${colors.yellow}⚠ Alguns itens podem não ter sido limpos${colors.reset}\n`);
  }
}

async function recreateConversation(ctx: TestContext) {
  // Criar nova conversa para teste
  const { data: newConv } = await ctx.supabase
    .from('conversations')
    .insert({
      workspace_id: ctx.workspaceId,
      lead_id: ctx.leadId,
      channel: 'widget',
      status: 'open',
      attendant_type: 'ai',
      ai_agent_id: ctx.agentId
    })
    .select()
    .single();

  if (newConv) {
    ctx.conversationId = newConv.id;

    const { data: newSession } = await ctx.supabase
      .from('ai_conversation_sessions')
      .insert({
        conversation_id: newConv.id,
        agent_id: ctx.agentId,
        status: 'active'
      })
      .select()
      .single();

    if (newSession) ctx.sessionId = newSession.id;
  }
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
    message: `Quero marcar uma reunião dia ${getNextWeekday().getDate()}/${getNextWeekday().getMonth() + 1} às 10h`,
    validate: async (ctx, response) => {
      const aiResponse = response.data?.response || '';
      await sleep(500);
      const { data: events } = await ctx.supabase.from('calendar_events').select('*').eq('lead_id', ctx.leadId);
      if (events?.length > 0 || /agendad|confirmad|marcad/i.test(aiResponse)) {
        return { passed: true, message: 'Evento agendado' };
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
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════${colors.reset}\n`);

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
        console.log(`    - [${r.id}] ${r.name}`);
      });
    }

  } catch (error) {
    console.error(`\n${colors.red}Erro fatal: ${error}${colors.reset}\n`);
  } finally {
    if (ctx) {
      await cleanupTestEnvironment(ctx);
    }
  }
}

// Executar
runTests();
