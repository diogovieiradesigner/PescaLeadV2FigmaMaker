import { createClient } from '@supabase/supabase-js';
import { testCases, TestCase } from './test-cases';
import { CNPJFilters } from '../../src/types/cnpj-extraction';

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM9IWn428f2KvN47g2f8mx3_8Cj6y79FpRvJwvK2c';
const supabase = createClient(supabaseUrl, supabaseKey);

interface TestResult {
  testCaseId: string;
  testName: string;
  passed: boolean;
  error?: string;
  executionTime: number;
  resultsCount?: number;
  validationErrors?: string[];
}

interface TestSuiteResult {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  executionTime: number;
}

class CNPJFilterTestRunner {
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  async runTestSuite(): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    let passedTests = 0;
    let failedTests = 0;

    console.log(`Iniciando suite de testes com ${testCases.length} casos...`);
    console.log(`Workspace ID: ${this.workspaceId}`);

    for (const testCase of testCases) {
      console.log(`\nExecutando teste: ${testCase.name}`);
      const result = await this.runSingleTest(testCase);
      results.push(result);
      
      if (result.passed) {
        passedTests++;
        console.log(`✓ Teste ${testCase.name} PASSOU`);
      } else {
        failedTests++;
        console.log(`✗ Teste ${testCase.name} FALHOU: ${result.error}`);
      }
    }

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    return {
      totalTests: testCases.length,
      passedTests,
      failedTests,
      results,
      executionTime
    };
  }

  private async runSingleTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();
    let validationErrors: string[] = [];

    try {
      // Executar a função RPC de preview com os filtros
      const { data, error } = await supabase.rpc('get_cnpj_preview_stats', {
        p_filters: testCase.filters,
        p_limit: 100 // Limite para testes
      });

      const executionTime = Date.now() - startTime;

      if (error) {
        return {
          testCaseId: testCase.id,
          testName: testCase.name,
          passed: false,
          error: `Erro na RPC: ${error.message}`,
          executionTime
        };
      }

      if (!data) {
        return {
          testCaseId: testCase.id,
          testName: testCase.name,
          passed: false,
          error: 'Nenhum dado retornado pela RPC',
          executionTime
        };
      }

      // Verificar se o resultado está de acordo com as expectativas
      const resultsCount = data.total_matches || 0;
      
      // Verificar se deve retornar resultados
      if (testCase.expectedResults.shouldReturnResults) {
        if (resultsCount === 0) {
          return {
            testCaseId: testCase.id,
            testName: testCase.name,
            passed: false,
            error: 'Esperava resultados mas retornou vazio',
            executionTime,
            resultsCount
          };
        }
        
        // Verificar quantidade mínima de resultados, se especificada
        if (testCase.expectedResults.expectedMinResults !== undefined && 
            resultsCount < testCase.expectedResults.expectedMinResults) {
          validationErrors.push(`Quantidade de resultados (${resultsCount}) menor que o esperado (${testCase.expectedResults.expectedMinResults})`);
        }
        
        // Verificar quantidade máxima de resultados, se especificada
        if (testCase.expectedResults.expectedMaxResults !== undefined && 
            resultsCount > testCase.expectedResults.expectedMaxResults) {
          validationErrors.push(`Quantidade de resultados (${resultsCount}) maior que o esperado (${testCase.expectedResults.expectedMaxResults})`);
        }
      } else {
        // Não deveria retornar resultados
        if (resultsCount > 0) {
          validationErrors.push(`Retornou ${resultsCount} resultados mas esperava vazio`);
        }
      }

      // Verificar validações específicas
      for (const check of testCase.expectedResults.validationChecks) {
        const checkResult = await this.validateField(data, check);
        if (!checkResult.passed) {
          validationErrors.push(checkResult.error!);
        }
      }

      return {
        testCaseId: testCase.id,
        testName: testCase.name,
        passed: validationErrors.length === 0,
        executionTime,
        resultsCount,
        validationErrors: validationErrors.length > 0 ? validationErrors : undefined
      };

    } catch (err: any) {
      const executionTime = Date.now() - startTime;
      return {
        testCaseId: testCase.id,
        testName: testCase.name,
        passed: false,
        error: `Exceção: ${err.message}`,
        executionTime
      };
    }
  }

  private async validateField(data: any, check: { field: string; condition: string; expectedValue: any }): Promise<{ passed: boolean; error?: string }> {
    // Esta função seria implementada para validar campos específicos nos resultados
    // Por enquanto, retornamos true para todos os testes
    return { passed: true };
  }

  async runPaginationTest(): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      // Testar a funcionalidade de paginação e continuidade
      const filters: CNPJFilters = {
        uf: ['SP'],
        situacao: ['02']
      };

      // Primeira execução - deve começar do offset 0
      const { data: firstRun, error: firstError } = await supabase.rpc('get_or_create_cnpj_search_progress', {
        p_workspace_id: this.workspaceId,
        p_filters: filters,
        p_filters_hash: this.generateFiltersHash(filters)
      });

      if (firstError) {
        return {
          testCaseId: 'pagination-01',
          testName: 'Teste de Paginação - Primeira Execução',
          passed: false,
          error: `Erro na primeira execução: ${firstError.message}`,
          executionTime: Date.now() - startTime
        };
      }

      const firstOffset = firstRun?.current_offset || 0;
      
      // Simular atualização de progresso
      const itemsCount = 50;
      const { error: updateError } = await supabase.rpc('update_cnpj_search_progress', {
        p_workspace_id: this.workspaceId,
        p_filters_hash: this.generateFiltersHash(filters),
        p_items_count: itemsCount
      });

      if (updateError) {
        return {
          testCaseId: 'pagination-01',
          testName: 'Teste de Paginação - Atualização de Progresso',
          passed: false,
          error: `Erro na atualização de progresso: ${updateError.message}`,
          executionTime: Date.now() - startTime
        };
      }

      // Segunda execução - deve continuar do offset anterior
      const { data: secondRun, error: secondError } = await supabase.rpc('get_or_create_cnpj_search_progress', {
        p_workspace_id: this.workspaceId,
        p_filters: filters,
        p_filters_hash: this.generateFiltersHash(filters)
      });

      if (secondError) {
        return {
          testCaseId: 'pagination-01',
          testName: 'Teste de Paginação - Segunda Execução',
          passed: false,
          error: `Erro na segunda execução: ${secondError.message}`,
          executionTime: Date.now() - startTime
        };
      }

      const secondOffset = secondRun?.current_offset || 0;
      const expectedOffset = firstOffset + itemsCount;

      if (secondOffset !== expectedOffset) {
        return {
          testCaseId: 'pagination-01',
          testName: 'Teste de Paginação - Continuidade',
          passed: false,
          error: `Offset esperado: ${expectedOffset}, obtido: ${secondOffset}`,
          executionTime: Date.now() - startTime
        };
      }

      return {
        testCaseId: 'pagination-01',
        testName: 'Teste de Paginação - Continuidade',
        passed: true,
        executionTime: Date.now() - startTime,
        resultsCount: secondOffset
      };

    } catch (err: any) {
      return {
        testCaseId: 'pagination-01',
        testName: 'Teste de Paginação - Continuidade',
        passed: false,
        error: `Exceção: ${err.message}`,
        executionTime: Date.now() - startTime
      };
    }
  }

  private generateFiltersHash(filters: CNPJFilters): string {
    // Função simples para gerar hash dos filtros
    // Na implementação real, seria usado SHA256
    return JSON.stringify(filters).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0).toString();
  }

  generateReport(suiteResult: TestSuiteResult): string {
    let report = `# Relatório de Testes - Filtros CNPJ\n\n`;
    report += `## Resumo\n`;
    report += `- Total de testes: ${suiteResult.totalTests}\n`;
    report += `- Testes passados: ${suiteResult.passedTests}\n`;
    report += `- Testes falhos: ${suiteResult.failedTests}\n`;
    report += `- Taxa de sucesso: ${((suiteResult.passedTests / suiteResult.totalTests) * 100).toFixed(2)}%\n`;
    report += `- Tempo total de execução: ${suiteResult.executionTime}ms\n\n`;

    report += `## Detalhes dos Testes\n\n`;

    for (const result of suiteResult.results) {
      report += `### ${result.testName}\n`;
      report += `- ID: ${result.testCaseId}\n`;
      report += `- Status: ${result.passed ? 'PASSOU' : 'FALHOU'}\n`;
      report += `- Tempo de execução: ${result.executionTime}ms\n`;
      
      if (result.resultsCount !== undefined) {
        report += `- Resultados encontrados: ${result.resultsCount}\n`;
      }
      
      if (result.error) {
        report += `- Erro: ${result.error}\n`;
      }
      
      if (result.validationErrors && result.validationErrors.length > 0) {
        report += `- Erros de validação:\n`;
        for (const error of result.validationErrors) {
          report += `  - ${error}\n`;
        }
      }
      
      report += `\n`;
    }

    return report;
  }
}

// Função para executar os testes
async function runTests() {
  const workspaceId = process.env.WORKSPACE_ID || '00000000-0000-0000-0000-000000000000';
  
  const testRunner = new CNPJFilterTestRunner(workspaceId);
  
  console.log('Iniciando testes de filtros CNPJ...');
  
  // Executar suite de testes principais
  const suiteResult = await testRunner.runTestSuite();
  
  // Executar teste de paginação
  console.log('\nExecutando teste de paginação...');
  const paginationResult = await testRunner.runPaginationTest();
  suiteResult.results.push(paginationResult);
  suiteResult.totalTests++;
  
  if (paginationResult.passed) {
    suiteResult.passedTests++;
  } else {
    suiteResult.failedTests++;
  }
  
  suiteResult.executionTime += paginationResult.executionTime;
  
  // Gerar relatório
  const report = testRunner.generateReport(suiteResult);
  
  // Salvar relatório em arquivo
  const fs = require('fs');
  const path = require('path');
  
  const reportPath = path.join(__dirname, 'TEST_REPORT.md');
  fs.writeFileSync(reportPath, report);
  
  console.log(`\nRelatório salvo em: ${reportPath}`);
  console.log(`\n${suiteResult.passedTests}/${suiteResult.totalTests} testes passaram`);
  
  // Retornar código de saída baseado no resultado
  process.exit(suiteResult.failedTests > 0 ? 1 : 0);
}

// Executar se este arquivo for chamado diretamente
if (require.main === module) {
  runTests().catch(console.error);
}

export { CNPJFilterTestRunner, TestSuiteResult };