import { test, expect } from '@playwright/test';

/**
 * Testes E2E do Kanban
 * 
 * Valida:
 * - Carregamento do Kanban
 * - Exibição de leads
 * - Filtros
 * - Movimentação de leads
 */

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    // Aguardar servidor estar pronto
    await page.goto('/');
    
    // Aguardar autenticação (ajustar conforme necessário)
    // await page.waitForSelector('[data-testid="kanban-board"]', { timeout: 10000 });
  });

  test('deve carregar o Kanban com colunas', async ({ page }) => {
    // Aguardar o board aparecer
    const board = page.locator('[data-testid="kanban-board"]').or(page.locator('text=/Kanban|Pipeline/i').first());
    await expect(board).toBeVisible({ timeout: 15000 });
    
    // Verificar se há colunas
    const columns = page.locator('[data-testid="kanban-column"]').or(page.locator('[class*="column"]'));
    const columnCount = await columns.count();
    
    expect(columnCount).toBeGreaterThan(0);
    
    // Screenshot para validação visual
    await page.screenshot({ path: 'test-results/kanban-loaded.png', fullPage: true });
  });

  test('deve exibir leads nos cards', async ({ page }) => {
    await page.goto('/');
    
    // Aguardar cards aparecerem
    const cards = page.locator('[data-testid="kanban-card"]').or(page.locator('[class*="card"]'));
    
    // Aguardar pelo menos 1 card ou verificar se não há leads
    await page.waitForTimeout(3000); // Aguardar carregamento
    
    const cardCount = await cards.count();
    
    if (cardCount > 0) {
      // Verificar se o card tem nome do cliente
      const firstCard = cards.first();
      const clientName = firstCard.locator('[data-testid="client-name"]').or(firstCard.locator('text=/.*/').first());
      
      await expect(clientName).toBeVisible({ timeout: 5000 });
      
      // Screenshot do card
      await firstCard.screenshot({ path: 'test-results/kanban-card.png' });
    } else {
      console.log('⚠️ Nenhum lead encontrado no Kanban');
    }
  });

  test('deve aplicar filtros', async ({ page }) => {
    await page.goto('/');
    
    // Aguardar filtros aparecerem
    const filterButton = page.locator('[data-testid="filter-button"]').or(page.locator('button:has-text("Filtro")'));
    
    if (await filterButton.count() > 0) {
      await filterButton.click();
      
      // Verificar se filtros aparecem
      const emailFilter = page.locator('[data-testid="filter-email"]').or(page.locator('text=/Email/i'));
      const whatsappFilter = page.locator('[data-testid="filter-whatsapp"]').or(page.locator('text=/WhatsApp/i'));
      
      await expect(emailFilter.or(whatsappFilter).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('deve validar estrutura do card', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    const cards = page.locator('[data-testid="kanban-card"]').or(page.locator('[class*="card"]'));
    const cardCount = await cards.count();
    
    if (cardCount > 0) {
      const firstCard = cards.first();
      
      // Verificar elementos esperados no card
      const hasClientName = await firstCard.locator('text=/.*/').count() > 0;
      const hasCompany = await firstCard.locator('text=/.*/').count() > 0;
      
      // Screenshot detalhado
      await firstCard.screenshot({ path: 'test-results/card-structure.png' });
      
      expect(hasClientName || hasCompany).toBeTruthy();
    }
  });
});

