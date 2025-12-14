import { createHashRouter } from 'react-router';
import App from '../App';
import { PublicBooking } from '../pages/PublicBooking';
import { PublicChat } from '../pages/PublicChat';

// Wrapper para extrair o slug da URL de agendamento
function BookingWrapper() {
  // Pegar slug da URL hash: /#/agendar/slug-da-empresa
  const hash = window.location.hash;
  const match = hash.match(/\/agendar\/([^/?]+)/);
  const slug = match ? match[1] : '';

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
  // Pegar slug da URL hash: /#/chat/slug-do-agente
  const hash = window.location.hash;
  const match = hash.match(/\/chat\/([^/?]+)/);
  const slug = match ? match[1] : '';

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

export const router = createHashRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/agendar/:slug',
    element: <BookingWrapper />,
  },
  {
    path: '/chat/:slug',
    element: <ChatWrapper />,
  },
]);
