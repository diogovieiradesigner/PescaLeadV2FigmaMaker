import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import { UserPlus, Building2, Shield, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { useInvite, savePendingInvite } from '../hooks/useInvite';
import { useAuth } from '../contexts/AuthContext';
import { InvalidInvitePage } from './InvalidInvitePage';
import IconografiaPescaLead from '../imports/IconografiaPescaLead';
import { toast } from 'sonner';
import { processPendingInvite } from '../hooks/useInvite';

export function InvitePage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, accessToken } = useAuth();
  const { invite, loading, error } = useInvite(code);

  // Se já está logado, processar convite automaticamente
  useEffect(() => {
    if (user && accessToken && code && invite) {
      console.log('[INVITE PAGE] Usuário já logado, processando convite...');
      
      const process = async () => {
        const result = await processPendingInvite(user.id, accessToken);
        
        if (result.success && result.workspace_id) {
          toast.success('Convite aceito com sucesso!');
          navigate('/');
          // O AuthContext vai trocar para o workspace automaticamente
        } else {
          toast.error(result.error || 'Erro ao aceitar convite');
        }
      };
      
      process();
    }
  }, [user, accessToken, code, invite, navigate]);

  // Salvar código ao carregar
  useEffect(() => {
    if (code) {
      savePendingInvite(code);
    }
  }, [code]);

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Carregando convite...</p>
        </div>
      </div>
    );
  }

  // Erro ou convite inválido
  if (error || !invite) {
    return <InvalidInvitePage message={error || undefined} />;
  }

  // Se usuário já está logado, mostrar processando
  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold mb-2">Processando seu convite...</p>
          <p className="text-zinc-400 text-sm">Aguarde um momento</p>
        </div>
      </div>
    );
  }

  // Tradução de roles
  const roleLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Administrador', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
    member: { label: 'Membro', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    viewer: { label: 'Visualizador', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
  };

  const roleInfo = roleLabels[invite.role] || roleLabels.member;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-zinc-950 via-zinc-900 to-black">
      {/* Painel Esquerdo - Informações */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12 relative overflow-hidden bg-black">
        {/* Background decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-purple-600/10" />
        
        {/* Conteúdo */}
        <div className="relative z-10 max-w-lg text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center items-center gap-3 mb-8">
            <div className="w-16 h-16">
              <IconografiaPescaLead />
            </div>
            <div className="text-left">
              <h1 className="text-3xl font-bold text-white">Pesca Lead</h1>
              <p className="text-sm text-zinc-400">Gestão de Vendas com IA</p>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-6">
            <div className="flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Agentes de IA</p>
                <p className="text-sm text-white/70">Automatize atendimentos e qualificações com inteligência artificial</p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Workspaces Colaborativos</p>
                <p className="text-sm text-white/70">Trabalhe em equipe com permissões e controles granulares</p>
              </div>
            </div>

            <div className="flex items-start gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-white">Seguro e Confiável</p>
                <p className="text-sm text-white/70">Seus dados protegidos com criptografia de ponta a ponta</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Painel Direito - Convite */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Logo Mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12">
                <IconografiaPescaLead />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Pesca Lead</h1>
                <p className="text-sm text-zinc-400">Gestão de Vendas</p>
              </div>
            </div>
          </div>

          {/* Card de Convite */}
          <div className="bg-zinc-900/50 border border-white/[0.08] rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
            {/* Ícone */}
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
                <UserPlus className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            {/* Título */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Você foi convidado! 🎉
              </h2>
              <p className="text-zinc-400">
                {invite.inviter.name || 'Um usuário'} convidou você para participar
              </p>
            </div>

            {/* Informações do Workspace */}
            <div className="space-y-4 mb-8">
              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500 mb-1">Workspace</p>
                    <p className="font-semibold text-white">{invite.workspace.name}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-500" />
                  <div className="flex-1">
                    <p className="text-xs text-zinc-500 mb-1">Sua função</p>
                    <Badge className={roleInfo.color}>
                      {roleInfo.label}
                    </Badge>
                  </div>
                </div>
              </div>

              {invite.inviter.email && (
                <div className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700">
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-5 h-5 text-green-500" />
                    <div className="flex-1">
                      <p className="text-xs text-zinc-500 mb-1">Convidado por</p>
                      <p className="font-semibold text-white">{invite.inviter.name}</p>
                      <p className="text-xs text-zinc-400">{invite.inviter.email}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="space-y-3">
              <Button
                onClick={() => {
                  // Redirecionar para login preservando o convite
                  window.location.hash = '#/';
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 group"
              >
                Fazer Login
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  // Redirecionar para cadastro preservando o convite
                  window.location.hash = '#/';
                }}
                className="w-full border-zinc-700 hover:bg-zinc-800"
              >
                Criar Nova Conta
              </Button>
            </div>

            {/* Nota */}
            <p className="text-xs text-zinc-500 text-center mt-6">
              O convite será aceito automaticamente após você fazer login ou criar sua conta
            </p>
          </div>

          {/* Footer */}
          <p className="text-xs text-zinc-600 text-center mt-6">
            © 2024 Pesca Lead. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}