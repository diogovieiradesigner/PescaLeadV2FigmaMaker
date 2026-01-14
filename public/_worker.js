// Cloudflare Pages SPA fallback worker
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Se for um arquivo estático (com extensão), deixa o Cloudflare servir normalmente
    if (url.pathname.match(/\.[a-zA-Z0-9]+$/)) {
      return env.ASSETS.fetch(request);
    }

    // Para todas as outras rotas, serve o index.html (SPA fallback)
    return env.ASSETS.fetch(new URL('/index.html', request.url));
  }
};
