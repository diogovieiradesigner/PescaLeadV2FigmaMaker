export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Interceptar requisições para assets
    if (url.pathname.startsWith('/assets/')) {
      // Fazer a requisição original
      const response = await fetch(request);
      
      // Criar novos headers
      const newHeaders = new Headers(response.headers);
      
      // Corrigir Content-Type baseado na extensão
      if (url.pathname.endsWith('.css')) {
        newHeaders.set('Content-Type', 'text/css');
      } else if (url.pathname.endsWith('.js') || url.pathname.endsWith('.mjs')) {
        newHeaders.set('Content-Type', 'text/javascript');
        newHeaders.set('X-Content-Type-Options', 'nosniff');
      }
      
      // Retornar resposta com headers corrigidos
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }
    
    // Para outras requisições, apenas passar adiante
    return fetch(request);
  },
};

