import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Clock } from 'lucide-react';
import { supabase } from '../utils/supabase/client';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { cn } from './ui/utils';

interface FollowUpModel {
  id: string;
  name: string;
  category_id: string;
  message: string;
  wait_time: number;
  time_unit: 'minutes' | 'hours' | 'days';
  created_at: string;
  category?: {
    name: string;
  };
}

interface FollowUpCategory {
  id: string;
  name: string;
}

interface FollowUpModelsManagerProps {
  isDark: boolean;
}

export function FollowUpModelsManager({ isDark }: FollowUpModelsManagerProps) {
  const [models, setModels] = useState<FollowUpModel[]>([]);
  const [categories, setCategories] = useState<FollowUpCategory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<FollowUpModel | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    message: '',
    wait_time: 24,
    time_unit: 'hours' as 'minutes' | 'hours' | 'days',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('follow_up_categories')
        .select('id, name')
        .eq('is_published', true)
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Load models with category names
      const { data: modelsData, error: modelsError } = await supabase
        .from('follow_up_models')
        .select(`
          *,
          category:follow_up_categories(name)
        `)
        .order('created_at', { ascending: false });

      if (modelsError) throw modelsError;
      setModels(modelsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (model?: FollowUpModel) => {
    if (model) {
      setEditingModel(model);
      setFormData({
        name: model.name,
        category_id: model.category_id,
        message: model.message,
        wait_time: model.wait_time,
        time_unit: model.time_unit,
      });
    } else {
      setEditingModel(null);
      setFormData({
        name: '',
        category_id: categories[0]?.id || '',
        message: '',
        wait_time: 24,
        time_unit: 'hours',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingModel(null);
  };

  const handleSave = async () => {
    try {
      if (editingModel) {
        // Update
        const { error } = await supabase
          .from('follow_up_models')
          .update(formData)
          .eq('id', editingModel.id);

        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('follow_up_models')
          .insert([formData]);

        if (error) throw error;
      }

      await loadData();
      handleCloseModal();
    } catch (error) {
      console.error('Error saving model:', error);
      alert('Erro ao salvar modelo. Verifique o console.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;

    try {
      const { error } = await supabase
        .from('follow_up_models')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting model:', error);
      alert('Erro ao excluir modelo.');
    }
  };

  const formatWaitTime = (waitTime: number, timeUnit: string) => {
    const unitLabels = {
      minutes: waitTime === 1 ? 'minuto' : 'minutos',
      hours: waitTime === 1 ? 'hora' : 'horas',
      days: waitTime === 1 ? 'dia' : 'dias',
    };
    return `${waitTime} ${unitLabels[timeUnit as keyof typeof unitLabels]}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={cn("font-medium", isDark ? "text-white" : "text-zinc-900")}>
            Modelos de Follow-ups
          </h3>
          <p className={cn("text-sm mt-1", isDark ? "text-white/50" : "text-zinc-600")}>
            Crie mensagens automáticas que serão enviadas após um tempo determinado
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          disabled={categories.length === 0}
          className="px-4 py-2 bg-[#0169D9] hover:bg-[#0159c9] text-white text-sm transition-colors flex items-center gap-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Novo Modelo
        </button>
      </div>

      {categories.length === 0 && (
        <div className={cn(
          "text-sm text-center py-6 px-4 rounded-lg",
          isDark ? "text-white/50 bg-white/[0.02]" : "text-zinc-600 bg-zinc-50"
        )}>
          Crie pelo menos uma categoria antes de adicionar modelos de follow-up.
        </div>
      )}

      {/* Lista de Modelos */}
      {loading ? (
        <div className={cn("text-sm text-center py-8", isDark ? "text-white/50" : "text-zinc-600")}>
          Carregando modelos...
        </div>
      ) : models.length === 0 ? (
        <div className={cn(
          "text-sm text-center py-8 rounded-lg",
          isDark ? "text-white/50 bg-white/[0.02]" : "text-zinc-600 bg-zinc-50"
        )}>
          Nenhum modelo criado ainda. Clique em "Novo Modelo" para começar.
        </div>
      ) : (
        <div className="space-y-4">
          {models.map((model) => (
            <div
              key={model.id}
              className={cn(
                "p-5 rounded-lg transition-colors",
                isDark
                  ? "bg-white/[0.03] hover:bg-white/[0.05]"
                  : "bg-zinc-50 hover:bg-zinc-100"
              )}
            >
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-3">
                    <h4 className={cn("font-medium text-base", isDark ? "text-white" : "text-zinc-900")}>
                      {model.name}
                    </h4>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full",
                      isDark ? "bg-white/[0.08] text-white/50" : "bg-zinc-200 text-zinc-600"
                    )}>
                      {model.category?.name || 'Sem categoria'}
                    </span>
                  </div>
                  
                  <p className={cn("text-sm mb-4 line-clamp-2 leading-relaxed", isDark ? "text-white/60" : "text-zinc-600")}>
                    {model.message}
                  </p>

                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs px-2 py-0.5 flex items-center gap-1 rounded-full",
                      isDark ? "bg-white/[0.08] text-white/50" : "bg-zinc-200 text-zinc-600"
                    )}>
                      <Clock className="w-3 h-3" />
                      Aguardar {formatWaitTime(model.wait_time, model.time_unit)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(model)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      isDark ? "text-white/50 hover:text-white hover:bg-white/[0.08]" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200"
                    )}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(model.id)}
                    className="p-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
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
              {editingModel ? 'Editar Modelo' : 'Novo Modelo de Follow-up'}
            </DialogTitle>
            <DialogDescription className={isDark ? "text-white/50" : "text-zinc-600"}>
              {editingModel ? 'Atualize os detalhes do modelo de follow-up.' : 'Crie um novo modelo de follow-up para enviar mensagens automáticas.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name" className={isDark ? "text-white/70" : "text-zinc-700"}>
                Nome do Modelo
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Primeira tentativa, Segunda tentativa..."
                className={cn(
                  "border-b transition-all",
                  isDark
                    ? "bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]"
                    : "bg-white border-zinc-300 text-zinc-900 focus:border-[#0169D9]"
                )}
              />
            </div>

            {/* Categoria */}
            <div className="space-y-2">
              <Label htmlFor="category_id" className={isDark ? "text-white/70" : "text-zinc-700"}>
                Categoria
              </Label>
              <select
                id="category_id"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className={cn(
                  "w-full px-4 py-2 border-b transition-all text-sm focus:outline-none",
                  isDark
                    ? "bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]"
                    : "bg-white border-zinc-300 text-zinc-900 focus:border-[#0169D9]"
                )}
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mensagem */}
            <div className="space-y-2">
              <Label htmlFor="message" className={isDark ? "text-white/70" : "text-zinc-700"}>
                Mensagem de Follow-up
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Digite a mensagem que será enviada ao cliente..."
                rows={6}
                className={cn(
                  "border-b transition-all resize-none",
                  isDark
                    ? "bg-black border-white/[0.2] text-white placeholder:text-white/30 focus:bg-white/[0.1] focus:border-[#0169D9]"
                    : "bg-white border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-[#0169D9]"
                )}
              />
              <p className={cn("text-xs", isDark ? "text-white/40" : "text-zinc-500")}>
                Você pode usar variáveis como {'{nome}'}, {'{empresa}'}, {'{produto}'} que serão substituídas automaticamente.
              </p>
            </div>

            {/* Tempo de Espera */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wait_time" className={isDark ? "text-white/70" : "text-zinc-700"}>
                  Tempo de Espera
                </Label>
                <Input
                  id="wait_time"
                  type="number"
                  min="1"
                  value={formData.wait_time}
                  onChange={(e) => setFormData({ ...formData, wait_time: parseInt(e.target.value) || 1 })}
                  className={cn(
                    "border-b transition-all",
                    isDark
                      ? "bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]"
                      : "bg-white border-zinc-300 text-zinc-900 focus:border-[#0169D9]"
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="time_unit" className={isDark ? "text-white/70" : "text-zinc-700"}>
                  Unidade de Tempo
                </Label>
                <select
                  id="time_unit"
                  value={formData.time_unit}
                  onChange={(e) => setFormData({ ...formData, time_unit: e.target.value as 'minutes' | 'hours' | 'days' })}
                  className={cn(
                    "w-full px-4 py-2 border-b transition-all text-sm focus:outline-none",
                    isDark
                      ? "bg-black border-white/[0.2] text-white focus:bg-white/[0.1] focus:border-[#0169D9]"
                      : "bg-white border-zinc-300 text-zinc-900 focus:border-[#0169D9]"
                  )}
                >
                  <option value="minutes">Minutos</option>
                  <option value="hours">Horas</option>
                  <option value="days">Dias</option>
                </select>
              </div>
            </div>
          </div>

          <div className={cn("flex justify-end gap-3 pt-4 border-t", isDark ? "border-white/[0.08]" : "border-zinc-200")}>
            <button
              onClick={handleCloseModal}
              className={cn(
                "px-4 py-2 text-sm transition-colors",
                isDark
                  ? "text-white/70 hover:bg-white/[0.05]"
                  : "text-zinc-600 hover:bg-zinc-100"
              )}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!formData.name || !formData.category_id || !formData.message}
              className="px-4 py-2 bg-[#0169D9] hover:bg-[#0159c9] text-white text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingModel ? 'Salvar Alterações' : 'Criar Modelo'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}