// =============================================================================
// COLUMNS ROUTES
// =============================================================================
// Rotas relacionadas a colunas do kanban
// =============================================================================

import { Hono } from 'npm:hono@4';
import { getColumns, getColumn } from '../services/columns.service.ts';
import { getColumnLeads } from '../services/leads.service.ts';
import type { LeadFilters } from '../types.ts';

const router = new Hono();

// GET /workspaces/:workspaceId/funnels/:funnelId/columns
// Lista todas as colunas de um funil
router.get('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    const columns = await getColumns(workspaceId, funnelId);
    return c.json({ columns });
  } catch (error: any) {
    console.error('Get columns error:', error);
    return c.json({ error: error.message || 'Failed to get columns' }, 500);
  }
});

// GET /workspaces/:workspaceId/funnels/:funnelId/columns/:columnId/leads
// Busca leads de uma coluna específica com paginação e filtros
// IMPORTANTE: Esta rota deve vir ANTES de /:columnId para evitar conflito
router.get('/:columnId/leads', async (c) => {
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

// GET /workspaces/:workspaceId/funnels/:funnelId/columns/:columnId
// Busca uma coluna específica
router.get('/:columnId', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    const columnId = c.req.param('columnId');
    const column = await getColumn(workspaceId, funnelId, columnId);
    
    if (!column) {
      return c.json({ error: 'Column not found' }, 404);
    }
    
    return c.json({ column });
  } catch (error: any) {
    console.error('Get column error:', error);
    return c.json({ error: error.message || 'Failed to get column' }, 500);
  }
});

export { router as columnsRouter };

