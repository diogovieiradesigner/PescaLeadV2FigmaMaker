import { useState, useEffect, useRef } from 'react';
import { X, Plus, GripVertical, Edit2 } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface FunnelColumn {
  id: string;
  name: string;
}

interface EditFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (funnelName: string, columns: FunnelColumn[]) => void;
  theme: Theme;
  currentFunnelName: string;
  currentColumns: FunnelColumn[];
}

export function EditFunnelModal({ 
  isOpen, 
  onClose, 
  onSave, 
  theme,
  currentFunnelName,
  currentColumns,
}: EditFunnelModalProps) {
  const [funnelName, setFunnelName] = useState('');
  const [columns, setColumns] = useState<FunnelColumn[]>([]);
  const initializedRef = useRef(false);

  const isDark = theme === 'dark';

  // Initialize state ONLY when modal opens (not on every prop change)
  useEffect(() => {
    if (isOpen && !initializedRef.current) {
      setFunnelName(currentFunnelName);
      setColumns([...currentColumns]);
      initializedRef.current = true;
    } else if (!isOpen) {
      // Reset flag when modal closes
      initializedRef.current = false;
    }
  }, [isOpen, currentFunnelName, currentColumns]);

  if (!isOpen) return null;

  const handleAddColumn = () => {
    const newId = `column-${Date.now()}`;
    setColumns([...columns, { id: newId, name: '' }]);
  };

  const handleColumnNameChange = (id: string, name: string) => {
    setColumns(columns.map((col) => (col.id === id ? { ...col, name } : col)));
  };

  const handleSave = () => {
    if (!funnelName.trim()) {
      alert('Por favor, insira um nome para o funil');
      return;
    }

    const hasEmptyColumns = columns.some((col) => !col.name.trim());
    if (hasEmptyColumns) {
      alert('Por favor, preencha todos os nomes das colunas');
      return;
    }

    onSave(funnelName, columns);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 transition-opacity ${
          isDark ? 'bg-black/80' : 'bg-black/40'
        }`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl border shadow-2xl transition-colors ${
          isDark
            ? 'bg-elevated border-white/[0.08]'
            : 'bg-white border-border-light'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}
        >
          <h2 className={isDark ? 'text-white' : 'text-text-primary-light'}>
            Configurações do Funil
          </h2>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/50'
                : 'hover:bg-light-elevated text-text-secondary-light'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-5">
          {/* Funnel Name */}
          <div className="mb-6">
            <label
              className={`block text-sm mb-2 ${
                isDark ? 'text-white/70' : 'text-text-secondary-light'
              }`}
            >
              Nome do Funil
            </label>
            <input
              type="text"
              value={funnelName}
              onChange={(e) => setFunnelName(e.target.value)}
              placeholder="Ex: Pipeline de Vendas"
              className={`w-full border px-3 py-2 rounded-lg transition-all focus:outline-none focus:border-[#0169D9] ${
                isDark
                  ? 'bg-true-black border-white/[0.08] text-white placeholder-white/40'
                  : 'bg-light-elevated border-border-light text-text-primary-light placeholder-text-secondary-light'
              }`}
            />
          </div>

          {/* Columns */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label
                className={`text-sm ${
                  isDark ? 'text-white/70' : 'text-text-secondary-light'
                }`}
              >
                Colunas do Funil ({columns.length})
              </label>
              <button
                onClick={handleAddColumn}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  isDark
                    ? 'bg-white/[0.05] hover:bg-white/[0.08] text-white/70 border border-white/[0.08]'
                    : 'bg-light-elevated hover:bg-light-elevated-hover text-text-primary-light border border-border-light'
                }`}
              >
                <Plus className="w-4 h-4" />
                Adicionar Coluna
              </button>
            </div>

            <div className="space-y-2">
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    isDark
                      ? 'bg-true-black border-white/[0.08]'
                      : 'bg-light-elevated border-border-light'
                  }`}
                >
                  <GripVertical
                    className={`w-4 h-4 flex-shrink-0 ${
                      isDark ? 'text-white/30' : 'text-text-secondary-light'
                    }`}
                  />
                  
                  <div className="flex-1">
                    <input
                      type="text"
                      value={column.name}
                      onChange={(e) => handleColumnNameChange(column.id, e.target.value)}
                      placeholder={`Nome da coluna ${index + 1}`}
                      className={`w-full border px-3 py-1.5 rounded-lg text-sm transition-all focus:outline-none focus:border-[#0169D9] ${
                        isDark
                          ? 'bg-elevated border-white/[0.08] text-white placeholder-white/40'
                          : 'bg-white border-border-light text-text-primary-light placeholder-text-secondary-light'
                      }`}
                    />
                  </div>

                  <div
                    className={`p-1.5 rounded-lg ${
                      isDark ? 'text-white/30' : 'text-text-secondary-light'
                    }`}
                  >
                    <Edit2 className="w-4 h-4" />
                  </div>
                </div>
              ))}
            </div>

            <p
              className={`mt-3 text-xs ${
                isDark ? 'text-white/40' : 'text-text-secondary-light'
              }`}
            >
              Você pode editar nomes de colunas existentes e adicionar novas colunas ao funil.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-end gap-3 px-6 py-4 border-t ${
            isDark ? 'border-white/[0.08]' : 'border-border-light'
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg transition-colors text-sm ${
              isDark
                ? 'hover:bg-white/[0.05] text-white/70'
                : 'hover:bg-light-elevated text-text-secondary-light'
            }`}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#0169D9] hover:bg-[#0169D9]/90 text-white rounded-lg transition-colors text-sm"
          >
            Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
}