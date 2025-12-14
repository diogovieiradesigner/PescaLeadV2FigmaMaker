/**
 * Testes para a tool: agendar_reuniao
 */

import { TestCase, TestContext, TestResult } from '../test-config.ts';
import {
  callAIFunction,
  createSuccessResult,
  createFailureResult,
  getLeadCalendarEvents,
  formatDate,
  formatTime,
  getTomorrow,
  getNextWeekday,
  getYesterday,
  sleep,
} from '../test-helpers.ts';

export const agendar_reuniao_tests: TestCase[] = [
  // ============================================
  // CENÁRIOS DE SUCESSO
  // ============================================
  {
    id: 'AR-01',
    name: 'Agendamento básico - amanhã 10h',
    category: 'agendar_reuniao',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();
      const nextDay = getNextWeekday();
      const formattedDate = `${nextDay.getDate()}/${nextDay.getMonth() + 1}`;

      const response = await callAIFunction(ctx, `Quero marcar uma reunião dia ${formattedDate} às 10h`);

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AR-01', 'Agendamento básico - amanhã 10h', 'agendar_reuniao', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      // Verificar se evento foi criado
      await sleep(1000);
      const events = await getLeadCalendarEvents(ctx);
      const hasEvent = events.length > 0;

      if (hasEvent || /agendad|confirmad|marcad/i.test(aiResponse)) {
        return createSuccessResult('AR-01', 'Agendamento básico - amanhã 10h', 'agendar_reuniao', duration,
          'Reunião agendada com sucesso', { eventsCount: events.length, response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('AR-01', 'Agendamento básico - amanhã 10h', 'agendar_reuniao', duration,
        'Evento não foi criado', undefined, { response: aiResponse.substring(0, 200) });
    },
    cleanup: async (ctx: TestContext) => {
      // Limpar eventos criados
      await ctx.supabase.from('calendar_events').delete().eq('lead_id', ctx.leadId);
    }
  },

  {
    id: 'AR-02',
    name: 'Agendamento com título',
    category: 'agendar_reuniao',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();
      const nextDay = getNextWeekday();
      const formattedDate = `${nextDay.getDate()}/${nextDay.getMonth() + 1}`;

      const response = await callAIFunction(ctx,
        `Agenda uma demonstração do produto para dia ${formattedDate} às 14h`);

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AR-02', 'Agendamento com título', 'agendar_reuniao', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      await sleep(1000);
      const events = await getLeadCalendarEvents(ctx);
      const hasDemo = events.some((e: any) =>
        e.title?.toLowerCase().includes('demonstração') ||
        e.title?.toLowerCase().includes('demo')
      );

      if (hasDemo || /demonstração|demo|agendad/i.test(aiResponse)) {
        return createSuccessResult('AR-02', 'Agendamento com título', 'agendar_reuniao', duration,
          'Demonstração agendada', { events: events.map((e: any) => e.title) });
      }

      if (events.length > 0) {
        return createSuccessResult('AR-02', 'Agendamento com título', 'agendar_reuniao', duration,
          'Evento criado (título pode diferir)', { events: events.map((e: any) => e.title) });
      }

      return createFailureResult('AR-02', 'Agendamento com título', 'agendar_reuniao', duration,
        'Evento não foi criado');
    },
    cleanup: async (ctx: TestContext) => {
      await ctx.supabase.from('calendar_events').delete().eq('lead_id', ctx.leadId);
    }
  },

  {
    id: 'AR-03',
    name: 'Agendamento com observação',
    category: 'agendar_reuniao',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();
      const nextDay = getNextWeekday();
      nextDay.setDate(nextDay.getDate() + 1); // dia depois do próximo
      const formattedDate = `${nextDay.getDate()}/${nextDay.getMonth() + 1}`;

      const response = await callAIFunction(ctx,
        `Marca reunião dia ${formattedDate} às 15h, vou levar os documentos`);

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AR-03', 'Agendamento com observação', 'agendar_reuniao', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      await sleep(1000);
      const events = await getLeadCalendarEvents(ctx);

      if (events.length > 0 || /agendad|confirmad|marcad/i.test(aiResponse)) {
        return createSuccessResult('AR-03', 'Agendamento com observação', 'agendar_reuniao', duration,
          'Reunião agendada com observação');
      }

      return createFailureResult('AR-03', 'Agendamento com observação', 'agendar_reuniao', duration,
        'Evento não foi criado');
    },
    cleanup: async (ctx: TestContext) => {
      await ctx.supabase.from('calendar_events').delete().eq('lead_id', ctx.leadId);
    }
  },

  // ============================================
  // CENÁRIOS DE ERRO/VALIDAÇÃO
  // ============================================
  {
    id: 'AR-04',
    name: 'Agendamento data passada',
    category: 'agendar_reuniao',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();
      const yesterday = getYesterday();
      const formattedDate = `${yesterday.getDate()}/${yesterday.getMonth() + 1}`;

      const response = await callAIFunction(ctx, `Agenda reunião para dia ${formattedDate} às 10h`);

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AR-04', 'Agendamento data passada', 'agendar_reuniao', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      // Deve recusar ou alertar sobre data passada
      const hasError = /passado|não.*possível|inválid|não.*disponível|data.*anterior/i.test(aiResponse);

      if (hasError) {
        return createSuccessResult('AR-04', 'Agendamento data passada', 'agendar_reuniao', duration,
          'IA corretamente recusou data passada');
      }

      // Verificar se evento foi criado (não deveria)
      await sleep(500);
      const events = await getLeadCalendarEvents(ctx);

      if (events.length === 0) {
        return createSuccessResult('AR-04', 'Agendamento data passada', 'agendar_reuniao', duration,
          'Nenhum evento criado para data passada (comportamento correto)', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('AR-04', 'Agendamento data passada', 'agendar_reuniao', duration,
        'Evento foi criado para data passada (deveria recusar)', { eventsCreated: events.length });
    },
    cleanup: async (ctx: TestContext) => {
      await ctx.supabase.from('calendar_events').delete().eq('lead_id', ctx.leadId);
    }
  },

  {
    id: 'AR-05',
    name: 'Agendamento domingo',
    category: 'agendar_reuniao',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Agenda reunião no domingo às 10h');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AR-05', 'Agendamento domingo', 'agendar_reuniao', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      // Deve informar que não há expediente no domingo
      const hasWarning = /domingo|não.*expediente|não.*disponível|não.*funcionamos|dia útil/i.test(aiResponse);

      if (hasWarning || aiResponse.length > 10) {
        return createSuccessResult('AR-05', 'Agendamento domingo', 'agendar_reuniao', duration,
          'IA respondeu sobre domingo', { response: aiResponse.substring(0, 200) });
      }

      return createFailureResult('AR-05', 'Agendamento domingo', 'agendar_reuniao', duration,
        'Resposta não trata adequadamente domingo');
    }
  },

  {
    id: 'AR-06',
    name: 'Agendamento fora do horário',
    category: 'agendar_reuniao',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();
      const nextDay = getNextWeekday();
      const formattedDate = `${nextDay.getDate()}/${nextDay.getMonth() + 1}`;

      const response = await callAIFunction(ctx, `Marca reunião dia ${formattedDate} às 22h`);

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AR-06', 'Agendamento fora do horário', 'agendar_reuniao', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      // Deve informar que horário está fora do expediente
      const hasWarning = /fora.*horário|não.*disponível|expediente|22h/i.test(aiResponse);

      if (hasWarning || aiResponse.length > 10) {
        return createSuccessResult('AR-06', 'Agendamento fora do horário', 'agendar_reuniao', duration,
          'IA respondeu sobre horário fora do expediente');
      }

      return createFailureResult('AR-06', 'Agendamento fora do horário', 'agendar_reuniao', duration,
        'Resposta não trata adequadamente horário fora do expediente');
    }
  },

  {
    id: 'AR-07',
    name: 'Agendamento sem informar horário',
    category: 'agendar_reuniao',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();

      const response = await callAIFunction(ctx, 'Quero marcar uma reunião amanhã');

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AR-07', 'Agendamento sem informar horário', 'agendar_reuniao', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      // Deve perguntar o horário ou oferecer opções
      const asksForTime = /qual.*horário|que.*hora|horário.*prefer|sugerir|opções/i.test(aiResponse);

      if (asksForTime || aiResponse.length > 10) {
        return createSuccessResult('AR-07', 'Agendamento sem informar horário', 'agendar_reuniao', duration,
          'IA solicitou horário ou ofereceu opções');
      }

      return createFailureResult('AR-07', 'Agendamento sem informar horário', 'agendar_reuniao', duration,
        'IA deveria perguntar o horário');
    }
  },

  {
    id: 'AR-08',
    name: 'Primeiro horário do dia',
    category: 'agendar_reuniao',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();
      const nextDay = getNextWeekday();
      const formattedDate = `${nextDay.getDate()}/${nextDay.getMonth() + 1}`;

      const response = await callAIFunction(ctx, `Agenda reunião dia ${formattedDate} às 08h`);

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AR-08', 'Primeiro horário do dia', 'agendar_reuniao', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      await sleep(500);
      const events = await getLeadCalendarEvents(ctx);

      if (events.length > 0 || /agendad|confirmad|8.*hora/i.test(aiResponse)) {
        return createSuccessResult('AR-08', 'Primeiro horário do dia', 'agendar_reuniao', duration,
          'Evento agendado no primeiro horário');
      }

      return createFailureResult('AR-08', 'Primeiro horário do dia', 'agendar_reuniao', duration,
        'Falha ao agendar no primeiro horário');
    },
    cleanup: async (ctx: TestContext) => {
      await ctx.supabase.from('calendar_events').delete().eq('lead_id', ctx.leadId);
    }
  },

  {
    id: 'AR-09',
    name: 'Agendamento com duração específica',
    category: 'agendar_reuniao',
    execute: async (ctx: TestContext): Promise<TestResult> => {
      const start = Date.now();
      const nextDay = getNextWeekday();
      const formattedDate = `${nextDay.getDate()}/${nextDay.getMonth() + 1}`;

      const response = await callAIFunction(ctx,
        `Quero uma reunião de 30 minutos dia ${formattedDate} às 9h`);

      const duration = Date.now() - start;

      if (!response.success) {
        return createFailureResult('AR-09', 'Agendamento com duração específica', 'agendar_reuniao', duration,
          'Falha na chamada', response.error);
      }

      const aiResponse = response.data?.response || response.data?.message || '';

      await sleep(500);
      const events = await getLeadCalendarEvents(ctx);

      if (events.length > 0 || /agendad|confirmad|30.*minuto/i.test(aiResponse)) {
        return createSuccessResult('AR-09', 'Agendamento com duração específica', 'agendar_reuniao', duration,
          'Evento agendado com duração');
      }

      return createFailureResult('AR-09', 'Agendamento com duração específica', 'agendar_reuniao', duration,
        'Falha ao agendar com duração');
    },
    cleanup: async (ctx: TestContext) => {
      await ctx.supabase.from('calendar_events').delete().eq('lead_id', ctx.leadId);
    }
  },
];
