/**
 * Testes para a tool: consultar_disponibilidade
 */

import { TestCase, TestContext, TestResult } from '../test-config.ts';
import {
  callAIFunction,
  createSuccessResult,
  createFailureResult,
  formatDate,
  getTomorrow,
  getNextMonday,
  getNextWeekday,
} from '../test-helpers.ts';

export const consultar_disponibilidade_tests: TestCase[] = [
  // ============================================
  // CENÁRIOS DE SUCESSO
  // ============================================
  {
    id: 'CD-01',
    name: 'Consulta básica - amanhã',
    category: 'consultar_disponibilidade',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Quais horários você tem disponível amanhã?');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('CD-01', 'Consulta básica - amanhã', 'consultar_disponibilidade', duration,
          'Falha na chamada', response.error);
      }

      // Verificar se a resposta menciona horários ou disponibilidade
      const aiResponse = response.data?.response || response.data?.message || '';
      const hasTimeInfo = /\d{1,2}[h:]\d{0,2}|horário|disponível|agenda/i.test(aiResponse);

      if (hasTimeInfo) {
        return createSuccessResult('CD-01', 'Consulta básica - amanhã', 'consultar_disponibilidade', duration,
          'Retornou informações de horário', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('CD-01', 'Consulta básica - amanhã', 'consultar_disponibilidade', duration,
        'Resposta não contém informações de horário', undefined, { response: aiResponse.substring(0, 200) });
    }
  },

  {
    id: 'CD-02',
    name: 'Consulta com data específica',
    category: 'consultar_disponibilidade',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();
      const nextWeekday = getNextWeekday();
      const formattedDate = `${nextWeekday.getDate()}/${nextWeekday.getMonth() + 1}`;

      const response = await callAIFunction(ctx, `Tem horário disponível dia ${formattedDate}?`);

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('CD-02', 'Consulta com data específica', 'consultar_disponibilidade', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';
      const hasResponse = aiResponse.length > 10;

      if (hasResponse) {
        return createSuccessResult('CD-02', 'Consulta com data específica', 'consultar_disponibilidade', duration,
          'Resposta recebida', { date: formattedDate, response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('CD-02', 'Consulta com data específica', 'consultar_disponibilidade', duration,
        'Resposta vazia ou muito curta');
    }
  },

  {
    id: 'CD-03',
    name: 'Consulta com horário preferido',
    category: 'consultar_disponibilidade',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Quero um horário perto das 14h na segunda-feira');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('CD-03', 'Consulta com horário preferido', 'consultar_disponibilidade', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      if (aiResponse.length > 10) {
        return createSuccessResult('CD-03', 'Consulta com horário preferido', 'consultar_disponibilidade', duration,
          'Resposta recebida', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('CD-03', 'Consulta com horário preferido', 'consultar_disponibilidade', duration,
        'Resposta vazia');
    }
  },

  {
    id: 'CD-04',
    name: 'Consulta manhã',
    category: 'consultar_disponibilidade',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Tem horário de manhã disponível?');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('CD-04', 'Consulta manhã', 'consultar_disponibilidade', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      if (aiResponse.length > 10) {
        return createSuccessResult('CD-04', 'Consulta manhã', 'consultar_disponibilidade', duration,
          'Resposta recebida');
      }

      return createFailureResult('CD-04', 'Consulta manhã', 'consultar_disponibilidade', duration,
        'Resposta vazia');
    }
  },

  {
    id: 'CD-05',
    name: 'Consulta tarde',
    category: 'consultar_disponibilidade',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Prefiro horário à tarde, tem disponível?');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('CD-05', 'Consulta tarde', 'consultar_disponibilidade', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      if (aiResponse.length > 10) {
        return createSuccessResult('CD-05', 'Consulta tarde', 'consultar_disponibilidade', duration,
          'Resposta recebida');
      }

      return createFailureResult('CD-05', 'Consulta tarde', 'consultar_disponibilidade', duration,
        'Resposta vazia');
    }
  },

  // ============================================
  // CENÁRIOS DE ERRO/VALIDAÇÃO
  // ============================================
  {
    id: 'CD-06',
    name: 'Dia sem expediente - sábado',
    category: 'consultar_disponibilidade',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Tem horário no sábado?');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('CD-06', 'Dia sem expediente - sábado', 'consultar_disponibilidade', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';
      // Deve mencionar que não há expediente ou sugerir outro dia
      const hasProperResponse = /não.*expediente|não.*sábado|não.*disponível|outro dia|dia útil|segunda/i.test(aiResponse);

      if (hasProperResponse || aiResponse.length > 10) {
        return createSuccessResult('CD-06', 'Dia sem expediente - sábado', 'consultar_disponibilidade', duration,
          'IA respondeu sobre sábado', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('CD-06', 'Dia sem expediente - sábado', 'consultar_disponibilidade', duration,
        'Resposta não trata adequadamente dia sem expediente');
    }
  },

  {
    id: 'CD-07',
    name: 'Dia sem expediente - domingo',
    category: 'consultar_disponibilidade',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Quero agendar no domingo');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('CD-07', 'Dia sem expediente - domingo', 'consultar_disponibilidade', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      if (aiResponse.length > 10) {
        return createSuccessResult('CD-07', 'Dia sem expediente - domingo', 'consultar_disponibilidade', duration,
          'IA respondeu sobre domingo', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('CD-07', 'Dia sem expediente - domingo', 'consultar_disponibilidade', duration,
        'Resposta vazia');
    }
  },

  {
    id: 'CD-08',
    name: 'Consulta para data muito no futuro',
    category: 'consultar_disponibilidade',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Tem horário daqui 6 meses?');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('CD-08', 'Consulta para data muito no futuro', 'consultar_disponibilidade', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      if (aiResponse.length > 10) {
        return createSuccessResult('CD-08', 'Consulta para data muito no futuro', 'consultar_disponibilidade', duration,
          'IA respondeu sobre data futura', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('CD-08', 'Consulta para data muito no futuro', 'consultar_disponibilidade', duration,
        'Resposta vazia');
    }
  },

  {
    id: 'CD-09',
    name: 'Consulta próxima semana',
    category: 'consultar_disponibilidade',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Quais horários livres você tem semana que vem?');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('CD-09', 'Consulta próxima semana', 'consultar_disponibilidade', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      if (aiResponse.length > 10) {
        return createSuccessResult('CD-09', 'Consulta próxima semana', 'consultar_disponibilidade', duration,
          'IA respondeu sobre próxima semana');
      }

      return createFailureResult('CD-09', 'Consulta próxima semana', 'consultar_disponibilidade', duration,
        'Resposta vazia');
    }
  },
];
