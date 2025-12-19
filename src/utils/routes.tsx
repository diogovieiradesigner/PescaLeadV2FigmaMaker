import { createBrowserRouter, useParams } from 'react-router';
import App from '../App';
import { PublicBooking } from '../pages/PublicBooking';
import { PublicChat } from '../pages/PublicChat';

// Wrapper para extrair o slug da URL de agendamento
function BookingWrapper() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Link inválido</h2>
          <p className="text-gray-600">O link de agendamento está incompleto.</p>
        </div>
      </div>
    );
  }

  return <PublicBooking slug={slug} />;
}

// Wrapper para extrair o slug da URL de chat público
function ChatWrapper() {
  const { slug } = useParams<{ slug: string }>();

  if (!slug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          <h2 className="text-xl font-semibold text-white mb-2">Link inválido</h2>
          <p className="text-gray-400">O link do chat está incompleto.</p>
        </div>
      </div>
    );
  }

  return <PublicChat slug={slug} />;
}

export const router = createBrowserRouter([
  // Rotas públicas
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
    path: '/pipeline/lead/:leadId',
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
