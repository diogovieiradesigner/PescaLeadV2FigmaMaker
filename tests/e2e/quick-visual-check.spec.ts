import { test, expect } from '@playwright/test';

/**
 * Teste rápido para capturar estado visual atual
 * Use: npx playwright test tests/e2e/quick-visual-check.spec.ts --headed
 */

test('capturar estado visual atual', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // Aguardar carregamento
  await page.waitForTimeout(5000);
  
  // Screenshot full page
  await page.screenshot({ 
    path: 'test-results/current-state-full.png',
    fullPage: true 
  });
  
  // Screenshot viewport
  await page.screenshot({ 
    path: 'test-results/current-state-viewport.png',
    fullPage: false 
  });
  
  // Verificar erros no console
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  // Verificar recursos que falharam
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`❌ ${response.status()} ${response.url()}`);
    }
  });
  
  // Aguardar um pouco mais para capturar tudo
  await page.waitForTimeout(2000);
  
  console.log('📸 Screenshots salvos em test-results/');
  if (errors.length > 0) {
    console.log('⚠️ Erros encontrados:', errors);
  }
});

