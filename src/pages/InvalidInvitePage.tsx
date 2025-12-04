import { XCircle, ArrowLeft, Mail } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import IconografiaPescaLead from '../imports/IconografiaPescaLead';

interface InvalidInvitePageProps {
  message?: string;
}

export function InvalidInvitePage({ message = 'Convite inválido ou expirado' }: InvalidInvitePageProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
      {/* Logo */}
      <div className="mb-8 flex items-center gap-3">
        <div className="w-12 h-12">
          <IconografiaPescaLead />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Pesca Lead</h1>
          <p className="text-sm text-zinc-400">Gestão de Vendas</p>
        </div>
      </div>

      {/* Card de Erro */}
      <div className="w-full max-w-md bg-zinc-900/50 border border-white/[0.08] rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-6">
          {/* Ícone de Erro */}
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <XCircle className="w-10 h-10 text-red-500" />
          </div>

          {/* Título */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Ops! Algo deu errado
            </h2>
            <p className="text-zinc-400">
              {message}
            </p>
          </div>

          {/* Informações */}
          <div className="w-full p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
            <p className="text-sm text-zinc-300">
              Possíveis motivos:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
              <li>• O link expirou</li>
              <li>• O convite já foi utilizado</li>
              <li>• O link está incorreto</li>
              <li>• O workspace foi removido</li>
            </ul>
          </div>

          {/* Ações */}
          <div className="w-full space-y-3">
            <Button
              onClick={() => navigate('/')}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Ir para Página Inicial
            </Button>

            <Button
              variant="outline"
              onClick={() => window.location.href = 'mailto:suporte@pescalead.com.br'}
              className="w-full border-zinc-700 hover:bg-zinc-800"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contatar Suporte
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-zinc-600">
        © 2024 Pesca Lead. Todos os direitos reservados.
      </p>
    </div>
  );
}
