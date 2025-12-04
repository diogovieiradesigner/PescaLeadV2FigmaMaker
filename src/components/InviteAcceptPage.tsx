import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Check, AlertCircle, Loader2, Users } from 'lucide-react';
import { useWorkspaceMembers } from '../hooks/useWorkspaceMembers';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';

export function InviteAcceptPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, switchWorkspace, workspaces } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const { acceptInvite } = useWorkspaceMembers(null, null);

  // Processar convite pendente após login
  useEffect(() => {
    if (user && !code) {
      const pendingInvite = localStorage.getItem('pendingInvite');
      if (pendingInvite) {
        localStorage.removeItem('pendingInvite');
        navigate(`/invite/${pendingInvite}`);
      }
    }
  }, [user, code, navigate]);

  useEffect(() => {
    const handleAcceptInvite = async () => {
      if (!code) {
        setStatus('error');
        setErrorMessage('Código de convite inválido');
        return;
      }

      if (!user) {
        // Redirecionar para login com redirect de volta
        localStorage.setItem('pendingInvite', code);
        navigate('/');
        return;
      }

      try {
        const result = await acceptInvite(code);

        if (result.success && result.workspace_id) {
          setStatus('success');
          
          // Buscar o workspace recém-adicionado
          const newWorkspace = workspaces.find(w => w.id === result.workspace_id);
          if (newWorkspace) {
            setWorkspaceName(newWorkspace.name);
          }

          // Aguardar 2 segundos e redirecionar
          setTimeout(() => {
            if (result.workspace_id) {
              switchWorkspace(result.workspace_id);
              navigate('/');
            }
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage(result.error || 'Não foi possível aceitar o convite');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'Erro ao processar convite');
      }
    };

    handleAcceptInvite();
  }, [code, user, acceptInvite, navigate, switchWorkspace, workspaces]);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors ${
      isDark ? 'bg-dark' : 'bg-light'
    }`}>
      <div className={`w-full max-w-md rounded-xl shadow-xl overflow-hidden ${
        isDark ? 'bg-elevated' : 'bg-white'
      }`}>
        <div className="p-8">
          {/* Logo/Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-[#0169D9] flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Status Content */}
          {status === 'loading' && (
            <div className="text-center">
              <Loader2 className={`w-12 h-12 mx-auto mb-4 animate-spin ${
                isDark ? 'text-white/50' : 'text-gray-400'
              }`} />
              <h2 className={`text-xl font-medium mb-2 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Processando convite...
              </h2>
              <p className={`text-sm ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Aguarde enquanto validamos seu convite
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
              <h2 className={`text-xl font-medium mb-2 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Convite aceito!
              </h2>
              <p className={`text-sm mb-4 ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                Você agora é membro do workspace
                {workspaceName && (
                  <span className="block font-medium text-[#0169D9] mt-1">
                    {workspaceName}
                  </span>
                )}
              </p>
              <p className={`text-xs ${
                isDark ? 'text-white/40' : 'text-text-secondary-light'
              }`}>
                Redirecionando...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h2 className={`text-xl font-medium mb-2 ${
                isDark ? 'text-white' : 'text-text-primary-light'
              }`}>
                Erro ao aceitar convite
              </h2>
              <p className={`text-sm mb-6 ${
                isDark ? 'text-white/50' : 'text-text-secondary-light'
              }`}>
                {errorMessage}
              </p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-[#0169D9] text-white rounded-lg hover:bg-[#0159C9] transition-colors"
              >
                Voltar ao início
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}