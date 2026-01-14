import { useState } from 'react';
import { X, Plus, GripVertical, Trash2 } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface FunnelColumn {
  id: string;
  name: string;
}

interface AddFunnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (funnelName: string, columns: FunnelColumn[]) => void;
  theme: Theme;
}

export function AddFunnelModal({ isOpen, onClose, onSave, theme }: AddFunnelModalProps) {
  const [funnelName, setFunnelName] = useState('');
  const [columns, setColumns] = useState<FunnelColumn[]>([
    { id: 'new', name: 'Novo' },
    { id: 'contacted', name: 'Contactado' },
    { id: 'qualified', name: 'Qualificado' },
  ]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isDark = theme === 'dark';


  if (!isOpen) return null;

  const handleAddColumn = () => {
    const newId = `column-${Date.now()}`;
    setColumns([...columns, { id: newId, name: '' }]);
  };

  const handleRemoveColumn = (id: string) => {
    if (columns.length <= 1) return; // Manter pelo menos 1 coluna
    setColumns(columns.filter((col) => col.id !== id));
  };

  const handleColumnNameChange = (id: string, name: string) => {
    setColumns(columns.map((col) => (col.id === id ? { ...col, name } : col)));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedIndex(index);

    // Criar imagem fantasma personalizada
    const dragImage = (e.target as HTMLElement).cloneNode(true) as HTMLElement;
    dragImage.style.opacity = '0.5';
    dragImage.style.position = 'absolute';
    dragImage.style.top = '-9999px';
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

    if (dragIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newColumns = [...columns];
    const [draggedColumn] = newColumns.splice(dragIndex, 1);
    newColumns.splice(dropIndex, 0, draggedColumn);
    setColumns(newColumns);

    setDraggedIndex(null);
    setDragOverIndex(null);
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
    
    // Reset form
    setFunnelName('');
    setColumns([
      { id: 'new', name: 'Novo' },
      { id: 'contacted', name: 'Contactado' },
      { id: 'qualified', name: 'Qualificado' },
    ]);
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
            ? 'bg-[#0A0A0A] border-white/[0.08]'
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
            Criar Novo Funil
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
        <div className="overflow-y-auto scrollbar-thin max-h-[calc(90vh-140px)] px-6 py-5">
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

            {/* Info sobre Taxa de Conversão */}
            <div className={`mb-3 p-3 rounded-lg border text-xs ${
              isDark
                ? 'bg-blue-500/5 border-blue-500/20 text-blue-400'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <p className="font-medium mb-1">Taxa de Conversão:</p>
              <p>
                Colunas com as palavras <strong>"ganho"</strong>, <strong>"fechado"</strong> ou <strong>"won"</strong> no nome são contadas como conversão.
              </p>
              <p className="mt-1">
                Se nenhuma coluna tiver essas palavras, a <strong>última coluna</strong> será considerada como conversão.
              </p>
            </div>

            <div className="space-y-2">
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-move transition-all ${
                    draggedIndex === index
                      ? isDark
                        ? 'opacity-50 bg-true-black border-white/[0.08]'
                        : 'opacity-50 bg-light-elevated border-border-light'
                      : dragOverIndex === index
                      ? isDark
                        ? 'bg-blue-500/10 border-blue-500/30 scale-105'
                        : 'bg-blue-50 border-blue-300 scale-105'
                      : isDark
                      ? 'bg-true-black border-white/[0.08] hover:border-white/[0.15]'
                      : 'bg-light-elevated border-border-light hover:border-border-light/80'
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

                  <button
                    onClick={() => handleRemoveColumn(column.id)}
                    disabled={columns.length <= 1}
                    className={`p-1.5 rounded-lg transition-colors ${
                      columns.length <= 1
                        ? 'opacity-30 cursor-not-allowed'
                        : isDark
                        ? 'hover:bg-white/[0.05] text-white/50 hover:text-red-400'
                        : 'hover:bg-light-elevated text-text-secondary-light hover:text-red-500'
                    }`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <p
              className={`mt-3 text-xs ${
                isDark ? 'text-white/40' : 'text-text-secondary-light'
              }`}
            >
              As colunas representam os estágios do seu funil de vendas. Você pode
              adicionar quantas colunas precisar.
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
            Criar Funil
          </button>
        </div>
      </div>
    </div>
  );
}