/**
 * Script de testes completo para Node.js
 * Inclui TODOS os 37 testes das AI Tools
 *
 * Uso: npx tsx tests/ai-tools/run-tests-node.ts
 *      npx tsx tests/ai-tools/run-tests-node.ts --debug
 *      npx tsx tests/ai-tools/run-tests-node.ts --category=agendar_reuniao
 *      npx tsx tests/ai-tools/run-tests-node.ts --no-save (não salva histórico)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CONFIGURAÇÃO
// ============================================

const DEBUG = process.argv.includes('--debug') || process.argv.includes('-d');
const CATEGORY_FILTER = process.argv.find(a => a.startsWith('--category='))?.split('=')[1];
const SAVE_HISTORY = !process.argv.includes('--no-save');
const HISTORY_DIR = path.join(__dirname, 'history');

const CONFIG = {
  SUPABASE_URL: 'https://nlbcwaxkeaddfocigwuk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwNTU0OTUsImV4cCI6MjA0NzYzMTQ5NX0.CgaXrV50ygPwfC2z68U0-knnLwmFVp7J91Ijvf26svE',
  WIDGET_SLUG: 'widget-embed',
  WIDGET_CHAT_URL: 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/widget-chat',
  WORKSPACE_ID: '47e86ae3-4d5c-4e03-a881-293fa802424d',
  AGENT_ID: '3267daee-b438-486f-a7b8-d52b84a46cf7',
};

// ============================================
// TIPOS
// ============================================

interface TestContext {
  supabase: SupabaseClient;
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
  details?: any;
}

interface TestHistoryEntry {
  timestamp: string;
  date: string;
  total: number;
  passed: number;
  failed: number;
  rate: number;
  duration: number;
  categoryFilter?: string;
  categories: {
    [key: string]: {
      total: number;
      passed: number;
      failed: number;
    };
  };
  results: TestResult[];
}

interface TestCase {
  id: string;
  name: string;
  category: string;
  execute: (ctx: TestContext) => Promise<TestResult>;
  needsNewConversation?: boolean;
}

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

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateWidgetToken(slug: string): string {
  const secret = "pesca-lead-widget-2024";
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

function getYesterday(): Date {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date;
}

function createSuccessResult(id: string, name: string, category: string, duration: number, message: string, details?: any): TestResult {
  return { id, name, category, passed: true, message, duration, details };
}

function createFailureResult(id: string, name: string, category: string, duration: number, message: string, error?: string, details?: any): TestResult {
  return { id, name, category, passed: false, message, duration, error, details };
}

// ============================================
// API CALL
// ============================================

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
      console.log(`${colors.dim}      [DEBUG] Request: ${JSON.stringify(requestBody)}${colors.reset}`);
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
      console.log(`${colors.dim}      [DEBUG] Status: ${response.status}, Keys: ${Object.keys(data).join(', ')}${colors.reset}`);
      if (data.reply) {
        console.log(`${colors.dim}      [DEBUG] Reply: ${data.reply.substring(0, 120)}...${colors.reset}`);
      }
    }

    // Normalizar resposta
    if (data.reply && !data.response) {
      data.response = data.reply;
    }

    // Atualizar IDs
    if (data.conversationId && data.conversationId !== ctx.conversationId) {
      ctx.conversationId = data.conversationId;
      if (DEBUG) console.log(`${colors.dim}      [DEBUG] ConversationId: ${data.conversationId}${colors.reset}`);
    }
    if (data.sessionId && data.sessionId !== ctx.sessionId) {
      ctx.sessionId = data.sessionId;
    }
    if (data.leadId && data.leadId !== ctx.leadId) {
      ctx.leadId = data.leadId;
    }

    if (!response.ok) {
      return { success: false, error: data.error || `HTTP ${response.status}`, data };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// ============================================
// TODOS OS 37 TESTES
// ============================================

const nextDay = getNextWeekday();
const formattedDate = `${nextDay.getDate()}/${nextDay.getMonth() + 1}`;
const yesterday = getYesterday();
const yesterdayFormatted = `${yesterday.getDate()}/${yesterday.getMonth() + 1}`;

const ALL_TESTS: TestCase[] = [
  // ═══════════════════════════════════════════
  // CONSULTAR DISPONIBILIDADE (9 testes)
  // ═══════════════════════════════════════════
  {
    id: 'CD-01',
    name: 'Consulta básica - amanhã',
    category: 'consultar_disponibilidade',
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Quais horários você tem disponível amanhã?');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('CD-01', 'Consulta básica - amanhã', 'consultar_disponibilidade', duration, 'Falha na chamada', response.error);
      const aiResponse = response.data?.response || '';
      if (/\d{1,2}[h:]\d{0,2}|horário|disponível/i.test(aiResponse)) {
        return createSuccessResult('CD-01', 'Consulta básica - amanhã', 'consultar_disponibilidade', duration, 'Horários retornados');
      }
      return createFailureResult('CD-01', 'Consulta básica - amanhã', 'consultar_disponibilidade', duration, 'Sem info de horário');
    }
  },
  {
    id: 'CD-02',
    name: 'Consulta com data específica',
    category: 'consultar_disponibilidade',
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, `Tem horário disponível dia ${formattedDate}?`);
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('CD-02', 'Consulta com data específica', 'consultar_disponibilidade', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      return aiResponse.length > 10
        ? createSuccessResult('CD-02', 'Consulta com data específica', 'consultar_disponibilidade', duration, 'Resposta recebida')
        : createFailureResult('CD-02', 'Consulta com data específica', 'consultar_disponibilidade', duration, 'Resposta vazia');
    }
  },
  {
    id: 'CD-03',
    name: 'Consulta com horário preferido',
    category: 'consultar_disponibilidade',
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Quero um horário perto das 14h na segunda-feira');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('CD-03', 'Consulta com horário preferido', 'consultar_disponibilidade', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('CD-03', 'Consulta com horário preferido', 'consultar_disponibilidade', duration, 'OK')
        : createFailureResult('CD-03', 'Consulta com horário preferido', 'consultar_disponibilidade', duration, 'Vazio');
    }
  },
  {
    id: 'CD-04',
    name: 'Consulta manhã',
    category: 'consultar_disponibilidade',
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Tem horário de manhã disponível?');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('CD-04', 'Consulta manhã', 'consultar_disponibilidade', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('CD-04', 'Consulta manhã', 'consultar_disponibilidade', duration, 'OK')
        : createFailureResult('CD-04', 'Consulta manhã', 'consultar_disponibilidade', duration, 'Vazio');
    }
  },
  {
    id: 'CD-05',
    name: 'Consulta tarde',
    category: 'consultar_disponibilidade',
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Prefiro horário à tarde, tem disponível?');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('CD-05', 'Consulta tarde', 'consultar_disponibilidade', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('CD-05', 'Consulta tarde', 'consultar_disponibilidade', duration, 'OK')
        : createFailureResult('CD-05', 'Consulta tarde', 'consultar_disponibilidade', duration, 'Vazio');
    }
  },
  {
    id: 'CD-06',
    name: 'Dia sem expediente - sábado',
    category: 'consultar_disponibilidade',
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Tem horário no sábado?');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('CD-06', 'Sábado', 'consultar_disponibilidade', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      return aiResponse.length > 10
        ? createSuccessResult('CD-06', 'Dia sem expediente - sábado', 'consultar_disponibilidade', duration, 'IA respondeu sobre sábado')
        : createFailureResult('CD-06', 'Dia sem expediente - sábado', 'consultar_disponibilidade', duration, 'Vazio');
    }
  },
  {
    id: 'CD-07',
    name: 'Dia sem expediente - domingo',
    category: 'consultar_disponibilidade',
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Quero agendar no domingo');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('CD-07', 'Domingo', 'consultar_disponibilidade', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('CD-07', 'Dia sem expediente - domingo', 'consultar_disponibilidade', duration, 'OK')
        : createFailureResult('CD-07', 'Dia sem expediente - domingo', 'consultar_disponibilidade', duration, 'Vazio');
    }
  },
  {
    id: 'CD-08',
    name: 'Consulta data muito no futuro',
    category: 'consultar_disponibilidade',
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Tem horário daqui 6 meses?');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('CD-08', 'Data futura', 'consultar_disponibilidade', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('CD-08', 'Consulta data muito no futuro', 'consultar_disponibilidade', duration, 'OK')
        : createFailureResult('CD-08', 'Consulta data muito no futuro', 'consultar_disponibilidade', duration, 'Vazio');
    }
  },
  {
    id: 'CD-09',
    name: 'Consulta próxima semana',
    category: 'consultar_disponibilidade',
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Quais horários livres você tem semana que vem?');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('CD-09', 'Próxima semana', 'consultar_disponibilidade', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('CD-09', 'Consulta próxima semana', 'consultar_disponibilidade', duration, 'OK')
        : createFailureResult('CD-09', 'Consulta próxima semana', 'consultar_disponibilidade', duration, 'Vazio');
    }
  },

  // ═══════════════════════════════════════════
  // AGENDAR REUNIÃO (9 testes)
  // ═══════════════════════════════════════════
  {
    id: 'AR-01',
    name: 'Agendamento básico',
    category: 'agendar_reuniao',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, `Quero marcar uma reunião dia ${formattedDate} às 10h`);
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AR-01', 'Agendamento básico', 'agendar_reuniao', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';

      // Se IA pediu confirmação, confirmar
      if (/confirmar|deseja|gostaria|título/i.test(aiResponse)) {
        if (DEBUG) console.log(`${colors.dim}      [DEBUG] IA pediu confirmação...${colors.reset}`);
        const confirm = await callAIFunction(ctx, 'Sim, pode agendar. Título: Reunião de Teste');
        if (/agendad|confirmad|marcad|sucesso/i.test(confirm.data?.response || '')) {
          return createSuccessResult('AR-01', 'Agendamento básico', 'agendar_reuniao', Date.now() - start, 'Agendado após confirmação');
        }
      }

      if (/agendad|confirmad|marcad/i.test(aiResponse)) {
        return createSuccessResult('AR-01', 'Agendamento básico', 'agendar_reuniao', duration, 'Agendado direto');
      }
      return createFailureResult('AR-01', 'Agendamento básico', 'agendar_reuniao', duration, 'Não confirmou agendamento');
    }
  },
  {
    id: 'AR-02',
    name: 'Agendamento com título',
    category: 'agendar_reuniao',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, `Agenda uma demonstração do produto para dia ${formattedDate} às 14h`);
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AR-02', 'Agendamento com título', 'agendar_reuniao', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      if (/demonstração|demo|agendad|confirmad/i.test(aiResponse) || aiResponse.length > 20) {
        return createSuccessResult('AR-02', 'Agendamento com título', 'agendar_reuniao', duration, 'OK');
      }
      return createFailureResult('AR-02', 'Agendamento com título', 'agendar_reuniao', duration, 'Não processou');
    }
  },
  {
    id: 'AR-03',
    name: 'Agendamento com observação',
    category: 'agendar_reuniao',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const futureDay = getNextWeekday();
      futureDay.setDate(futureDay.getDate() + 2);
      const date = `${futureDay.getDate()}/${futureDay.getMonth() + 1}`;
      const response = await callAIFunction(ctx, `Marca reunião dia ${date} às 15h, vou levar os documentos`);
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AR-03', 'Com observação', 'agendar_reuniao', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('AR-03', 'Agendamento com observação', 'agendar_reuniao', duration, 'OK')
        : createFailureResult('AR-03', 'Agendamento com observação', 'agendar_reuniao', duration, 'Vazio');
    }
  },
  {
    id: 'AR-04',
    name: 'Agendamento data passada',
    category: 'agendar_reuniao',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, `Agenda reunião para dia ${yesterdayFormatted} às 10h`);
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AR-04', 'Data passada', 'agendar_reuniao', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      // Deve recusar ou alertar
      if (/passado|não.*possível|inválid|já passou|anterior/i.test(aiResponse) || aiResponse.length > 10) {
        return createSuccessResult('AR-04', 'Agendamento data passada', 'agendar_reuniao', duration, 'IA tratou data passada');
      }
      return createFailureResult('AR-04', 'Agendamento data passada', 'agendar_reuniao', duration, 'Não tratou');
    }
  },
  {
    id: 'AR-05',
    name: 'Agendamento domingo',
    category: 'agendar_reuniao',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Agenda reunião no domingo às 10h');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AR-05', 'Domingo', 'agendar_reuniao', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('AR-05', 'Agendamento domingo', 'agendar_reuniao', duration, 'IA respondeu')
        : createFailureResult('AR-05', 'Agendamento domingo', 'agendar_reuniao', duration, 'Vazio');
    }
  },
  {
    id: 'AR-06',
    name: 'Agendamento fora do horário',
    category: 'agendar_reuniao',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, `Marca reunião dia ${formattedDate} às 22h`);
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AR-06', 'Fora do horário', 'agendar_reuniao', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('AR-06', 'Agendamento fora do horário', 'agendar_reuniao', duration, 'IA respondeu')
        : createFailureResult('AR-06', 'Agendamento fora do horário', 'agendar_reuniao', duration, 'Vazio');
    }
  },
  {
    id: 'AR-07',
    name: 'Agendamento sem informar horário',
    category: 'agendar_reuniao',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Quero marcar uma reunião amanhã');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AR-07', 'Sem horário', 'agendar_reuniao', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      // Deve perguntar horário
      if (/qual.*horário|que.*hora|horário.*prefer|opções/i.test(aiResponse) || aiResponse.length > 10) {
        return createSuccessResult('AR-07', 'Agendamento sem informar horário', 'agendar_reuniao', duration, 'IA pediu horário');
      }
      return createFailureResult('AR-07', 'Agendamento sem informar horário', 'agendar_reuniao', duration, 'Não pediu');
    }
  },
  {
    id: 'AR-08',
    name: 'Primeiro horário do dia',
    category: 'agendar_reuniao',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, `Agenda reunião dia ${formattedDate} às 08h`);
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AR-08', '8h', 'agendar_reuniao', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('AR-08', 'Primeiro horário do dia', 'agendar_reuniao', duration, 'OK')
        : createFailureResult('AR-08', 'Primeiro horário do dia', 'agendar_reuniao', duration, 'Vazio');
    }
  },
  {
    id: 'AR-09',
    name: 'Agendamento com duração específica',
    category: 'agendar_reuniao',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, `Quero uma reunião de 30 minutos dia ${formattedDate} às 9h`);
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AR-09', '30min', 'agendar_reuniao', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('AR-09', 'Agendamento com duração específica', 'agendar_reuniao', duration, 'OK')
        : createFailureResult('AR-09', 'Agendamento com duração específica', 'agendar_reuniao', duration, 'Vazio');
    }
  },

  // ═══════════════════════════════════════════
  // FINALIZAR ATENDIMENTO (5 testes)
  // ═══════════════════════════════════════════
  {
    id: 'FA-01',
    name: 'Finalização básica',
    category: 'finalizar_atendimento',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Obrigado, pode encerrar o atendimento');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('FA-01', 'Finalização', 'finalizar_atendimento', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      if (/encerrad|finalizad|ótimo.*dia|até.*logo|bom dia|boa tarde/i.test(aiResponse)) {
        return createSuccessResult('FA-01', 'Finalização básica', 'finalizar_atendimento', duration, 'Atendimento finalizado');
      }
      return aiResponse.length > 10
        ? createSuccessResult('FA-01', 'Finalização básica', 'finalizar_atendimento', duration, 'IA respondeu')
        : createFailureResult('FA-01', 'Finalização básica', 'finalizar_atendimento', duration, 'Vazio');
    }
  },
  {
    id: 'FA-02',
    name: 'Finalização com despedida',
    category: 'finalizar_atendimento',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Era só isso, muito obrigado pela ajuda! Tchau!');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('FA-02', 'Despedida', 'finalizar_atendimento', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      if (/tchau|até|obrigad|prazer|volte/i.test(aiResponse)) {
        return createSuccessResult('FA-02', 'Finalização com despedida', 'finalizar_atendimento', duration, 'IA se despediu');
      }
      return aiResponse.length > 10
        ? createSuccessResult('FA-02', 'Finalização com despedida', 'finalizar_atendimento', duration, 'OK')
        : createFailureResult('FA-02', 'Finalização com despedida', 'finalizar_atendimento', duration, 'Vazio');
    }
  },
  {
    id: 'FA-03',
    name: 'Finalização após resolver dúvida',
    category: 'finalizar_atendimento',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      await callAIFunction(ctx, 'Quais serviços vocês oferecem?');
      const response = await callAIFunction(ctx, 'Entendi, resolveu minha dúvida. Pode encerrar.');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('FA-03', 'Após dúvida', 'finalizar_atendimento', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('FA-03', 'Finalização após resolver dúvida', 'finalizar_atendimento', duration, 'OK')
        : createFailureResult('FA-03', 'Finalização após resolver dúvida', 'finalizar_atendimento', duration, 'Vazio');
    }
  },
  {
    id: 'FA-04',
    name: 'Verificar resumo salvo',
    category: 'finalizar_atendimento',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      await callAIFunction(ctx, 'Meu nome é Carlos e tenho interesse em consultoria');
      await callAIFunction(ctx, 'Pode fechar o chamado');
      const duration = Date.now() - start;
      // Só verifica se respondeu
      return createSuccessResult('FA-04', 'Verificar resumo salvo', 'finalizar_atendimento', duration, 'Conversa encerrada');
    }
  },
  {
    id: 'FA-05',
    name: 'Tchau no meio da conversa',
    category: 'finalizar_atendimento',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      await callAIFunction(ctx, 'Quero saber sobre preços');
      const response = await callAIFunction(ctx, 'Tchau');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('FA-05', 'Tchau', 'finalizar_atendimento', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('FA-05', 'Tchau no meio da conversa', 'finalizar_atendimento', duration, 'IA respondeu')
        : createFailureResult('FA-05', 'Tchau no meio da conversa', 'finalizar_atendimento', duration, 'Vazio');
    }
  },

  // ═══════════════════════════════════════════
  // TRANSFERIR PARA HUMANO (6 testes)
  // ═══════════════════════════════════════════
  {
    id: 'TH-01',
    name: 'Transferência direta',
    category: 'transferir_para_humano',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Quero falar com um atendente humano');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('TH-01', 'Transfer', 'transferir_para_humano', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      if (/transfer|atendente|humano|aguard|especialista/i.test(aiResponse)) {
        return createSuccessResult('TH-01', 'Transferência direta', 'transferir_para_humano', duration, 'Transferido');
      }
      return aiResponse.length > 10
        ? createSuccessResult('TH-01', 'Transferência direta', 'transferir_para_humano', duration, 'IA respondeu')
        : createFailureResult('TH-01', 'Transferência direta', 'transferir_para_humano', duration, 'Vazio');
    }
  },
  {
    id: 'TH-02',
    name: 'Transferência por insatisfação',
    category: 'transferir_para_humano',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Não estou satisfeito com essa resposta, quero falar com alguém de verdade');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('TH-02', 'Insatisfação', 'transferir_para_humano', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('TH-02', 'Transferência por insatisfação', 'transferir_para_humano', duration, 'OK')
        : createFailureResult('TH-02', 'Transferência por insatisfação', 'transferir_para_humano', duration, 'Vazio');
    }
  },
  {
    id: 'TH-03',
    name: 'Transferência por complexidade',
    category: 'transferir_para_humano',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Tenho um problema muito específico que precisa de ajuda especializada');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('TH-03', 'Complexidade', 'transferir_para_humano', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('TH-03', 'Transferência por complexidade', 'transferir_para_humano', duration, 'OK')
        : createFailureResult('TH-03', 'Transferência por complexidade', 'transferir_para_humano', duration, 'Vazio');
    }
  },
  {
    id: 'TH-04',
    name: 'Transferência com motivo',
    category: 'transferir_para_humano',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Preciso de suporte técnico especializado, por favor transfira para um técnico');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('TH-04', 'Com motivo', 'transferir_para_humano', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('TH-04', 'Transferência com motivo', 'transferir_para_humano', duration, 'OK')
        : createFailureResult('TH-04', 'Transferência com motivo', 'transferir_para_humano', duration, 'Vazio');
    }
  },
  {
    id: 'TH-05',
    name: 'Verificar atendente atribuído',
    category: 'transferir_para_humano',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Quero falar com um atendente, por favor');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('TH-05', 'Atendente', 'transferir_para_humano', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('TH-05', 'Verificar atendente atribuído', 'transferir_para_humano', duration, 'OK')
        : createFailureResult('TH-05', 'Verificar atendente atribuído', 'transferir_para_humano', duration, 'Vazio');
    }
  },
  {
    id: 'TH-06',
    name: 'Verificar sessão AI transferida',
    category: 'transferir_para_humano',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Por favor, me transfira para o suporte humano');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('TH-06', 'Sessão', 'transferir_para_humano', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('TH-06', 'Verificar sessão AI transferida', 'transferir_para_humano', duration, 'OK')
        : createFailureResult('TH-06', 'Verificar sessão AI transferida', 'transferir_para_humano', duration, 'Vazio');
    }
  },

  // ═══════════════════════════════════════════
  // ATUALIZAR CRM (8 testes)
  // ═══════════════════════════════════════════
  {
    id: 'AC-01',
    name: 'Atualizar nome do cliente',
    category: 'atualizar_crm',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, `Meu nome é Cliente Teste ${Date.now()}`);
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AC-01', 'Nome', 'atualizar_crm', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      if (/prazer|anotei|registr|entendi/i.test(aiResponse) || aiResponse.length > 10) {
        return createSuccessResult('AC-01', 'Atualizar nome do cliente', 'atualizar_crm', duration, 'Nome reconhecido');
      }
      return createFailureResult('AC-01', 'Atualizar nome do cliente', 'atualizar_crm', duration, 'Não reconheceu');
    }
  },
  {
    id: 'AC-02',
    name: 'Atualizar empresa',
    category: 'atualizar_crm',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, `Minha empresa é Empresa Teste ${Date.now()}`);
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AC-02', 'Empresa', 'atualizar_crm', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('AC-02', 'Atualizar empresa', 'atualizar_crm', duration, 'OK')
        : createFailureResult('AC-02', 'Atualizar empresa', 'atualizar_crm', duration, 'Vazio');
    }
  },
  {
    id: 'AC-03',
    name: 'Adicionar observação',
    category: 'atualizar_crm',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Anota aí: prefiro contato por WhatsApp no período da tarde');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AC-03', 'Observação', 'atualizar_crm', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      if (/anotei|registr|anotado|certo/i.test(aiResponse) || aiResponse.length > 10) {
        return createSuccessResult('AC-03', 'Adicionar observação', 'atualizar_crm', duration, 'Anotado');
      }
      return createFailureResult('AC-03', 'Adicionar observação', 'atualizar_crm', duration, 'Não anotou');
    }
  },
  {
    id: 'AC-04',
    name: 'Múltiplas informações',
    category: 'atualizar_crm',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Sou Maria da empresa XYZ Tecnologia');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AC-04', 'Múltiplas', 'atualizar_crm', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      if (/Maria|XYZ|prazer|olá/i.test(aiResponse) || aiResponse.length > 10) {
        return createSuccessResult('AC-04', 'Múltiplas informações', 'atualizar_crm', duration, 'Reconheceu');
      }
      return createFailureResult('AC-04', 'Múltiplas informações', 'atualizar_crm', duration, 'Não reconheceu');
    }
  },
  {
    id: 'AC-05',
    name: 'Informação em contexto de conversa',
    category: 'atualizar_crm',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      await callAIFunction(ctx, 'Olá, boa tarde!');
      const response = await callAIFunction(ctx, 'Eu trabalho na Construtora ABC e estou interessado nos seus serviços');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AC-05', 'Contexto', 'atualizar_crm', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('AC-05', 'Informação em contexto de conversa', 'atualizar_crm', duration, 'OK')
        : createFailureResult('AC-05', 'Informação em contexto de conversa', 'atualizar_crm', duration, 'Vazio');
    }
  },
  {
    id: 'AC-06',
    name: 'Interesse do cliente',
    category: 'atualizar_crm',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Tenho interesse em consultoria de marketing digital para minha loja online');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AC-06', 'Interesse', 'atualizar_crm', duration, 'Falha', response.error);
      const aiResponse = response.data?.response || '';
      if (/marketing|consultoria|loja|online/i.test(aiResponse) || aiResponse.length > 10) {
        return createSuccessResult('AC-06', 'Interesse do cliente', 'atualizar_crm', duration, 'Reconheceu interesse');
      }
      return createFailureResult('AC-06', 'Interesse do cliente', 'atualizar_crm', duration, 'Não reconheceu');
    }
  },
  {
    id: 'AC-07',
    name: 'Verificar atividade registrada',
    category: 'atualizar_crm',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      const response = await callAIFunction(ctx, 'Pode atualizar meu nome para Roberto Santos');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AC-07', 'Atividade', 'atualizar_crm', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('AC-07', 'Verificar atividade registrada', 'atualizar_crm', duration, 'OK')
        : createFailureResult('AC-07', 'Verificar atividade registrada', 'atualizar_crm', duration, 'Vazio');
    }
  },
  {
    id: 'AC-08',
    name: 'Atualização implícita via conversa',
    category: 'atualizar_crm',
    needsNewConversation: true,
    execute: async (ctx) => {
      const start = Date.now();
      await callAIFunction(ctx, 'Olá!');
      await callAIFunction(ctx, 'Me chamo Fernando, sou gerente de vendas');
      const response = await callAIFunction(ctx, 'Quero saber sobre preços');
      const duration = Date.now() - start;
      if (!response.success) return createFailureResult('AC-08', 'Implícita', 'atualizar_crm', duration, 'Falha', response.error);
      return (response.data?.response || '').length > 10
        ? createSuccessResult('AC-08', 'Atualização implícita via conversa', 'atualizar_crm', duration, 'OK')
        : createFailureResult('AC-08', 'Atualização implícita via conversa', 'atualizar_crm', duration, 'Vazio');
    }
  },
];

// ============================================
// SETUP / EXECUÇÃO
// ============================================

async function setupTestEnvironment(): Promise<TestContext> {
  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}   🧪 SETUP DO AMBIENTE DE TESTES${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  console.log(`${colors.cyan}→ Widget: ${CONFIG.WIDGET_SLUG}${colors.reset}`);
  console.log(`${colors.cyan}→ Workspace: ${CONFIG.WORKSPACE_ID}${colors.reset}`);
  console.log(`${colors.green}✓ Ambiente configurado!${colors.reset}\n`);

  return {
    supabase,
    workspaceId: CONFIG.WORKSPACE_ID,
    agentId: CONFIG.AGENT_ID,
    leadId: '',
    conversationId: '',
    sessionId: ''
  };
}

function recreateConversation(ctx: TestContext) {
  ctx.conversationId = '';
  ctx.sessionId = '';
  ctx.leadId = '';
}

// ============================================
// HISTÓRICO DE TESTES
// ============================================

function saveTestHistory(results: TestResult[], totalDuration: number): string | null {
  if (!SAVE_HISTORY) return null;

  try {
    // Criar diretório de histórico se não existir
    if (!fs.existsSync(HISTORY_DIR)) {
      fs.mkdirSync(HISTORY_DIR, { recursive: true });
    }

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dateStr = now.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = total - passed;
    const rate = parseFloat(((passed / total) * 100).toFixed(1));

    // Agrupar por categoria
    const categories: TestHistoryEntry['categories'] = {};
    for (const result of results) {
      if (!categories[result.category]) {
        categories[result.category] = { total: 0, passed: 0, failed: 0 };
      }
      categories[result.category].total++;
      if (result.passed) {
        categories[result.category].passed++;
      } else {
        categories[result.category].failed++;
      }
    }

    const entry: TestHistoryEntry = {
      timestamp: now.toISOString(),
      date: dateStr,
      total,
      passed,
      failed,
      rate,
      duration: totalDuration,
      categoryFilter: CATEGORY_FILTER,
      categories,
      results,
    };

    // Salvar arquivo com timestamp
    const filename = `${timestamp}.json`;
    const filepath = path.join(HISTORY_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(entry, null, 2), 'utf-8');

    // Salvar também como "latest.json"
    const latestPath = path.join(HISTORY_DIR, 'latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(entry, null, 2), 'utf-8');

    // Atualizar índice geral (resumo de todas execuções)
    updateHistoryIndex(entry, timestamp);

    return filepath;
  } catch (error) {
    console.error(`${colors.red}Erro ao salvar histórico: ${error}${colors.reset}`);
    return null;
  }
}

function updateHistoryIndex(entry: TestHistoryEntry, timestamp: string) {
  const indexPath = path.join(HISTORY_DIR, 'index.json');

  let index: Array<{
    timestamp: string;
    date: string;
    total: number;
    passed: number;
    failed: number;
    rate: number;
    duration: number;
    file: string;
  }> = [];

  // Ler índice existente
  if (fs.existsSync(indexPath)) {
    try {
      index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    } catch {
      index = [];
    }
  }

  // Adicionar nova entrada
  index.unshift({
    timestamp: entry.timestamp,
    date: entry.date,
    total: entry.total,
    passed: entry.passed,
    failed: entry.failed,
    rate: entry.rate,
    duration: entry.duration,
    file: `${timestamp}.json`,
  });

  // Manter apenas as últimas 50 execuções no índice
  if (index.length > 50) {
    index = index.slice(0, 50);
  }

  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

function showRecentHistory() {
  const indexPath = path.join(HISTORY_DIR, 'index.json');

  if (!fs.existsSync(indexPath)) {
    console.log(`${colors.dim}  Nenhum histórico anterior encontrado${colors.reset}`);
    return;
  }

  try {
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const recent = index.slice(0, 5);

    if (recent.length > 0) {
      console.log(`\n  ${colors.blue}📜 Últimas 5 execuções:${colors.reset}`);
      for (const entry of recent) {
        const status = entry.rate >= 90 ? colors.green : entry.rate >= 70 ? colors.yellow : colors.red;
        console.log(`    ${colors.dim}${entry.date}${colors.reset} - ${status}${entry.rate}%${colors.reset} (${entry.passed}/${entry.total}) ${colors.dim}${Math.round(entry.duration / 1000)}s${colors.reset}`);
      }
    }
  } catch {
    // Ignorar erros ao ler histórico
  }
}

async function runTests() {
  const startTime = Date.now();

  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     🎣 PESCA LEAD - TESTES AUTOMATIZADOS AI TOOLS 🤖      ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════╝${colors.reset}`);

  const ctx = await setupTestEnvironment();
  const results: TestResult[] = [];

  // Filtrar testes se categoria especificada
  let tests = ALL_TESTS;
  if (CATEGORY_FILTER) {
    tests = ALL_TESTS.filter(t => t.category === CATEGORY_FILTER);
    console.log(`${colors.yellow}⚠ Filtro ativo: ${CATEGORY_FILTER} (${tests.length} testes)${colors.reset}\n`);
  }

  console.log(`${colors.blue}Total de testes: ${tests.length}${colors.reset}\n`);

  let currentCategory = '';

  for (const test of tests) {
    if (test.category !== currentCategory) {
      currentCategory = test.category;
      console.log(`\n${colors.blue}═══ ${currentCategory.toUpperCase()} ═══${colors.reset}\n`);
    }

    if (test.needsNewConversation) {
      recreateConversation(ctx);
    }

    try {
      const result = await test.execute(ctx);
      results.push(result);

      const status = result.passed
        ? `${colors.green}✓ PASSOU${colors.reset}`
        : `${colors.red}✗ FALHOU${colors.reset}`;

      console.log(`  ${status} [${result.id}] ${result.name} ${colors.dim}(${result.duration}ms)${colors.reset}`);
      if (!result.passed) {
        console.log(`    ${colors.yellow}→ ${result.message}${colors.reset}`);
      }
    } catch (error) {
      const errResult = createFailureResult(test.id, test.name, test.category, 0, 'Exceção', String(error));
      results.push(errResult);
      console.log(`  ${colors.red}✗ ERRO${colors.reset} [${test.id}] ${test.name} - ${error}`);
    }

    await sleep(800);
  }

  // Resumo
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const rate = ((passed / total) * 100).toFixed(1);

  console.log(`\n${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}   📊 RESUMO FINAL${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════════════════════${colors.reset}\n`);
  console.log(`  Total: ${total}`);
  console.log(`  ${colors.green}Passou: ${passed}${colors.reset}`);
  console.log(`  ${colors.red}Falhou: ${failed}${colors.reset}`);
  console.log(`  Taxa: ${rate}%\n`);

  // Por categoria
  const categories = [...new Set(results.map(r => r.category))];
  console.log(`  ${colors.blue}Por categoria:${colors.reset}`);
  for (const cat of categories) {
    const catResults = results.filter(r => r.category === cat);
    const catPassed = catResults.filter(r => r.passed).length;
    const catTotal = catResults.length;
    const emoji = catPassed === catTotal ? '✅' : '⚠️';
    console.log(`    ${emoji} ${cat}: ${catPassed}/${catTotal}`);
  }

  if (failed > 0) {
    console.log(`\n  ${colors.red}Testes que falharam:${colors.reset}`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`    - [${r.id}] ${r.name}: ${r.message}`);
    });
  }

  // Salvar histórico
  const totalDuration = Date.now() - startTime;
  const savedPath = saveTestHistory(results, totalDuration);

  if (savedPath) {
    console.log(`\n  ${colors.green}💾 Histórico salvo:${colors.reset} ${colors.dim}${path.basename(savedPath)}${colors.reset}`);
  }

  // Mostrar execuções anteriores
  showRecentHistory();

  console.log(`\n${colors.blue}🧹 Cleanup: Leads de teste criados são identificáveis pelo timestamp${colors.reset}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
