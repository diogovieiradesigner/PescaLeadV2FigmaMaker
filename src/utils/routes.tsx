import { createBrowserRouter, Navigate, useParams } from 'react-router';
import App from '../App';
import { PublicBooking } from '../pages/PublicBooking';
import { PublicChat } from '../pages/PublicChat';
import PublicDocument from '../pages/PublicDocument';

// Wrapper para extrair o slug da URL de agendamento
function BookingWrapper() {
  const { slug } = useParams<{ slug: string }>();
  
  if (!slug) {
    return <Navigate to="/" replace />;
  }

  return <PublicBooking slug={slug} />;
}

// Wrapper para extrair o slug da URL de chat público
function ChatWrapper() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return <Navigate to="/" replace />;
  }

  return <PublicChat slug={slug} />;
}

// Wrapper para extrair o slug da URL de documento público
function DocumentWrapper() {
  const { slug } = useParams<{ slug: string }>();

  console.log('[DocumentWrapper] Slug:', slug);

  if (!slug) {
    console.log('[DocumentWrapper] No slug, redirecting to /');
    return <Navigate to="/" replace />;
  }

  return <PublicDocument />;
}

export const router = createBrowserRouter([
  // Rotas públicas - DEVEM vir antes das rotas do App
  {
    path: '/doc/:slug',
    element: <DocumentWrapper />,
  },
  {
    path: '/agendar/:slug',
    element: <BookingWrapper />,
  },
  {
    path: '/chat/:slug',
    element: <ChatWrapper />,
  },
  // Todas as rotas internas vão para o App (navegação é gerenciada internamente)
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/dashboard',
    element: <App />,
  },
  {
    path: '/pipeline',
    element: <App />,
  },
  {
    path: '/pipeline/:funnelId',
    element: <App />,
  },
  {
    path: '/pipeline/:funnelId/lead/:leadId',
    element: <App />,
  },
  {
    path: '/pipeline/lead/:leadId',
    element: <App />,
  },
  {
    path: '/pipeline/lead/:leadId/document/:documentId',
    element: <App />,
  },
  {
    path: '/chat',
    element: <App />,
  },
  {
    path: '/mensagens/:conversationId',
    element: <App />,
  },
  {
    path: '/calendario',
    element: <App />,
  },
  {
    path: '/calendario/evento/:eventId',
    element: <App />,
  },
  {
    path: '/extracao',
    element: <App />,
  },
  {
    path: '/extracao/google-maps',
    element: <App />,
  },
  {
    path: '/extracao/cnpj',
    element: <App />,
  },
  {
    path: '/extracao/instagram',
    element: <App />,
  },
  {
    path: '/extracao/progresso',
    element: <App />,
  },
  {
    path: '/extracao/progresso/:runId',
    element: <App />,
  },
  {
    path: '/campanhas',
    element: <App />,
  },
  {
    path: '/campanhas/:runId',
    element: <App />,
  },
  {
    path: '/documentos',
    element: <App />,
  },
  {
    path: '/assistente-ia',
    element: <App />,
  },
  {
    path: '/assistente-ia/:aiConversationId',
    element: <App />,
  },
  {
    path: '/ia',
    element: <App />,
  },
  {
    path: '/logs',
    element: <App />,
  },
  {
    path: '/configuracoes',
    element: <App />,
  },
  {
    path: '/conta',
    element: <App />,
  },
  // Catch-all para rotas não encontradas - redireciona para dashboard
  {
    path: '*',
    element: <App />,
  },
]);
