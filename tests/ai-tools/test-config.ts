/**
 * Configuração dos Testes Automatizados das AI Tools
 */

export const CONFIG = {
  // Supabase
  SUPABASE_URL: 'https://nlbcwaxkeaddfocigwuk.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sYmN3YXhrZWFkZGZvY2lnd3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzIwNTU0OTUsImV4cCI6MjA0NzYzMTQ5NX0.CgaXrV50ygPwfC2z68U0-knnLwmFVp7J91Ijvf26svE',

  // IDs de teste (serão criados dinamicamente ou usar existentes)
  TEST_WORKSPACE_ID: '', // Será preenchido no setup
  TEST_AGENT_ID: '',     // Será preenchido no setup
  TEST_LEAD_ID: '',      // Será preenchido no setup

  // Timeouts
  REQUEST_TIMEOUT: 30000,

  // Endpoints
  EDGE_FUNCTION_URL: 'https://nlbcwaxkeaddfocigwuk.supabase.co/functions/v1/ai-process-conversation',
};

export interface TestResult {
  id: string;
  name: string;
  category: string;
  passed: boolean;
  message: string;
  duration: number;
  details?: Record<string, unknown>;
  error?: string;
}

export interface TestContext {
  supabase: any;
  workspaceId: string;
  agentId: string;
  leadId: string;
  conversationId: string;
  sessionId: string;
}

export interface TestCase {
  id: string;
  name: string;
  category: string;
  setup?: (ctx: TestContext) => Promise<void>;
  execute: (ctx: TestContext) => Promise<TestResult>;
  cleanup?: (ctx: TestContext) => Promise<void>;
}
