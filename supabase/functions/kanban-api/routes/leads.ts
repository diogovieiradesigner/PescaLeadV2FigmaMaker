// =============================================================================
// LEADS ROUTES
// =============================================================================
// Rotas relacionadas a leads - OTIMIZADAS PARA PERFORMANCE
// =============================================================================

import { Hono } from 'npm:hono@4';
import { 
  getColumnLeads, 
  getFunnelLeadsInitial, 
  getLead,
  createLead,
  updateLead,
  moveLead,
  batchMoveLeads,
  deleteLead
} from '../services/leads.service.ts';
import type { LeadFilters } from '../types.ts';

const router = new Hono();

// IMPORTANTE: Ordem das rotas importa no Hono!
// Rotas mais específicas devem vir ANTES de rotas genéricas
// Exemplo: /columns/:columnId/leads deve vir ANTES de /:leadId

// GET /workspaces/:workspaceId/funnels/:funnelId/leads
// Busca leads iniciais de todas as colunas (10 por coluna por padrão)
// OTIMIZADO: Carregamento paralelo de todas as colunas
// Aceita query params: limit (opcional, padrão 10), mode (ignorado), hasEmail, hasWhatsapp, searchQuery
router.get('/', async (c) => {
  try {
    console.log('[LEADS] GET /leads - Iniciando...');
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    console.log('[LEADS] workspaceId:', workspaceId, 'funnelId:', funnelId);
    
    // Parsear limit (opcional, padrão 10)
    const limitParam = c.req.query('limit');
    const initialLimit = limitParam ? Math.min(parseInt(limitParam) || 10, 100) : 10;
    
    // Buscar colunas do funil
    const { getSupabase } = await import('../database/client.ts');
    const supabase = getSupabase();
    
    const { data: columns, error: columnsError } = await supabase
      .from('funnel_columns')
      .select('id')
      .eq('funnel_id', funnelId)
      .order('position', { ascending: true });
    
    if (columnsError) {
      throw new Error(`Failed to fetch columns: ${columnsError.message}`);
    }
    
    if (!columns || columns.length === 0) {
      return c.json({ columns: {} });
    }
    
    const columnIds = columns.map(col => col.id);
    
    // Parsear filtros dos query parameters
    const filters: LeadFilters = {};
    const hasEmail = c.req.query('hasEmail');
    const hasWhatsapp = c.req.query('hasWhatsapp');
    const searchQuery = c.req.query('searchQuery');
    
    if (hasEmail === 'true') filters.hasEmail = true;
    if (hasWhatsapp === 'true') filters.hasWhatsapp = true;
    if (searchQuery) filters.searchQuery = searchQuery;
    
    // Buscar leads iniciais de todas as colunas em paralelo
    const leadsByColumn = await getFunnelLeadsInitial(
      workspaceId,
      funnelId,
      columnIds,
      {
        limit: initialLimit,
        offset: 0,
        filters: Object.keys(filters).length > 0 ? filters : undefined
      }
    );
    
    // Log detalhado do que está sendo retornado
    console.log('[LEADS] ✅ Leads encontrados por coluna:', {
      totalColumns: Object.keys(leadsByColumn).length,
      columns: Object.keys(leadsByColumn).map(colId => ({
        columnId: colId,
        leadsCount: leadsByColumn[colId]?.leads?.length || 0,
        total: leadsByColumn[colId]?.total || 0,
        hasMore: leadsByColumn[colId]?.hasMore || false
      }))
    });
    
    // Log do JSON completo que será retornado (primeiros 500 chars para não sobrecarregar)
    const responseJson = JSON.stringify({ columns: leadsByColumn });
    console.log('[LEADS] 📦 JSON completo (primeiros 500 chars):', responseJson.substring(0, 500));
    
    return c.json({ columns: leadsByColumn });
  } catch (error: any) {
    console.error('Get funnel leads error:', error);
    return c.json({ error: error.message || 'Failed to get funnel leads' }, 500);
  }
});

// GET /workspaces/:workspaceId/funnels/:funnelId/leads/batch-move (POST, mas incluído aqui para referência)
// Esta rota é POST, então não conflita

// GET /workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads
// Busca leads de uma coluna específica com paginação e filtros
// IMPORTANTE: Esta rota deve vir ANTES de /:leadId para evitar conflito
router.get('/columns/:columnId/leads', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    const columnId = c.req.param('columnId');
    
    // Parsear paginação
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = parseInt(c.req.query('offset') || '0');
    
    // Parsear filtros
    const filters: LeadFilters = {};
    const hasEmail = c.req.query('hasEmail');
    const hasWhatsapp = c.req.query('hasWhatsapp');
    const searchQuery = c.req.query('searchQuery');
    const priority = c.req.query('priority') as 'high' | 'medium' | 'low' | undefined;
    const assigneeId = c.req.query('assigneeId');
    const tags = c.req.query('tags');
    
    if (hasEmail === 'true') filters.hasEmail = true;
    if (hasWhatsapp === 'true') filters.hasWhatsapp = true;
    if (searchQuery) filters.searchQuery = searchQuery;
    if (priority) filters.priority = priority;
    if (assigneeId) filters.assigneeId = assigneeId;
    if (tags) filters.tags = tags.split(',');
    
    const result = await getColumnLeads(workspaceId, funnelId, columnId, {
      limit,
      offset,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
    });
    
    return c.json(result);
  } catch (error: any) {
    console.error('Get column leads error:', error);
    return c.json({ error: error.message || 'Failed to get column leads' }, 500);
  }
});

// GET /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId
// Busca um lead específico
router.get('/:leadId', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const leadId = c.req.param('leadId');
    const lead = await getLead(workspaceId, leadId);
    
    if (!lead) {
      return c.json({ error: 'Lead not found' }, 404);
    }
    
    return c.json({ lead });
  } catch (error: any) {
    console.error('Get lead error:', error);
    return c.json({ error: error.message || 'Failed to get lead' }, 500);
  }
});

// POST /workspaces/:workspaceId/funnels/:funnelId/leads/batch-move
// Move múltiplos leads de uma vez
router.post('/batch-move', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    
    const { moves } = await c.req.json();
    
    if (!moves || !Array.isArray(moves)) {
      return c.json({ error: 'moves array is required' }, 400);
    }
    
    const results = await batchMoveLeads(workspaceId, moves, userId);
    
    return c.json({ results });
  } catch (error: any) {
    console.error('Batch move error:', error);
    return c.json({ error: error.message || 'Failed to batch move' }, 500);
  }
});

// POST /workspaces/:workspaceId/funnels/:funnelId/leads
// Cria um novo lead
router.post('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const funnelId = c.req.param('funnelId');
    
    const leadData = await c.req.json();
    
    if (!leadData.clientName || !leadData.column_id) {
      return c.json({ error: 'clientName and column_id are required' }, 400);
    }
    
    const lead = await createLead(
      workspaceId,
      funnelId,
      leadData.column_id,
      leadData,
      userId
    );
    
    return c.json({ lead });
  } catch (error: any) {
    console.error('Create lead error:', error);
    return c.json({ error: error.message || 'Failed to create lead' }, 500);
  }
});

// PUT /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId
// Atualiza um lead
router.put('/:leadId', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const leadId = c.req.param('leadId');
    
    const updates = await c.req.json();
    
    const updatedLead = await updateLead(workspaceId, leadId, updates, userId);
    
    return c.json({ lead: updatedLead });
  } catch (error: any) {
    console.error('Update lead error:', error);
    return c.json({ error: error.message || 'Failed to update lead' }, 500);
  }
});

// POST /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId/move
// Move lead entre colunas (drag & drop)
router.post('/:leadId/move', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const leadId = c.req.param('leadId');
    
    const { toColumnId, toPosition } = await c.req.json();
    
    if (!toColumnId || toPosition === undefined) {
      return c.json({ error: 'toColumnId and toPosition are required' }, 400);
    }
    
    const updatedLead = await moveLead(
      workspaceId,
      leadId,
      toColumnId,
      toPosition,
      userId
    );
    
    return c.json({ lead: updatedLead });
  } catch (error: any) {
    console.error('Move lead error:', error);
    return c.json({ error: error.message || 'Failed to move lead' }, 500);
  }
});

// DELETE /workspaces/:workspaceId/funnels/:funnelId/leads/:leadId
// Deleta um lead
router.delete('/:leadId', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    const leadId = c.req.param('leadId');
    
    await deleteLead(workspaceId, leadId, userId);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Delete lead error:', error);
    return c.json({ error: error.message || 'Failed to delete lead' }, 500);
  }
});

export { router as leadsRouter };

