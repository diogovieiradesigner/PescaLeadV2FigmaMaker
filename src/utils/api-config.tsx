import { projectId, publicAnonKey } from './supabase/info';

/**
 * API Configuration
 * 
 * NO FIGMA MAKE:
 * - URL base usa o prefixo /make-server-e4f9d774/
 * 
 * QUANDO EXPORTAR PARA SEU SUPABASE:
 * 1. Mude API_BASE_URL para: `https://${SEU_PROJECT_ID}.supabase.co/functions/v1/server`
 * 2. Atualize projectId e publicAnonKey para os valores do seu projeto
 * 3. No servidor (index.tsx), remova o prefixo /make-server-e4f9d774/ de todas as rotas
 */

// Base URL da API
// Usa env var (OBRIGATÓRIO - sem fallback)
export const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/make-server-e4f9d774`;

// Supabase Config
// Usa env vars (OBRIGATÓRIO - sem fallback)
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Helper para fazer chamadas autenticadas à API
 * ✅ IMPORTANTE: Sempre inclui apikey header (exigido pelo Kong no self-hosted)
 */
export async function apiCall(
  endpoint: string,
  options: RequestInit = {},
  accessToken?: string
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY, // ✅ OBRIGATÓRIO: Kong exige apikey
    ...options.headers,
  };

  // Se tiver token de acesso (usuário logado), usa ele
  // Senão, usa a anon key pública
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    console.error(`API Error [${endpoint}]:`, data);
    throw new Error(data.error || 'API request failed');
  }

  return data;
}

/**
 * Endpoints da API para facilitar uso
 */
export const API_ENDPOINTS = {
  // Auth
  signup: '/auth/signup',
  
  // User
  profile: '/user/profile',
  workspaces: '/user/workspaces',
  switchWorkspace: '/user/switch-workspace',
  
  // Workspaces
  createWorkspace: '/workspaces',
  getWorkspace: (id: string) => `/workspaces/${id}`,
  updateWorkspace: (id: string) => `/workspaces/${id}`,
  deleteWorkspace: (id: string) => `/workspaces/${id}`,
  
  // Members
  getMembers: (workspaceId: string) => `/workspaces/${workspaceId}/members`,
  inviteMember: (workspaceId: string) => `/workspaces/${workspaceId}/members`,
  updateMember: (workspaceId: string, userId: string) => `/workspaces/${workspaceId}/members/${userId}`,
  removeMember: (workspaceId: string, userId: string) => `/workspaces/${workspaceId}/members/${userId}`,
};

/**
 * Helper para fazer chamadas autenticadas a Edge Functions
 * (alternativa ao apiCall para uso direto sem passar pelo make-server)
 *
 * @example
 * const data = await edgeFunctionCall('/kanban-api/workspaces/123/funnels', token);
 */
export async function edgeFunctionCall(
  path: string, // Ex: '/kanban-api/health' ou '/kanban-api/workspaces/123/funnels'
  accessToken?: string,
  options: RequestInit = {}
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY, // ✅ OBRIGATÓRIO: Kong exige apikey
    ...options.headers,
  };

  // Se tiver token de acesso (usuário logado), usa ele
  // Senão, usa a anon key pública
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    headers['Authorization'] = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  // Garantir que path começa com /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${SUPABASE_URL}/functions/v1${normalizedPath}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type');
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;

    if (contentType && contentType.includes('application/json')) {
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Ignorar erro de parse
      }
    }

    console.error(`Edge Function Error [${path}]:`, errorMessage);
    throw new Error(errorMessage);
  }

  return response.json();
}

// Debug: Mostrar configuração atual no console
console.log('🔧 Supabase Config:', {
  SUPABASE_URL,
  API_BASE_URL,
  ANON_KEY_PREFIX: SUPABASE_ANON_KEY.substring(0, 50) + '...',
  ENV_VITE_URL: import.meta.env.VITE_SUPABASE_URL,
  ENV_LOADED: !!import.meta.env.VITE_SUPABASE_URL
});
