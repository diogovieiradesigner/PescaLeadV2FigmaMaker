// =============================================================================
// STATS ROUTES
// =============================================================================
// Rotas relacionadas a estatísticas do funil
// =============================================================================

import { Hono } from 'npm:hono@4';
import { getFunnelStats, recalculateStats } from '../services/stats.service.ts';

const router = new Hono();

// GET /workspaces/:workspaceId/funnels/:funnelId/stats
// Busca estatísticas do funil
router.get('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    const stats = await getFunnelStats(workspaceId, funnelId);
    return c.json({ stats });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return c.json({ error: error.message || 'Failed to get stats' }, 500);
  }
});

// POST /workspaces/:workspaceId/funnels/:funnelId/stats/recalculate
// Recalcula estatísticas do funil manualmente
router.post('/recalculate', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    
    const stats = await recalculateStats(workspaceId, funnelId);
    
    return c.json({ stats });
  } catch (error: any) {
    console.error('Recalculate stats error:', error);
    return c.json({ error: error.message || 'Failed to recalculate stats' }, 500);
  }
});

export { router as statsRouter };

