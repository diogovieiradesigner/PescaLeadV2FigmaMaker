import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração do Playwright para testes E2E e validação visual
 * 
 * Uso:
 * - npm run test:e2e - Roda todos os testes
 * - npm run test:visual - Validação visual do Kanban
 * - npm run test:debug - Debug mode
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // Timeout para cada teste
  timeout: 30 * 1000,
  
  // Expect timeout
  expect: {
    timeout: 5000,
  },
  
  // Rodar testes em paralelo
  fullyParallel: true,
  
  // Falhar o build se houver testes falhando
  forbidOnly: !!process.env.CI,
  
  // Retry em CI
  retries: process.env.CI ? 2 : 0,
  
  // Workers em CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  // Shared settings para todos os projetos
  use: {
    // Base URL
    baseURL: 'http://localhost:3000',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
    
    // Trace on failure
    trace: 'on-first-retry',
    
    // Action timeout
    actionTimeout: 10000,
    
    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Configurar projetos para diferentes navegadores
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Web server para rodar antes dos testes
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});

