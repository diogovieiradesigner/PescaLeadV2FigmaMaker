// =============================================================================
// FUNNELS ROUTES
// =============================================================================
// Rotas relacionadas a funis (kanbans)
// =============================================================================

import { Hono } from 'npm:hono@4';
import { getFunnels, getFunnel, createFunnel, updateFunnel, deleteFunnel } from '../services/funnels.service.ts';

const router = new Hono();

// GET /workspaces/:workspaceId/funnels
// Lista todos os funis do workspace
router.get('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnels = await getFunnels(workspaceId);
    return c.json({ funnels });
  } catch (error: any) {
    console.error('Get funnels error:', error);
    return c.json({ error: error.message || 'Failed to get funnels' }, 500);
  }
});

// GET /workspaces/:workspaceId/funnels/:funnelId
// Busca um funil específico
router.get('/:funnelId', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    const funnel = await getFunnel(workspaceId, funnelId);
    
    if (!funnel) {
      return c.json({ error: 'Funnel not found' }, 404);
    }
    
    return c.json({ funnel });
  } catch (error: any) {
    console.error('Get funnel error:', error);
    return c.json({ error: error.message || 'Failed to get funnel' }, 500);
  }
});

// POST /workspaces/:workspaceId/funnels
// Cria um novo funil
router.post('/', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const userId = c.get('userId');
    
    const { name, description } = await c.req.json();
    
    if (!name) {
      return c.json({ error: 'name is required' }, 400);
    }
    
    const funnel = await createFunnel(workspaceId, name, userId, description);
    
    return c.json({ funnel });
  } catch (error: any) {
    console.error('Create funnel error:', error);
    return c.json({ error: error.message || 'Failed to create funnel' }, 500);
  }
});

// PUT /workspaces/:workspaceId/funnels/:funnelId
// Atualiza um funil
router.put('/:funnelId', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    
    const { name, columns } = await c.req.json();
    
    await updateFunnel(workspaceId, funnelId, { name, columns });
    
    // Buscar funil atualizado
    const updatedFunnel = await getFunnel(workspaceId, funnelId);
    
    if (!updatedFunnel) {
      return c.json({ error: 'Funnel not found' }, 404);
    }
    
    return c.json({ funnel: updatedFunnel });
  } catch (error: any) {
    console.error('Update funnel error:', error);
    return c.json({ error: error.message || 'Failed to update funnel' }, 500);
  }
});

// DELETE /workspaces/:workspaceId/funnels/:funnelId
// Deleta um funil (soft delete)
router.delete('/:funnelId', async (c) => {
  try {
    const workspaceId = c.get('workspaceId');
    const funnelId = c.req.param('funnelId');
    
    await deleteFunnel(workspaceId, funnelId);
    
    return c.json({ success: true });
  } catch (error: any) {
    console.error('Delete funnel error:', error);
    return c.json({ error: error.message || 'Failed to delete funnel' }, 500);
  }
});

export { router as funnelsRouter };

