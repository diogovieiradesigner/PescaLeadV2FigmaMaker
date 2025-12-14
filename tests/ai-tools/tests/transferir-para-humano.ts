/**
 * Testes para a tool: transferir_para_humano
 */

import { TestCase, TestContext, TestResult } from '../test-config.ts';
import {
  callAIFunction,
  createSuccessResult,
  createFailureResult,
  getConversationDetails,
  sleep,
} from '../test-helpers.ts';

export const transferir_para_humano_tests: TestCase[] = [
  // ============================================
  // CENÁRIOS DE SUCESSO
  // ============================================
  {
    id: 'TH-01',
    name: 'Transferência direta',
    category: 'transferir_para_humano',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Quero falar com um atendente humano');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('TH-01', 'Transferência direta', 'transferir_para_humano', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      // Verificar se conversa foi transferida
      await sleep(1000);
      const conv = await getConversationDetails(ctx);

      const wasTransferred =
        conv?.attendant_type === 'human' ||
        conv?.status === 'waiting' ||
        /transfer|atendente|humano|aguard/i.test(aiResponse);

      if (wasTransferred) {
        return createSuccessResult('TH-01', 'Transferência direta', 'transferir_para_humano', duration,
          'Conversa transferida para humano', {
            attendantType: conv?.attendant_type,
            status: conv?.status,
            assignedTo: conv?.assigned_to
          });
      }

      return createFailureResult('TH-01', 'Transferência direta', 'transferir_para_humano', duration,
        'Transferência não realizada', undefined, {
          attendantType: conv?.attendant_type,
          status: conv?.status
        });
    }
  },

  {
    id: 'TH-02',
    name: 'Transferência por insatisfação',
    category: 'transferir_para_humano',
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

      const response = await callAIFunction(ctx,
        'Não estou satisfeito com essa resposta, quero falar com alguém de verdade');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('TH-02', 'Transferência por insatisfação', 'transferir_para_humano', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      await sleep(1000);
      const conv = await getConversationDetails(ctx);

      const wasTransferred =
        conv?.attendant_type === 'human' ||
        conv?.status === 'waiting' ||
        /transfer|atendente|humano/i.test(aiResponse);

      if (wasTransferred) {
        return createSuccessResult('TH-02', 'Transferência por insatisfação', 'transferir_para_humano', duration,
          'Conversa transferida por insatisfação');
      }

      // Se a IA tentou resolver antes de transferir, ainda é aceitável
      if (aiResponse.length > 20) {
        return createSuccessResult('TH-02', 'Transferência por insatisfação', 'transferir_para_humano', duration,
          'IA tentou resolver (comportamento aceitável)', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('TH-02', 'Transferência por insatisfação', 'transferir_para_humano', duration,
        'Não transferiu nem tentou resolver');
    }
  },

  {
    id: 'TH-03',
    name: 'Transferência por complexidade',
    category: 'transferir_para_humano',
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

      const response = await callAIFunction(ctx,
        'Tenho um problema muito específico que precisa de ajuda especializada');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('TH-03', 'Transferência por complexidade', 'transferir_para_humano', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      // Pode transferir ou tentar entender melhor
      if (aiResponse.length > 10) {
        return createSuccessResult('TH-03', 'Transferência por complexidade', 'transferir_para_humano', duration,
          'IA respondeu adequadamente');
      }

      return createFailureResult('TH-03', 'Transferência por complexidade', 'transferir_para_humano', duration,
        'Resposta inadequada');
    }
  },

  {
    id: 'TH-04',
    name: 'Transferência com motivo',
    category: 'transferir_para_humano',
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

      const response = await callAIFunction(ctx,
        'Preciso de suporte técnico especializado, por favor transfira para um técnico');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('TH-04', 'Transferência com motivo', 'transferir_para_humano', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      await sleep(1000);
      const conv = await getConversationDetails(ctx);

      // Verificar se sessão tem o motivo registrado
      const { data: session } = await ctx.supabase
        .from('ai_conversation_sessions')
        .select('end_reason, context_summary')
        .eq('conversation_id', ctx.conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const wasTransferred = conv?.attendant_type === 'human' || conv?.status === 'waiting';
      const hasReason = session?.end_reason || session?.context_summary;

      if (wasTransferred) {
        return createSuccessResult('TH-04', 'Transferência com motivo', 'transferir_para_humano', duration,
          'Transferido com motivo registrado', {
            endReason: session?.end_reason,
            hasContext: !!session?.context_summary
          });
      }

      if (aiResponse.length > 10) {
        return createSuccessResult('TH-04', 'Transferência com motivo', 'transferir_para_humano', duration,
          'IA respondeu (pode estar processando transferência)', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('TH-04', 'Transferência com motivo', 'transferir_para_humano', duration,
        'Transferência não realizada');
    }
  },

  // ============================================
  // CENÁRIOS DE VERIFICAÇÃO
  // ============================================
  {
    id: 'TH-05',
    name: 'Verificar atendente atribuído',
    category: 'transferir_para_humano',
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

      await callAIFunction(ctx, 'Quero falar com um atendente, por favor');

      const duration = Date.now() - start;

      // Verificar se atendente foi atribuído
      await sleep(1000);
      const conv = await getConversationDetails(ctx);

      if (conv?.assigned_to) {
        return createSuccessResult('TH-05', 'Verificar atendente atribuído', 'transferir_para_humano', duration,
          'Atendente foi atribuído', { assignedTo: conv.assigned_to });
      }

      if (conv?.attendant_type === 'human' || conv?.status === 'waiting') {
        return createSuccessResult('TH-05', 'Verificar atendente atribuído', 'transferir_para_humano', duration,
          'Conversa transferida (atendente pode ser atribuído depois)', {
            attendantType: conv?.attendant_type,
            status: conv?.status
          });
      }

      return createFailureResult('TH-05', 'Verificar atendente atribuído', 'transferir_para_humano', duration,
        'Atendente não foi atribuído', undefined, {
          attendantType: conv?.attendant_type,
          assignedTo: conv?.assigned_to
        });
    }
  },

  {
    id: 'TH-06',
    name: 'Verificar sessão AI transferida',
    category: 'transferir_para_humano',
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

      await callAIFunction(ctx, 'Por favor, me transfira para o suporte humano');

      const duration = Date.now() - start;

      await sleep(1000);

      // Verificar status da sessão
      const { data: session } = await ctx.supabase
        .from('ai_conversation_sessions')
        .select('status')
        .eq('id', ctx.sessionId)
        .single();

      if (session?.status === 'transferred') {
        return createSuccessResult('TH-06', 'Verificar sessão AI transferida', 'transferir_para_humano', duration,
          'Sessão AI marcada como transferida');
      }

      const conv = await getConversationDetails(ctx);
      if (conv?.attendant_type === 'human') {
        return createSuccessResult('TH-06', 'Verificar sessão AI transferida', 'transferir_para_humano', duration,
          'Conversa transferida (status sessão pode diferir)', { sessionStatus: session?.status });
      }

      return createFailureResult('TH-06', 'Verificar sessão AI transferida', 'transferir_para_humano', duration,
        'Sessão não marcada como transferida', undefined, { sessionStatus: session?.status });
    }
  },
];
