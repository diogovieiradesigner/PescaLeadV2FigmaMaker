import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';
import { Inbox, Instance } from '../SettingsView';
import { WorkspaceMember } from '../../hooks/useSettingsData';

interface InboxModalProps {
  theme: Theme;
  inbox: Inbox | null;
  members: WorkspaceMember[];
  instances: Instance[];
  onClose: () => void;
  onSave: (inbox: Inbox) => void;
}

export function InboxModal({ theme, inbox, members, instances, onClose, onSave }: InboxModalProps) {
  const isDark = theme === 'dark';
  const [formData, setFormData] = useState<Omit<Inbox, 'id'>>({
    name: '',
    agents: [],
    instances: [],
    working_hours: { start: '08:00', end: '18:00' },
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (inbox) {
      setFormData({
        name: inbox.name,
        agents: inbox.agents,
        instances: inbox.instances || [],
        working_hours: inbox.working_hours || { start: '08:00', end: '18:00' },
      });
    }
    setError(null);
  }, [inbox]);

  // Check validity
  const isValid = Boolean(
    formData.name?.trim() &&
    formData.agents && formData.agents.length > 0 &&
    formData.instances && formData.instances.length > 0
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid) return;

    setError(null);
    onSave({
      ...formData,
      id: inbox?.id || '',
    });
  };

  const toggleMember = (userId: string) => {
    setFormData((prev) => {
        const currentAgents = prev.agents || [];
        return {
          ...prev,
          agents: currentAgents.includes(userId)
            ? currentAgents.filter((id) => id !== userId)
            : [...currentAgents, userId],
        };
    });
  };

  const toggleInstance = (instanceId: string) => {
    setFormData((prev) => {
        const currentInstances = prev.instances || [];
        return {
          ...prev,
          instances: currentInstances.includes(instanceId)
            ? currentInstances.filter((id) => id !== instanceId)
            : [...currentInstances, instanceId],
        };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className={`w-full max-w-md rounded-lg shadow-xl ${
          isDark ? 'bg-elevated' : 'bg-light-elevated'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}
        >
          <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
            {inbox ? 'Editar Caixa de Entrada' : 'Nova Caixa de Entrada'}
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg transition-colors ${
              isDark ? 'hover:bg-white/[0.05] text-white/50' : 'hover:bg-light-elevated-hover text-text-secondary-light'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
          {/* Nome */}
          <div>
            <label
              className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}
            >
              Nome da Caixa de Entrada
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full border px-3 py-2 rounded-lg transition-all focus:outline-none focus:border-[#0169D9] ${
                isDark
                  ? 'bg-true-black border-white/[0.08] text-white placeholder-white/40'
                  : 'bg-light-bg border-border-light text-text-primary-light placeholder-text-secondary-light'
              }`}
              placeholder="Ex: Vendas, Suporte, Financeiro"
              required
            />
          </div>

          {/* Membros / Atendentes */}
          <div>
            <label
              className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}
            >
              Selecionar Membros com Acesso
            </label>
            <div className={`border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto ${
              isDark ? 'border-white/[0.08]' : 'border-border-light'
            }`}>
              {members.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Nenhum membro encontrado no workspace
                </p>
              ) : (
                members.map((member) => (
                  <label
                    key={member.user_id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-light-elevated-hover'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.agents?.includes(member.user_id) || false}
                      onChange={() => toggleMember(member.user_id)}
                      className="w-4 h-4 rounded border-white/[0.08] text-[#0169D9] focus:ring-[#0169D9]"
                    />
                    <div className="flex-1">
                      <div className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        {member.name}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        {member.email} • {member.role}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Instâncias */}
          <div>
            <label
              className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}
            >
              Selecionar Instâncias
            </label>
            <div className={`border rounded-lg p-3 space-y-2 max-h-64 overflow-y-auto ${
              isDark ? 'border-white/[0.08]' : 'border-border-light'
            }`}>
              {instances.length === 0 ? (
                <p className={`text-sm text-center py-4 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Nenhuma instância cadastrada
                </p>
              ) : (
                instances.map((instance) => (
                  <label
                    key={instance.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-light-elevated-hover'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.instances?.includes(instance.id) || false}
                      onChange={() => toggleInstance(instance.id)}
                      className="w-4 h-4 rounded border-white/[0.08] text-[#0169D9] focus:ring-[#0169D9]"
                    />
                    <div className="flex-1">
                      <div className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
                        {instance.name}
                      </div>
                      <div className={`text-xs ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                        {instance.phone_number}
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Horário de Atendimento */}
          <div>
            <label
              className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}
            >
              Horário de Atendimento (Opcional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Início
                </label>
                <input
                  type="time"
                  value={formData.working_hours?.start || '08:00'}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    working_hours: { 
                      start: e.target.value, 
                      end: formData.working_hours?.end || '18:00' 
                    } 
                  })}
                  className={`w-full border px-3 py-2 rounded-lg transition-all focus:outline-none focus:border-[#0169D9] ${
                    isDark
                      ? 'bg-true-black border-white/[0.08] text-white'
                      : 'bg-light-bg border-border-light text-text-primary-light'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs mb-1 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                  Fim
                </label>
                <input
                  type="time"
                  value={formData.working_hours?.end || '18:00'}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    working_hours: { 
                      start: formData.working_hours?.start || '08:00', 
                      end: e.target.value 
                    } 
                  })}
                  className={`w-full border px-3 py-2 rounded-lg transition-all focus:outline-none focus:border-[#0169D9] ${
                    isDark
                      ? 'bg-true-black border-white/[0.08] text-white'
                      : 'bg-light-bg border-border-light text-text-primary-light'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                isDark
                  ? 'border-white/[0.08] text-white hover:bg-white/[0.05]'
                  : 'border-border-light text-text-primary-light hover:bg-light-elevated-hover'
              }`}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                isValid 
                  ? 'bg-[#0169D9] hover:bg-[#0169D9]/90 text-white' 
                  : isDark 
                    ? 'bg-white/[0.1] text-white/30 cursor-not-allowed' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}