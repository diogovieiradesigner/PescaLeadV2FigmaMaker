/**
 * Test Runner - Executa todos os testes das AI Tools
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CONFIG, TestResult, TestContext, TestCase } from './test-config.ts';

// Importar testes
import { consultar_disponibilidade_tests } from './tests/consultar-disponibilidade.ts';
import { agendar_reuniao_tests } from './tests/agendar-reuniao.ts';
import { finalizar_atendimento_tests } from './tests/finalizar-atendimento.ts';
import { transferir_para_humano_tests } from './tests/transferir-para-humano.ts';
import { atualizar_crm_tests } from './tests/atualizar-crm.ts';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
};

async function setupTestEnvironment(): Promise<TestContext> {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}   🧪 SETUP DO AMBIENTE DE TESTES${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  // Buscar workspace de teste existente ou criar um
  console.log(`${colors.cyan}→ Buscando workspace de teste...${colors.reset}`);

  let { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .limit(1)
    .single();

  if (!workspace) {
    throw new Error('Nenhum workspace encontrado. Crie um workspace primeiro.');
  }

  const workspaceId = workspace.id;
  console.log(`  ✓ Workspace: ${workspaceId}`);

  // Buscar agente de IA existente
  console.log(`${colors.cyan}→ Buscando agente de IA...${colors.reset}`);

  let { data: agent } = await supabase
    .from('ai_agents')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!agent) {
    throw new Error('Nenhum agente de IA ativo encontrado.');
  }

  const agentId = agent.id;
  console.log(`  ✓ Agente: ${agentId}`);

  // Criar lead de teste
  console.log(`${colors.cyan}→ Criando lead de teste...${colors.reset}`);

  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .insert({
      workspace_id: workspaceId,
      client_name: `Teste Automatizado ${Date.now()}`,
      phone: `5511999${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
      source: 'test',
      status: 'new'
    })
    .select()
    .single();

  if (leadError) {
    throw new Error(`Erro ao criar lead: ${leadError.message}`);
  }

  const leadId = lead.id;
  console.log(`  ✓ Lead: ${leadId}`);

  // Criar conversa de teste
  console.log(`${colors.cyan}→ Criando conversa de teste...${colors.reset}`);

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      workspace_id: workspaceId,
      lead_id: leadId,
      channel: 'widget',
      status: 'open',
      attendant_type: 'ai',
      ai_agent_id: agentId
    })
    .select()
    .single();

  if (convError) {
    throw new Error(`Erro ao criar conversa: ${convError.message}`);
  }

  const conversationId = conversation.id;
  console.log(`  ✓ Conversa: ${conversationId}`);

  // Criar sessão AI
  console.log(`${colors.cyan}→ Criando sessão AI...${colors.reset}`);

  const { data: session, error: sessionError } = await supabase
    .from('ai_conversation_sessions')
    .insert({
      conversation_id: conversationId,
      agent_id: agentId,
      status: 'active'
    })
    .select()
    .single();

  if (sessionError) {
    throw new Error(`Erro ao criar sessão: ${sessionError.message}`);
  }

  const sessionId = session.id;
  console.log(`  ✓ Sessão AI: ${sessionId}`);

  console.log(`\n${colors.green}✓ Ambiente de teste configurado com sucesso!${colors.reset}\n`);

  return {
    supabase,
    workspaceId,
    agentId,
    leadId,
    conversationId,
    sessionId
  };
}

async function cleanupTestEnvironment(ctx: TestContext) {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}   🧹 LIMPEZA DO AMBIENTE DE TESTES${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  try {
    // Deletar sessão AI
    await ctx.supabase
      .from('ai_conversation_sessions')
      .delete()
      .eq('id', ctx.sessionId);
    console.log(`  ✓ Sessão AI removida`);

    // Deletar mensagens
    await ctx.supabase
      .from('messages')
      .delete()
      .eq('conversation_id', ctx.conversationId);
    console.log(`  ✓ Mensagens removidas`);

    // Deletar eventos do calendário criados nos testes
    await ctx.supabase
      .from('calendar_events')
      .delete()
      .eq('lead_id', ctx.leadId);
    console.log(`  ✓ Eventos de calendário removidos`);

    // Deletar conversa
    await ctx.supabase
      .from('conversations')
      .delete()
      .eq('id', ctx.conversationId);
    console.log(`  ✓ Conversa removida`);

    // Deletar lead
    await ctx.supabase
      .from('leads')
      .delete()
      .eq('id', ctx.leadId);
    console.log(`  ✓ Lead removido`);

    console.log(`\n${colors.green}✓ Ambiente de teste limpo com sucesso!${colors.reset}\n`);
  } catch (error) {
    console.log(`\n${colors.yellow}⚠ Alguns itens podem não ter sido limpos: ${error}${colors.reset}\n`);
  }
}

function printTestResult(result: TestResult) {
  const status = result.passed
    ? `${colors.green}✓ PASSOU${colors.reset}`
    : `${colors.red}✗ FALHOU${colors.reset}`;

  console.log(`  ${status} [${result.id}] ${result.name} ${colors.dim}(${result.duration}ms)${colors.reset}`);

  if (!result.passed && result.error) {
    console.log(`    ${colors.red}Erro: ${result.error}${colors.reset}`);
  }

  if (result.message && !result.passed) {
    console.log(`    ${colors.yellow}Mensagem: ${result.message}${colors.reset}`);
  }
}

function printSummary(results: TestResult[]) {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}   📊 RESUMO DOS TESTES${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`  Total de testes: ${total}`);
  console.log(`  ${colors.green}Passou: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Falhou: ${failed}${colors.reset}`);
  console.log(`  Tempo total: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`  Taxa de sucesso: ${((passed / total) * 100).toFixed(1)}%`);

  // Agrupar por categoria
  const byCategory: Record<string, TestResult[]> = {};
  results.forEach(r => {
    if (!byCategory[r.category]) byCategory[r.category] = [];
    byCategory[r.category].push(r);
  });

  console.log(`\n  Por categoria:`);
  Object.entries(byCategory).forEach(([category, tests]) => {
    const catPassed = tests.filter(t => t.passed).length;
    const catTotal = tests.length;
    const icon = catPassed === catTotal ? colors.green + '✓' : colors.red + '✗';
    console.log(`    ${icon} ${category}: ${catPassed}/${catTotal}${colors.reset}`);
  });

  if (failed > 0) {
    console.log(`\n  ${colors.red}Testes que falharam:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    - [${r.id}] ${r.name}`);
    });
  }

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);
}

async function runTests(tests: TestCase[], ctx: TestContext): Promise<TestResult[]> {
  const results: TestResult[] = [];

  for (const test of tests) {
    try {
      // Setup
      if (test.setup) {
        await test.setup(ctx);
      }

      // Execute
      const result = await test.execute(ctx);
      results.push(result);
      printTestResult(result);

      // Cleanup
      if (test.cleanup) {
        await test.cleanup(ctx);
      }

      // Pequeno delay entre testes
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      const result: TestResult = {
        id: test.id,
        name: test.name,
        category: test.category,
        passed: false,
        message: 'Exceção durante execução',
        duration: 0,
        error: error instanceof Error ? error.message : String(error)
      };
      results.push(result);
      printTestResult(result);
    }
  }

  return results;
}

// Main execution
async function main() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     🎣 PESCA LEAD - TESTES AUTOMATIZADOS AI TOOLS 🤖      ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}\n`);

  let ctx: TestContext | null = null;
  const allResults: TestResult[] = [];

  try {
    // Setup
    ctx = await setupTestEnvironment();

    // Executar testes por categoria
    const testSuites = [
      { name: 'consultar_disponibilidade', tests: consultar_disponibilidade_tests },
      { name: 'agendar_reuniao', tests: agendar_reuniao_tests },
      { name: 'finalizar_atendimento', tests: finalizar_atendimento_tests },
      { name: 'transferir_para_humano', tests: transferir_para_humano_tests },
      { name: 'atualizar_crm', tests: atualizar_crm_tests },
    ];

    for (const suite of testSuites) {
      console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
      console.log(`${colors.blue}   🧪 ${suite.name.toUpperCase()}${colors.reset}`);
      console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

      const results = await runTests(suite.tests, ctx);
      allResults.push(...results);

      // Recriar conversa/sessão entre suites se necessário
      if (suite.name === 'finalizar_atendimento' || suite.name === 'transferir_para_humano') {
        // Recriar conversa para próximos testes
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

          if (newSession) {
            ctx.sessionId = newSession.id;
          }
        }
      }
    }

    // Resumo final
    printSummary(allResults);

  } catch (error) {
    console.error(`\n${colors.red}Erro fatal: ${error}${colors.reset}\n`);
  } finally {
    // Cleanup
    if (ctx) {
      await cleanupTestEnvironment(ctx);
    }
  }

  // Exit code baseado nos resultados
  const failed = allResults.filter(r => !r.passed).length;
  Deno.exit(failed > 0 ? 1 : 0);
}

main();
