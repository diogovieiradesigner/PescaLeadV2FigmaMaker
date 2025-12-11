import { test, expect } from '@playwright/test';

/**
 * Validação Visual do Frontend
 * 
 * Captura screenshots de componentes importantes para validação visual
 */

test.describe('Validação Visual', () => {
  test('screenshot - Kanban completo', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(5000); // Aguardar carregamento completo
    
    // Screenshot full page
    await page.screenshot({ 
      path: 'test-results/visual/kanban-full.png',
      fullPage: true 
    });
  });

  test('screenshot - Card de lead', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(5000);
    
    const cards = page.locator('[data-testid="kanban-card"]').or(
      page.locator('[class*="card"]').first()
    );
    
    const cardCount = await cards.count();
    
    if (cardCount > 0) {
      const firstCard = cards.first();
      await firstCard.screenshot({ 
        path: 'test-results/visual/card-detail.png' 
      });
    }
  });

  test('screenshot - Filtros', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Tentar abrir filtros
    const filterButton = page.locator('button:has-text("Filtro")').or(
      page.locator('[data-testid="filter-button"]')
    );
    
    if (await filterButton.count() > 0) {
      await filterButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ 
      path: 'test-results/visual/filters.png',
      fullPage: true 
    });
  });

  test('screenshot - Dashboard', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);
    
    // Tentar navegar para dashboard
    const dashboardLink = page.locator('a:has-text("Dashboard")').or(
      page.locator('[href*="dashboard"]')
    );
    
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      await page.waitForTimeout(3000);
    }
    
    await page.screenshot({ 
      path: 'test-results/visual/dashboard.png',
      fullPage: true 
    });
  });
});

