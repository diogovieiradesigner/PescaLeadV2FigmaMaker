import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock, Sun, Database } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { cn } from './ui/utils';

interface FollowUpCategory {
  id: string;
  name: string;
  ai_instructions: string;
  availability: '24hrs' | 'business_hours';
  is_published: boolean;
  created_at: string;
}

interface FollowUpCategoriesManagerProps {
  isDark: boolean;
  agentId: string; // Novo prop para identificar o agente
  workspaceId: string | null; // ✅ WORKSPACE ID
  refreshTrigger?: number; // Trigger externo para forçar reload
  onCategoryChanged?: () => void; // ✅ Callback para notificar mudanças
}

export function FollowUpCategoriesManager({ isDark, agentId, workspaceId, refreshTrigger, onCategoryChanged }: FollowUpCategoriesManagerProps) {
  const [categories, setCategories] = useState<FollowUpCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FollowUpCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  
  // Novo state para follow_up_mode
  const [followUpMode, setFollowUpMode] = useState<'ai_only' | 'human_only' | 'both' | 'disabled'>('ai_only');
  const [loadingMode, setLoadingMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    ai_instructions: '',
    availability: '24hrs' as '24hrs' | 'business_hours',
    is_published: true,
  });

  useEffect(() => {
    loadCategories();
    loadFollowUpMode();
  }, [refreshTrigger, workspaceId]); // ✅ Adicionar workspaceId como dependência

  const loadCategories = async () => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('follow_up_categories')
        .select('*')
        .eq('workspace_id', workspaceId) // ✅ FILTRO ADICIONADO
        .order('created_at', { ascending: false });

      if (error) {
        // Verifica se é erro de tabela não encontrada ou permissão
        if (error.code === 'PGRST205' || error.code === '42501' || error.message?.includes('Could not find') || error.message?.includes('permission denied')) {
          setTableExists(false);
        } else {
          throw error;
        }
      } else {
        setTableExists(true);
        setCategories(data || []);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFollowUpMode = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('follow_up_mode')
        .eq('id', agentId)
        .single();

      if (error) {
        console.error('Error loading follow_up_mode:', error);
        return;
      }

      setFollowUpMode(data?.follow_up_mode || 'ai_only');
    } catch (error) {
      console.error('Error loading follow_up_mode:', error);
    }
  };

  const handleFollowUpModeChange = async (newMode: 'ai_only' | 'human_only' | 'both' | 'disabled') => {
    try {
      setLoadingMode(true);
      const { error } = await supabase
        .from('ai_agents')
        .update({ follow_up_mode: newMode })
        .eq('id', agentId);

      if (error) throw error;

      setFollowUpMode(newMode);
    } catch (error) {
      console.error('Error updating follow_up_mode:', error);
      alert('Erro ao atualizar modo de follow-up. Verifique o console.');
    } finally {
      setLoadingMode(false);
    }
  };

  const handleOpenModal = (category?: FollowUpCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        ai_instructions: category.ai_instructions,
        availability: category.availability,
        is_published: category.is_published,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        ai_instructions: '',
        availability: '24hrs',
        is_published: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
  };

  const handleSave = async () => {
    try {
      if (editingCategory) {
        // Update
        const { error } = await supabase
          .from('follow_up_categories')
          .update(formData)
          .eq('id', editingCategory.id);

        if (error) throw error;
      } else {
        // Create - ✅ ADICIONAR workspace_id
        if (!workspaceId) {
          alert('Workspace não identificado. Faça login novamente.');
          return;
        }

        const { error } = await supabase
          .from('follow_up_categories')
          .insert([{
            ...formData,
            workspace_id: workspaceId, // ✅ OBRIGATÓRIO
          }]);

        if (error) throw error;
      }

      await loadCategories();
      handleCloseModal();
      
      // ✅ Notificar mudança para sincronizar com FollowUpModelsManager
      if (onCategoryChanged) {
        onCategoryChanged();
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Erro ao salvar categoria. Verifique o console.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta categoria?')) return;

    try {
      const { error } = await supabase
        .from('follow_up_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadCategories();
      if (onCategoryChanged) {
        onCategoryChanged();
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Erro ao excluir categoria. Pode haver modelos vinculados.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Modo de Follow-up */}
      <div className={cn(
        "pb-6 border-b",
        isDark ? "border-white/[0.08]" : "border-zinc-300"
      )}>
        <div className="mb-3">
          <h3 className={cn("font-medium", isDark ? "text-white" : "text-zinc-900")}>
            Modo de Follow-up
          </h3>
          <p className={cn("text-sm mt-1", isDark ? "text-white/50" : "text-zinc-600")}>
            Defina quando os follow-ups automáticos devem ser acionados
          </p>
        </div>

        <select
          value={followUpMode}
          onChange={(e) => handleFollowUpModeChange(e.target.value as 'ai_only' | 'human_only' | 'both' | 'disabled')}
          disabled={loadingMode}
          style={isDark ? { colorScheme: 'dark' } : undefined}
          className={cn(
            "w-full px-3 py-2 rounded-lg border outline-none transition-colors",
            isDark
              ? "bg-white/[0.05] border-white/[0.1] text-white focus:border-[#0169D9]"
              : "bg-white border-gray-200 text-gray-900 focus:border-[#0169D9]",
            loadingMode && "opacity-50 cursor-not-allowed"
          )}
        >
          <option value="ai_only" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Apenas quando IA ativa</option>
          <option value="human_only" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Apenas quando atendimento humano</option>
          <option value="both" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>IA e Humano</option>
          <option value="disabled" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Desabilitado</option>
        </select>
      </div>

      {/* Header das Categorias */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={cn("font-medium", isDark ? "text-white" : "text-zinc-900")}>
            Categorias de Follow-ups
          </h3>
          <p className={cn("text-sm mt-1", isDark ? "text-white/50" : "text-zinc-600")}>
            Organize seus follow-ups em categorias para a I.A usar no momento certo
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-[#0169D9] hover:bg-[#0159c9] text-white text-sm transition-colors flex items-center gap-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      {/* Lista de Categorias */}
      {loading ? (
        <div className={cn("text-sm text-center py-8", isDark ? "text-white/50" : "text-zinc-600")}>
          Carregando categorias...
        </div>
      ) : !tableExists ? (
        <div className={cn(
          "text-sm text-center py-8 rounded-lg",
          isDark ? "text-white/50 bg-white/[0.02]" : "text-zinc-600 bg-zinc-50"
        )}>
          Tabela de categorias não encontrada. Verifique a configuração do banco de dados.
        </div>
      ) : categories.length === 0 ? (
        <div className={cn(
          "text-sm text-center py-8 rounded-lg",
          isDark ? "text-white/50 bg-white/[0.02]" : "text-zinc-600 bg-zinc-50"
        )}>
          Nenhuma categoria criada ainda. Clique em "Nova Categoria" para começar.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => (
            <div
              key={category.id}
              className={cn(
                "p-5 rounded-lg transition-colors",
                isDark
                  ? "bg-white/[0.03] hover:bg-white/[0.05]"
                  : "bg-zinc-50 hover:bg-zinc-100"
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className={cn("font-medium text-base mb-2", isDark ? "text-white" : "text-zinc-900")}>
                    {category.name}
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-0.5 flex items-center gap-1 rounded-full",
                      isDark ? "bg-white/[0.08] text-white/50" : "bg-zinc-200 text-zinc-600"
                    )}>
                      {category.availability === '24hrs' ? (
                        <>
                          <Clock className="w-3 h-3" />
                          24hrs
                        </>
                      ) : (
                        <>
                          <Sun className="w-3 h-3" />
                          Comercial
                        </>
                      )}
                    </span>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      category.is_published
                        ? "bg-green-500/20 text-green-400"
                        : isDark ? "bg-white/[0.08] text-white/50" : "bg-zinc-200 text-zinc-500"
                    )}>
                      {category.is_published ? 'Publicado' : 'Rascunho'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button
                    onClick={() => handleOpenModal(category)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isDark ? "text-white/50 hover:text-white hover:bg-white/[0.08]" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
                    )}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className={cn("text-sm line-clamp-2 leading-relaxed", isDark ? "text-white/60" : "text-zinc-600")}>
                {category.ai_instructions}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Criação/Edição */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className={cn(
          "max-w-2xl",
          isDark ? "bg-black border-white/[0.08]" : "bg-white border-zinc-300"
        )}>
          <DialogHeader>
            <DialogTitle className={isDark ? "text-white" : "text-zinc-900"}>
              {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription className={isDark ? "text-white/50" : "text-zinc-600"}>
              Organize seus follow-ups em categorias para a I.A usar no momento certo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name" className={isDark ? "text-white/70" : "text-zinc-700"}>
                Nome da Categoria
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Vendas e Orçamento"
                className={cn(
                  "border-b transition-all",
                  isDark
                    ? "bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]"
                    : "bg-white border-zinc-300 text-zinc-900 focus:border-[#0169D9]"
                )}
              />
            </div>

            {/* Instruções para I.A */}
            <div className="space-y-2">
              <Label htmlFor="ai_instructions" className={isDark ? "text-white/70" : "text-zinc-700"}>
                Quando a I.A deve usar esta categoria?
              </Label>
              <Textarea
                id="ai_instructions"
                value={formData.ai_instructions}
                onChange={(e) => setFormData({ ...formData, ai_instructions: e.target.value })}
                placeholder="Use quando o cliente demonstrou interesse em nossos serviços..."
                rows={4}
                className={cn(
                  "border-b transition-all resize-none",
                  isDark
                    ? "bg-black border-white/[0.2] text-white placeholder:text-white/30 focus:bg-white/[0.1] focus:border-[#0169D9]"
                    : "bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-[#0169D9]"
                )}
              />
              <p className={cn("text-xs", isDark ? "text-white/40" : "text-zinc-500")}>
                Seja específico: inclua critérios como tempo sem resposta, comportamento do lead, etapa do funil, etc.
              </p>
            </div>

            {/* Disponibilidade */}
            <div className="space-y-2">
              <Label htmlFor="availability" className={isDark ? "text-white/70" : "text-zinc-700"}>
                Disponibilidade de Envio
              </Label>
              <select
                id="availability"
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value as '24hrs' | 'business_hours' })}
                style={isDark ? { colorScheme: 'dark' } : undefined}
                className={cn(
                  "w-full px-4 py-2 border-b transition-all text-sm focus:outline-none",
                  isDark
                    ? "bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]"
                    : "bg-white border-zinc-300 text-zinc-900 focus:border-[#0169D9]"
                )}
              >
                <option value="24hrs" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Follow-ups 24hrs</option>
                <option value="business_hours" className={isDark ? 'bg-[#0a0a0a] text-white' : 'bg-white text-black'}>Horário Comercial</option>
              </select>
            </div>

            {/* Publicado */}
            <div className={cn("flex items-center justify-between py-4 border-t", isDark ? "border-white/[0.08]" : "border-zinc-200")}>
              <div>
                <Label className={isDark ? "text-white" : "text-zinc-900"}>
                  Categoria Publicada
                </Label>
                <p className={cn("text-xs mt-1", isDark ? "text-white/40" : "text-zinc-500")}>
                  Somente categorias publicadas serão usadas pela I.A
                </p>
              </div>
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
            </div>
          </div>

          <div className={cn("flex justify-end gap-3 pt-4 border-t", isDark ? "border-white/[0.08]" : "border-zinc-200")}>
            <button
              onClick={handleCloseModal}
              className={cn(
                "px-4 py-2 text-sm transition-colors rounded-lg",
                isDark
                  ? "text-white/70 hover:bg-white/[0.05]"
                  : "text-zinc-600 hover:bg-zinc-100"
              )}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name || !formData.ai_instructions}
              className="px-4 py-2 bg-[#0169D9] hover:bg-[#0159c9] text-white text-sm transition-colors rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}