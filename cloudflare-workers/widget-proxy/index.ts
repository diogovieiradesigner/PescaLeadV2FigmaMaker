/**
 * Widget Proxy Worker
 *
 * Este worker serve como proxy para o widget de chat, ocultando a URL do Supabase.
 * Ele recebe requisições em widget.pescalead.com.br/api/chat e encaminha para o Supabase.
 *
 * Endpoints:
 * - GET /api/chat?slug=xxx - Retorna o script do widget
 * - POST /api/chat - Processa mensagens do chat
 */

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Widget-Token',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Only handle /api/chat endpoints
    if (!path.startsWith('/api/chat')) {
      return new Response('Not Found', { status: 404 });
    }

    // Build the Supabase URL
    const supabaseUrl = env.SUPABASE_URL || 'https://nlbcwaxkeaddfocigwuk.supabase.co';
    const targetUrl = new URL(`${supabaseUrl}/functions/v1/widget-chat`);

    // Copy query parameters (like slug)
    url.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    try {
      // Forward the request to Supabase
      const headers = new Headers(request.headers);

      // Remove host header to avoid conflicts
      headers.delete('host');

      // Add Supabase anon key if available
      if (env.SUPABASE_ANON_KEY && !headers.has('Authorization')) {
        headers.set('apikey', env.SUPABASE_ANON_KEY);
      }

      const response = await fetch(targetUrl.toString(), {
        method: request.method,
        headers,
        body: request.method !== 'GET' ? await request.text() : undefined,
      });

      // Get response body and headers
      const responseBody = await response.text();
      const responseHeaders = new Headers(response.headers);

      // Add CORS headers
      Object.entries(corsHeaders).forEach(([key, value]) => {
        responseHeaders.set(key, value);
      });

      // For GET requests (script), ensure proper content type
      if (request.method === 'GET' && url.searchParams.has('slug')) {
        responseHeaders.set('Content-Type', 'text/javascript; charset=utf-8');
      }

      return new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error('Widget proxy error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal Server Error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  },
};
