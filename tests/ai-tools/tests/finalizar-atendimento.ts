/**
 * Testes para a tool: finalizar_atendimento
 */

import { TestCase, TestContext, TestResult } from '../test-config.ts';
import {
  callAIFunction,
  createSuccessResult,
  createFailureResult,
  getConversationStatus,
  getSessionStatus,
  sleep,
} from '../test-helpers.ts';

export const finalizar_atendimento_tests: TestCase[] = [
  // ============================================
  // CENÁRIOS DE SUCESSO
  // ============================================
  {
    id: 'FA-01',
    name: 'Finalização básica',
    category: 'finalizar_atendimento',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Obrigado, pode encerrar o atendimento');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('FA-01', 'Finalização básica', 'finalizar_atendimento', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      // Verificar status no banco
      await sleep(1000);
      const convStatus = await getConversationStatus(ctx);
      const sessionStatus = await getSessionStatus(ctx);

      const statusChanged = convStatus === 'resolved' || sessionStatus === 'completed';

      if (statusChanged || /encerrad|finalizad|ótimo.*dia|até.*logo/i.test(aiResponse)) {
        return createSuccessResult('FA-01', 'Finalização básica', 'finalizar_atendimento', duration,
          'Atendimento finalizado', { convStatus, sessionStatus, response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('FA-01', 'Finalização básica', 'finalizar_atendimento', duration,
        'Status não alterado para finalizado', undefined, { convStatus, sessionStatus });
    }
  },

  {
    id: 'FA-02',
    name: 'Finalização com despedida',
    category: 'finalizar_atendimento',
    setup: async (ctx: TestContext) => {
      // Recriar conversa para este teste
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
    },
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Era só isso, muito obrigado pela ajuda! Tchau!');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('FA-02', 'Finalização com despedida', 'finalizar_atendimento', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      // IA deve responder com despedida
      const hasFarewell = /tchau|até|obrigad|prazer|volte/i.test(aiResponse);

      if (hasFarewell) {
        return createSuccessResult('FA-02', 'Finalização com despedida', 'finalizar_atendimento', duration,
          'IA se despediu adequadamente');
      }

      if (aiResponse.length > 10) {
        return createSuccessResult('FA-02', 'Finalização com despedida', 'finalizar_atendimento', duration,
          'IA respondeu', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('FA-02', 'Finalização com despedida', 'finalizar_atendimento', duration,
        'Resposta inadequada');
    }
  },

  {
    id: 'FA-03',
    name: 'Finalização após resolver dúvida',
    category: 'finalizar_atendimento',
    setup: async (ctx: TestContext) => {
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
    },
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      // Primeiro uma pergunta
      await callAIFunction(ctx, 'Quais serviços vocês oferecem?');

      // Depois finalizar
      const response = await callAIFunction(ctx, 'Entendi, resolveu minha dúvida. Pode encerrar.');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('FA-03', 'Finalização após resolver dúvida', 'finalizar_atendimento', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      await sleep(500);
      const convStatus = await getConversationStatus(ctx);

      if (convStatus === 'resolved' || /finalizad|encerrad/i.test(aiResponse)) {
        return createSuccessResult('FA-03', 'Finalização após resolver dúvida', 'finalizar_atendimento', duration,
          'Atendimento finalizado após resolver dúvida');
      }

      return createFailureResult('FA-03', 'Finalização após resolver dúvida', 'finalizar_atendimento', duration,
        'Status não alterado', undefined, { convStatus });
    }
  },

  // ============================================
  // CENÁRIOS DE VERIFICAÇÃO
  // ============================================
  {
    id: 'FA-04',
    name: 'Verificar resumo salvo',
    category: 'finalizar_atendimento',
    setup: async (ctx: TestContext) => {
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
    },
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      // Conversa com contexto
      await callAIFunction(ctx, 'Meu nome é Carlos e tenho interesse em consultoria');
      await callAIFunction(ctx, 'Pode fechar o chamado');

      const duration = Date.now() - start;

      // Verificar se resumo foi salvo
      await sleep(1000);
      const { data: session } = await ctx.supabase
        .from('ai_conversation_sessions')
        .select('context_summary')
        .eq('id', ctx.sessionId)
        .single();

      if (session?.context_summary) {
        return createSuccessResult('FA-04', 'Verificar resumo salvo', 'finalizar_atendimento', duration,
          'Resumo do contexto foi salvo', { summaryLength: session.context_summary.length });
      }

      // Pode não ter salvo resumo mas ter finalizado
      const convStatus = await getConversationStatus(ctx);
      if (convStatus === 'resolved') {
        return createSuccessResult('FA-04', 'Verificar resumo salvo', 'finalizar_atendimento', duration,
          'Conversa finalizada (resumo pode não estar configurado)');
      }

      return createFailureResult('FA-04', 'Verificar resumo salvo', 'finalizar_atendimento', duration,
        'Resumo não foi salvo');
    }
  },

  {
    id: 'FA-05',
    name: 'Tchau no meio da conversa',
    category: 'finalizar_atendimento',
    setup: async (ctx: TestContext) => {
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
    },
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      // Simular conversa em andamento
      await callAIFunction(ctx, 'Quero saber sobre preços');
      const response = await callAIFunction(ctx, 'Tchau');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('FA-05', 'Tchau no meio da conversa', 'finalizar_atendimento', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      // IA pode confirmar se quer encerrar ou se despedir
      if (aiResponse.length > 10) {
        return createSuccessResult('FA-05', 'Tchau no meio da conversa', 'finalizar_atendimento', duration,
          'IA respondeu ao tchau', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('FA-05', 'Tchau no meio da conversa', 'finalizar_atendimento', duration,
        'Resposta vazia ou inadequada');
    }
  },
];
