// =============================================================================
// KANBAN API - Edge Function Otimizada
// =============================================================================
// Arquitetura modular para suportar 10k-50k leads com performance
// Carregamento lazy: apenas 10 leads por coluna inicialmente
// Filtros aplicados no backend para máxima eficiência
// =============================================================================

import { Hono } from 'npm:hono@4';
import { cors } from 'npm:hono@4/cors';
import { auth } from './middleware/auth.ts';
import { workspace } from './middleware/workspace.ts';
import { funnelsRouter } from './routes/funnels.ts';
import { columnsRouter } from './routes/columns.ts';
import { leadsRouter } from './routes/leads.ts';
import { statsRouter } from './routes/stats.ts';

const app = new Hono();

// =============================================================================
// MIDDLEWARE GLOBAL
// =============================================================================

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'apikey', 'x-client-info'],
  exposeHeaders: ['Content-Length', 'X-JSON'],
  credentials: true,
}));

// =============================================================================
// HEALTH CHECK (Público - sem autenticação)
// =============================================================================

app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    service: 'kanban-api',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// ROTAS (Protegidas - requerem autenticação)
// =============================================================================


// Aplicar middleware de autenticação e workspace em todas as rotas
app.use('/workspaces/:workspaceId/*', auth);
app.use('/workspaces/:workspaceId/*', workspace);

// Rotas modulares
// IMPORTANTE: app.route() registra o router como um sub-router
// A rota base é passada e o router adiciona suas rotas relativas
app.route('/workspaces/:workspaceId/funnels', funnelsRouter);
app.route('/workspaces/:workspaceId/funnels/:funnelId/columns', columnsRouter);
app.route('/workspaces/:workspaceId/funnels/:funnelId/leads', leadsRouter);
app.route('/workspaces/:workspaceId/funnels/:funnelId/stats', statsRouter);

// Debug: Testar se a rota está sendo registrada
app.all('*', (c) => {
  console.log('[DEBUG] Rota não encontrada:', c.req.path, c.req.method);
  return c.json({ 
    error: 'Route not found',
    path: c.req.path,
    method: c.req.method,
    availableRoutes: [
      'GET /health',
      'GET /workspaces/:workspaceId/funnels',
      'GET /workspaces/:workspaceId/funnels/:funnelId/columns',
      'GET /workspaces/:workspaceId/funnels/:funnelId/leads',
      'GET /workspaces/:workspaceId/funnels/:funnelId/stats'
    ]
  }, 404);
});

// Debug: Log todas as rotas registradas
console.log('[KANBAN-API] Rotas registradas:');
console.log('  - GET /health');
console.log('  - GET /workspaces/:workspaceId/funnels');
console.log('  - GET /workspaces/:workspaceId/funnels/:funnelId/columns');
console.log('  - GET /workspaces/:workspaceId/funnels/:funnelId/leads');
console.log('  - GET /workspaces/:workspaceId/funnels/:funnelId/stats');

// =============================================================================
// ERROR HANDLER
// =============================================================================

app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ 
    error: err.message || 'Internal server error',
    status: 500 
  }, 500);
});

// =============================================================================
// EXPORT
// =============================================================================

// Handler principal que intercepta a requisição e remove /kanban-api do path
// IMPORTANTE: Supabase Edge Functions passa o nome da função como parte do path
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  let pathname = url.pathname;
  
  // Remover /kanban-api do início do path se presente
  if (pathname.startsWith('/kanban-api')) {
    pathname = pathname.substring('/kanban-api'.length) || '/';
    // Criar nova URL com pathname corrigido
    const newUrl = new URL(pathname + url.search, url.origin);
    // Criar novo Request com URL corrigida
    req = new Request(newUrl.toString(), {
      method: req.method,
      headers: req.headers,
      body: req.body,
    });
    console.log('[PATH-FIX] Path corrigido:', url.pathname, '->', pathname);
  }
  
  // Passar requisição corrigida para o Hono
  return app.fetch(req);
});

