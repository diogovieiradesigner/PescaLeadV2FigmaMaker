import { X } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useState } from 'react';
import { Theme } from '../hooks/useTheme';

interface AddCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  columnTitle: string;
  onAdd: (data: {
    clientName: string;
    company: string;
    dealValue: number;
    priority: 'high' | 'medium' | 'low';
    dueDate: string;
  }) => void;
  theme: Theme;
}

export function AddCardModal({ isOpen, onClose, columnTitle, onAdd, theme }: AddCardModalProps) {
  const isDark = theme === 'dark';
  const [formData, setFormData] = useState({
    clientName: '',
    company: '',
    dealValue: '',
    priority: 'medium' as 'high' | 'medium' | 'low',
    dueDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      dealValue: parseFloat(formData.dealValue) || 0,
    });
    setFormData({
      clientName: '',
      company: '',
      dealValue: '',
      priority: 'medium',
      dueDate: '',
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-true-black/80 z-40"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div
              className={`rounded-xl border w-full max-w-md ${
                isDark
                  ? 'bg-elevated border-white/[0.08]'
                  : 'bg-white border-border-light shadow-lg'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex items-center justify-between p-6 border-b ${
                isDark ? 'border-white/[0.08]' : 'border-border-light'
              }`}>
                <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
                  Adicionar Lead em {columnTitle}
                </h2>
                <button
                  onClick={onClose}
                  className={`p-1 rounded-lg transition-colors ${
                    isDark 
                      ? 'hover:bg-white/[0.05]' 
                      : 'hover:bg-light-elevated-hover'
                  }`}
                >
                  <X className={`w-5 h-5 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className={`block mb-2 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className={`w-full border px-4 py-2 rounded-lg focus:outline-none focus:border-[#0169D9] transition-all ${
                      isDark
                        ? 'bg-true-black border-white/[0.08] text-white'
                        : 'bg-light-elevated border-border-light text-text-primary-light'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block mb-2 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className={`w-full border px-4 py-2 rounded-lg focus:outline-none focus:border-[#0169D9] transition-all ${
                      isDark
                        ? 'bg-true-black border-white/[0.08] text-white'
                        : 'bg-light-elevated border-border-light text-text-primary-light'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block mb-2 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    Valor do Negócio ($)
                  </label>
                  <input
                    type="number"
                    value={formData.dealValue}
                    onChange={(e) => setFormData({ ...formData, dealValue: e.target.value })}
                    className={`w-full border px-4 py-2 rounded-lg focus:outline-none focus:border-[#0169D9] transition-all ${
                      isDark
                        ? 'bg-true-black border-white/[0.08] text-white'
                        : 'bg-light-elevated border-border-light text-text-primary-light'
                    }`}
                    required
                  />
                </div>

                <div>
                  <label className={`block mb-2 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    Prioridade
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })}
                    className={`w-full border px-4 py-2 rounded-lg focus:outline-none focus:border-[#0169D9] transition-all ${
                      isDark
                        ? 'bg-true-black border-white/[0.08] text-white'
                        : 'bg-light-elevated border-border-light text-text-primary-light'
                    }`}
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>

                <div>
                  <label className={`block mb-2 ${
                    isDark ? 'text-white/50' : 'text-text-secondary-light'
                  }`}>
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className={`w-full border px-4 py-2 rounded-lg focus:outline-none focus:border-[#0169D9] transition-all ${
                      isDark
                        ? 'bg-true-black border-white/[0.08] text-white'
                        : 'bg-light-elevated border-border-light text-text-primary-light'
                    }`}
                    required
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className={`flex-1 px-4 py-2 rounded-lg border transition-all ${
                      isDark
                        ? 'border-white/[0.08] text-white/70 hover:bg-white/[0.03]'
                        : 'border-border-light text-text-secondary-light hover:bg-light-elevated-hover'
                    }`}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 rounded-lg bg-[#0169D9] text-white hover:bg-[#0184F5] transition-all"
                  >
                    Adicionar Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}