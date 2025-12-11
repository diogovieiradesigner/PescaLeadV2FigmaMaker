// TestPreviewAPI.tsx
// 
// Componente de teste para verificar se a API ai-preview-chat
// está retornando os logs do pipeline corretamente.
//
// USO: Adicione este componente temporariamente em uma página
// e clique no botão para testar a API.

import React, { useState } from 'react';
import { supabase } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

const API_BASE_URL = `https://${projectId}.supabase.co`;
const TEST_AGENT_ID = '3267daee-b438-486f-a7b8-d52b84a46cf7'; // Substitua pelo seu agentId

export function TestPreviewAPI() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testAPI = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('Não autenticado');
      }

      console.log('🔍 Chamando API...');
      
      const response = await fetch(
        `${API_BASE_URL}/functions/v1/ai-preview-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            agentId: TEST_AGENT_ID,
            message: 'Teste de API - ' + new Date().toISOString(),
            preview: true,
            debug: true
          })
        }
      );

      const data = await response.json();
      
      console.log('📦 Resposta completa:', data);
      console.log('🔑 Chaves da resposta:', Object.keys(data));
      console.log('📊 Pipeline presente:', !!data.pipeline);
      
      if (data.pipeline) {
        console.log('✅ Pipeline:', {
          id: data.pipeline.id,
          status: data.pipeline.status,
          steps: data.pipeline.steps?.length
        });
      }

      setResult(data);
    } catch (err: any) {
      console.error('❌ Erro:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#1a1a2e', 
      borderRadius: '8px',
      color: 'white',
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <h3 style={{ marginBottom: '16px' }}>🧪 Teste da API ai-preview-chat</h3>
      
      <button
        onClick={testAPI}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#444' : '#4a9eff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
          marginBottom: '16px'
        }}
      >
        {loading ? '⏳ Testando...' : '🚀 Testar API'}
      </button>

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: 'rgba(255,0,0,0.2)', 
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          ❌ Erro: {error}
        </div>
      )}

      {result && (
        <div>
          <div style={{ marginBottom: '8px' }}>
            <strong>📊 Resultado:</strong>
          </div>
          
          <div style={{ display: 'grid', gap: '8px', marginBottom: '16px' }}>
            <div>✅ Success: {String(result.success)}</div>
            <div>💬 Reply: {result.reply?.substring(0, 50)}...</div>
            <div>🎫 Tokens: {result.tokensUsed}</div>
            <div>⏱️ Duration: {result.durationMs}ms</div>
            <div>🔗 Pipeline ID: {result.pipelineId || 'N/A'}</div>
            <div style={{ 
              color: result.pipeline ? '#4ade80' : '#ef4444',
              fontWeight: 'bold'
            }}>
              📦 Pipeline Data: {result.pipeline ? `✅ SIM (${result.pipeline.steps?.length} steps)` : '❌ NÃO'}
            </div>
          </div>

          {result.pipeline && (
            <div>
              <div style={{ marginBottom: '8px' }}>
                <strong>📋 Steps do Pipeline:</strong>
              </div>
              {result.pipeline.steps?.map((step: any, i: number) => (
                <div key={i} style={{ 
                  padding: '8px', 
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderRadius: '4px',
                  marginBottom: '4px'
                }}>
                  {step.icon} {step.name} - {step.status}
                  {step.durationMs && ` (${step.durationMs}ms)`}
                </div>
              ))}
            </div>
          )}

          <details style={{ marginTop: '16px' }}>
            <summary style={{ cursor: 'pointer' }}>🔍 JSON Completo</summary>
            <pre style={{ 
              marginTop: '8px',
              padding: '10px',
              backgroundColor: '#12121f',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '300px'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

export default TestPreviewAPI;
