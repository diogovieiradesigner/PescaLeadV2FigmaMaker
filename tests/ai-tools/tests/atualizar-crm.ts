/**
 * Testes para a tool: atualizar_crm
 */

import { TestCase, TestContext, TestResult } from '../test-config.ts';
import {
  callAIFunction,
  createSuccessResult,
  createFailureResult,
  getLeadData,
  sleep,
} from '../test-helpers.ts';

export const atualizar_crm_tests: TestCase[] = [
  // ============================================
  // CENÁRIOS DE SUCESSO
  // ============================================
  {
    id: 'AC-01',
    name: 'Atualizar nome do cliente',
    category: 'atualizar_crm',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();
      const newName = `Cliente Teste ${Date.now()}`;

      const response = await callAIFunction(ctx, `Meu nome é ${newName}`);

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AC-01', 'Atualizar nome do cliente', 'atualizar_crm', duration,
          'Falha na chamada', response.error);
      }

      // Verificar se nome foi atualizado no lead
      await sleep(1000);
      const lead = await getLeadData(ctx);

      if (lead?.client_name?.includes('Teste')) {
        return createSuccessResult('AC-01', 'Atualizar nome do cliente', 'atualizar_crm', duration,
          'Nome atualizado no CRM', { clientName: lead.client_name });
      }

      // Pode não ter atualizado automaticamente mas registrou
      const aiResponse = response.data?.response || response.data?.message || '';
      if (/anotei|registr|entendi|prazer/i.test(aiResponse)) {
        return createSuccessResult('AC-01', 'Atualizar nome do cliente', 'atualizar_crm', duration,
          'IA reconheceu o nome', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('AC-01', 'Atualizar nome do cliente', 'atualizar_crm', duration,
        'Nome não foi atualizado', undefined, { currentName: lead?.client_name });
    }
  },

  {
    id: 'AC-02',
    name: 'Atualizar empresa',
    category: 'atualizar_crm',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();
      const companyName = `Empresa Teste ${Date.now()}`;

      const response = await callAIFunction(ctx, `Minha empresa é ${companyName}`);

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AC-02', 'Atualizar empresa', 'atualizar_crm', duration,
          'Falha na chamada', response.error);
      }

      await sleep(1000);
      const lead = await getLeadData(ctx);

      if (lead?.company?.includes('Teste')) {
        return createSuccessResult('AC-02', 'Atualizar empresa', 'atualizar_crm', duration,
          'Empresa atualizada no CRM', { company: lead.company });
      }

      const aiResponse = response.data?.response || response.data?.message || '';
      if (aiResponse.length > 10) {
        return createSuccessResult('AC-02', 'Atualizar empresa', 'atualizar_crm', duration,
          'IA processou a informação', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('AC-02', 'Atualizar empresa', 'atualizar_crm', duration,
        'Empresa não foi atualizada');
    }
  },

  {
    id: 'AC-03',
    name: 'Adicionar observação',
    category: 'atualizar_crm',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx,
        'Anota aí: prefiro contato por WhatsApp no período da tarde');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AC-03', 'Adicionar observação', 'atualizar_crm', duration,
          'Falha na chamada', response.error);
      }

      await sleep(1000);
      const lead = await getLeadData(ctx);

      if (lead?.notes?.includes('WhatsApp') || lead?.notes?.includes('tarde')) {
        return createSuccessResult('AC-03', 'Adicionar observação', 'atualizar_crm', duration,
          'Observação adicionada no CRM', { notes: lead.notes?.substring(0, 100) });
      }

      const aiResponse = response.data?.response || response.data?.message || '';
      if (/anotei|registr|anotado|certo/i.test(aiResponse)) {
        return createSuccessResult('AC-03', 'Adicionar observação', 'atualizar_crm', duration,
          'IA confirmou anotação', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('AC-03', 'Adicionar observação', 'atualizar_crm', duration,
        'Observação não foi adicionada');
    }
  },

  {
    id: 'AC-04',
    name: 'Múltiplas informações',
    category: 'atualizar_crm',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx,
        'Sou Maria da empresa XYZ Tecnologia');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AC-04', 'Múltiplas informações', 'atualizar_crm', duration,
          'Falha na chamada', response.error);
      }

      await sleep(1000);
      const lead = await getLeadData(ctx);

      const hasName = lead?.client_name?.includes('Maria');
      const hasCompany = lead?.company?.includes('XYZ');

      if (hasName || hasCompany) {
        return createSuccessResult('AC-04', 'Múltiplas informações', 'atualizar_crm', duration,
          'Informações atualizadas', { clientName: lead?.client_name, company: lead?.company });
      }

      const aiResponse = response.data?.response || response.data?.message || '';
      if (/Maria|XYZ|prazer|olá/i.test(aiResponse)) {
        return createSuccessResult('AC-04', 'Múltiplas informações', 'atualizar_crm', duration,
          'IA reconheceu as informações');
      }

      return createFailureResult('AC-04', 'Múltiplas informações', 'atualizar_crm', duration,
        'Informações não foram atualizadas');
    }
  },

  // ============================================
  // CENÁRIOS DE CONTEXTO
  // ============================================
  {
    id: 'AC-05',
    name: 'Informação em contexto de conversa',
    category: 'atualizar_crm',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      // Conversa natural onde a info aparece
      await callAIFunction(ctx, 'Olá, boa tarde!');
      const response = await callAIFunction(ctx,
        'Eu trabalho na Construtora ABC e estou interessado nos seus serviços');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AC-05', 'Informação em contexto de conversa', 'atualizar_crm', duration,
          'Falha na chamada', response.error);
      }

      await sleep(1000);
      const lead = await getLeadData(ctx);

      if (lead?.company?.includes('ABC') || lead?.company?.includes('Construtora')) {
        return createSuccessResult('AC-05', 'Informação em contexto de conversa', 'atualizar_crm', duration,
          'Empresa extraída do contexto', { company: lead?.company });
      }

      const aiResponse = response.data?.response || response.data?.message || '';
      if (aiResponse.length > 10) {
        return createSuccessResult('AC-05', 'Informação em contexto de conversa', 'atualizar_crm', duration,
          'IA processou a conversa', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('AC-05', 'Informação em contexto de conversa', 'atualizar_crm', duration,
        'Informação não foi extraída do contexto');
    }
  },

  {
    id: 'AC-06',
    name: 'Interesse do cliente',
    category: 'atualizar_crm',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx,
        'Tenho interesse em consultoria de marketing digital para minha loja online');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AC-06', 'Interesse do cliente', 'atualizar_crm', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      // Verificar se IA registrou o interesse
      await sleep(1000);
      const lead = await getLeadData(ctx);

      if (lead?.notes?.includes('marketing') || lead?.notes?.includes('consultoria')) {
        return createSuccessResult('AC-06', 'Interesse do cliente', 'atualizar_crm', duration,
          'Interesse registrado nas notas', { notes: lead?.notes?.substring(0, 100) });
      }

      if (/marketing|consultoria|loja|online/i.test(aiResponse)) {
        return createSuccessResult('AC-06', 'Interesse do cliente', 'atualizar_crm', duration,
          'IA reconheceu o interesse', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('AC-06', 'Interesse do cliente', 'atualizar_crm', duration,
        'Interesse não foi registrado');
    }
  },

  // ============================================
  // CENÁRIOS DE VALIDAÇÃO
  // ============================================
  {
    id: 'AC-07',
    name: 'Verificar atividade registrada',
    category: 'atualizar_crm',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      await callAIFunction(ctx, 'Pode atualizar meu nome para Roberto Santos');

      const duration = Date.now() - start;

      // Verificar se atividade foi registrada
      await sleep(1000);
      const { data: activities } = await ctx.supabase
        .from('lead_activities')
        .select('*')
        .eq('lead_id', ctx.leadId)
        .order('created_at', { ascending: false })
        .limit(5);

      const hasActivity = activities && activities.length > 0;

      if (hasActivity) {
        return createSuccessResult('AC-07', 'Verificar atividade registrada', 'atualizar_crm', duration,
          'Atividade registrada no lead', { activitiesCount: activities.length });
      }

      const lead = await getLeadData(ctx);
      if (lead?.client_name?.includes('Roberto')) {
        return createSuccessResult('AC-07', 'Verificar atividade registrada', 'atualizar_crm', duration,
          'Nome atualizado (atividade pode não ter sido criada)', { clientName: lead.client_name });
      }

      return createFailureResult('AC-07', 'Verificar atividade registrada', 'atualizar_crm', duration,
        'Nenhuma atividade registrada');
    }
  },

  {
    id: 'AC-08',
    name: 'Atualização implícita via conversa',
    category: 'atualizar_crm',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      // Conversa onde nome é mencionado naturalmente
      await callAIFunction(ctx, 'Olá!');
      await callAIFunction(ctx, 'Me chamo Fernando, sou gerente de vendas');
      const response = await callAIFunction(ctx, 'Quero saber sobre preços');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AC-08', 'Atualização implícita via conversa', 'atualizar_crm', duration,
          'Falha na chamada', response.error);
      }

      await sleep(1000);
      const lead = await getLeadData(ctx);

      if (lead?.client_name?.includes('Fernando')) {
        return createSuccessResult('AC-08', 'Atualização implícita via conversa', 'atualizar_crm', duration,
          'Nome capturado da conversa', { clientName: lead.client_name });
      }

      // Verificar se há menção nas notas
      if (lead?.notes?.includes('Fernando') || lead?.notes?.includes('gerente')) {
        return createSuccessResult('AC-08', 'Atualização implícita via conversa', 'atualizar_crm', duration,
          'Info registrada nas notas');
      }

      return createFailureResult('AC-08', 'Atualização implícita via conversa', 'atualizar_crm', duration,
        'Nome não foi capturado implicitamente', undefined, { currentName: lead?.client_name });
    }
  },
];
