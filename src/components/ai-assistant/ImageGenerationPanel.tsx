import { useState, useRef, useCallback, forwardRef, useImperativeHandle, useEffect } from 'react';
import { Theme } from '../../hooks/useTheme';
import {
  X,
  Wand2,
  ImagePlus,
  Upload,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Settings2,
} from 'lucide-react';
import type { ImageGenerationConfig } from '../../services/ai-assistant-service';
import type { ImageGenerationData } from '../../types/ai-assistant';

interface ImageGenerationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (config: ImageGenerationConfig) => void;
  isGenerating: boolean;
  theme: Theme;
  prompt: string;
  onModeChange?: (mode: 'text-to-image' | 'image-to-image') => void;
}

export interface ImageGenerationPanelRef {
  submit: () => void;
  canSubmit: () => boolean;
  setConfigFromData: (data: ImageGenerationData) => void;
}

type GenerationMode = 'text-to-image' | 'image-to-image';

interface StylePreset {
  id: string;
  name: string;
  description: string;
}

interface SizePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  description: string;
}

const STYLE_PRESETS: StylePreset[] = [
  { id: 'logo', name: 'Logo', description: 'Fundo branco, linhas nítidas, vetorizável' },
  { id: 'realistic', name: 'Realista', description: 'Imagens fotorrealistas' },
  { id: 'photography', name: 'Fotografia', description: 'Estilo fotográfico profissional' },
  { id: 'digital_art', name: 'Arte Digital', description: 'Ilustrações digitais modernas' },
  { id: 'anime', name: 'Anime', description: 'Estilo de animação japonesa' },
  { id: 'painting', name: 'Pintura', description: 'Estilo de pintura artística' },
  { id: '3d_render', name: '3D Render', description: 'Renderização 3D realista' },
];

// Presets para Text-to-Image (até 2048x2048)
const SIZE_PRESETS_TEXT2IMG: SizePreset[] = [
  // Resoluções padrão
  { id: 'square', name: 'Quadrado', width: 1024, height: 1024, description: '1024x1024' },
  { id: 'landscape', name: 'Paisagem', width: 1024, height: 768, description: '1024x768' },
  { id: 'portrait', name: 'Retrato', width: 768, height: 1024, description: '768x1024' },
  // Resoluções HD
  { id: 'hd', name: 'HD', width: 1280, height: 720, description: '1280x720' },
  { id: 'fullhd', name: 'Full HD', width: 1920, height: 1080, description: '1920x1080' },
  // Resoluções grandes (máx 2048)
  { id: 'square_hq', name: 'Quadrado HQ', width: 2048, height: 2048, description: '2048x2048 (máx)' },
  { id: '2k', name: '2K Wide', width: 2048, height: 1152, description: '2048x1152' },
];

// Presets para Image-to-Image (máx 1024x1024 - limite da API Qwen)
const SIZE_PRESETS_IMG2IMG: SizePreset[] = [
  { id: 'square', name: 'Quadrado', width: 1024, height: 1024, description: '1024x1024 (máx)' },
  { id: 'landscape', name: 'Paisagem', width: 1024, height: 768, description: '1024x768' },
  { id: 'portrait', name: 'Retrato', width: 768, height: 1024, description: '768x1024' },
  { id: 'small_square', name: 'Pequeno', width: 512, height: 512, description: '512x512 (rápido)' },
];

const QUALITY_PRESETS = [
  { steps: 4, name: 'Rápido', description: '~2s (Schnell)' },
  { steps: 20, name: 'Padrão', description: '~8s' },
  { steps: 30, name: 'Alta', description: '~15s' },
];

// Modelos disponíveis para geração de imagem
// Referência: https://chutes.ai/docs/examples/image-generation
interface ImageModel {
  id: string;
  name: string;
  description: string;
  category: 'fast' | 'quality' | 'artistic';
  defaultSteps?: number;
  dedicatedEndpoint?: boolean; // Se usa endpoint dedicado (URL própria)
  supportsImg2Img?: boolean; // Se suporta Image-to-Image (default: true para não-dedicados)
  noGuidance?: boolean; // Se o modelo não usa guidance_scale (modelos distilados)
  noNegativePrompt?: boolean; // Se o modelo não suporta negative_prompt
  noStyle?: boolean; // Se o modelo não suporta estilos (que dependem de guidance/negative)
  noSize?: boolean; // Se o modelo não permite escolher tamanho
  noQuality?: boolean; // Se o modelo não permite escolher qualidade
  noSeed?: boolean; // Se o modelo não suporta seed
  maxPromptLength?: number; // Limite de caracteres no prompt (undefined = sem limite)
}

// Modelo especial para Image-to-Image (Qwen Image Edit)
const QWEN_IMG2IMG_MODEL: ImageModel = {
  id: 'qwen-image-edit',
  name: 'Qwen Image Edit',
  description: 'Edição e transformação de imagens',
  category: 'quality',
  defaultSteps: 40,
  dedicatedEndpoint: true,
  supportsImg2Img: true, // Este é o modelo específico para img2img
};

const IMAGE_MODELS: ImageModel[] = [
  // === Modelos com Endpoint Dedicado (URL própria) ===
  {
    id: 'z-image-turbo',
    name: 'Z-Image Turbo',
    description: 'Ultra rápido, só prompt',
    category: 'fast',
    defaultSteps: 8,
    dedicatedEndpoint: true,
    supportsImg2Img: false,
    noGuidance: true, // Z-Image Turbo não usa guidance_scale (modelo distilado)
    noNegativePrompt: true, // Z-Image Turbo não suporta negative_prompt
    noStyle: true, // Estilos dependem de guidance/negative que não são suportados
    noSize: true, // Z-Image Turbo não permite escolher tamanho
    noQuality: true, // Z-Image Turbo não permite escolher qualidade/steps
    noSeed: true, // Z-Image Turbo não suporta seed
    maxPromptLength: 200, // Limite conservador de caracteres
  },
  {
    id: 'hidream',
    name: 'HiDream',
    description: 'Sonhos e fantasia',
    category: 'artistic',
    defaultSteps: 50,
    dedicatedEndpoint: true,
    supportsImg2Img: false,
  },
  {
    id: 'hunyuan',
    name: 'Hunyuan Image 3',
    description: 'Tencent, máxima qualidade',
    category: 'quality',
    defaultSteps: 30,
    dedicatedEndpoint: true,
    supportsImg2Img: false,
  },
  // === Modelos via Endpoint Unificado ===
  {
    id: 'flux-schnell',
    name: 'FLUX.1 Schnell',
    description: 'Ultra rápido (~2s)',
    category: 'fast',
    defaultSteps: 4,
    supportsImg2Img: false,
  },
  {
    id: 'juggernaut-xl',
    name: 'Juggernaut XL',
    description: 'Logos, detalhes precisos',
    category: 'quality',
    defaultSteps: 30,
    supportsImg2Img: false,
  },
  {
    id: 'juggernaut-ragnarok',
    name: 'Juggernaut Ragnarok',
    description: 'Logos épicos, alta definição',
    category: 'quality',
    defaultSteps: 30,
    supportsImg2Img: false,
  },
  {
    id: 'dreamshaper',
    name: 'DreamShaper XL',
    description: 'Arte e ilustração',
    category: 'artistic',
    defaultSteps: 30,
    supportsImg2Img: false,
  },
  {
    id: 'sdxl',
    name: 'Stable Diffusion XL',
    description: 'Base SDXL oficial',
    category: 'quality',
    defaultSteps: 30,
    supportsImg2Img: false,
  },
  {
    id: 'chroma',
    name: 'Chroma',
    description: 'Cores vibrantes',
    category: 'artistic',
    defaultSteps: 30,
    supportsImg2Img: false,
  },
  {
    id: 'illustrious',
    name: 'Illustrij',
    description: 'Ilustrações artísticas',
    category: 'artistic',
    defaultSteps: 30,
    supportsImg2Img: false,
  },
];

export const ImageGenerationPanel = forwardRef<ImageGenerationPanelRef, ImageGenerationPanelProps>(({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
  theme,
  prompt,
  onModeChange,
}, ref) => {
  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [mode, setMode] = useState<GenerationMode>('text-to-image');
  const [selectedModel, setSelectedModel] = useState<string>('flux-schnell');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('realistic');
  const [selectedSize, setSelectedSize] = useState<string>('square');
  const [quality, setQuality] = useState(30);
  const [seed, setSeed] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // img2img specific
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState<string | null>(null);
  const [strength, setStrength] = useState(0.7);
  const [isDragging, setIsDragging] = useState(false);

  // Handler para mudar o modo e notificar o parent
  const handleModeChange = useCallback((newMode: GenerationMode) => {
    setMode(newMode);
    onModeChange?.(newMode);

    // Resetar tamanho se o atual não existe no novo modo
    if (newMode === 'image-to-image') {
      // Se o tamanho atual não existe nos presets de img2img, resetar para 'square'
      const existsInImg2Img = SIZE_PRESETS_IMG2IMG.some(s => s.id === selectedSize);
      if (!existsInImg2Img) {
        setSelectedSize('square');
      }
    }
    // Para img2img, usamos automaticamente o Qwen Image Edit (não precisa trocar modelo)
  }, [onModeChange, selectedSize]);

  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo: 10MB');
      return;
    }

    setReferenceImage(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = () => {
      setReferencePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
  }, [handleImageSelect]);

  const handleRemoveImage = useCallback(() => {
    setReferenceImage(null);
    setReferencePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) return;

    if (mode === 'image-to-image' && !referenceImage) {
      alert('Selecione uma imagem de referência para o modo Image-to-Image');
      return;
    }

    // Selecionar preset de tamanho baseado no modo
    const sizePresets = mode === 'image-to-image' ? SIZE_PRESETS_IMG2IMG : SIZE_PRESETS_TEXT2IMG;
    const sizePreset = sizePresets.find(s => s.id === selectedSize) || sizePresets[0];

    // Para img2img, usar modelo Qwen; para text-to-image, usar modelo selecionado
    const modelInfo = mode === 'image-to-image'
      ? QWEN_IMG2IMG_MODEL
      : (IMAGE_MODELS.find(m => m.id === selectedModel) || IMAGE_MODELS[0]);

    // Verificar se o modelo suporta negative_prompt e style
    const supportsNegativePrompt = !modelInfo.noNegativePrompt;
    const supportsStyle = !modelInfo.noStyle;

    const config: ImageGenerationConfig = {
      mode,
      prompt: prompt.trim(),
      // Só enviar negative_prompt se o modelo suportar
      negative_prompt: supportsNegativePrompt ? (negativePrompt.trim() || undefined) : undefined,
      // Só enviar style se o modelo suportar
      style: supportsStyle ? (selectedStyle as ImageGenerationConfig['style']) : undefined,
      width: sizePreset.width,
      height: sizePreset.height,
      num_inference_steps: modelInfo.defaultSteps || quality,
      seed: seed ? parseInt(seed, 10) : undefined,
      model_id: modelInfo.id,
      ...(mode === 'image-to-image' && {
        reference_image: referenceImage!,
        strength,
      }),
    };

    onGenerate(config);
  }, [mode, selectedModel, prompt, negativePrompt, selectedStyle, selectedSize, quality, seed, referenceImage, strength, onGenerate]);

  // Função para verificar se pode submeter
  const canSubmit = useCallback(() => {
    if (!prompt.trim()) return false;
    if (mode === 'image-to-image' && !referenceImage) return false;
    return true;
  }, [prompt, mode, referenceImage]);

  // Função para configurar a partir de dados existentes (reusar configs)
  const setConfigFromData = useCallback((data: ImageGenerationData) => {
    // Definir modo
    if (data.mode) {
      setMode(data.mode);
      onModeChange?.(data.mode);
    }

    // Definir modelo (apenas para text-to-image)
    if (data.model_id && data.mode !== 'image-to-image') {
      // Verificar se o modelo existe na lista
      const modelExists = IMAGE_MODELS.some(m => m.id === data.model_id);
      if (modelExists) {
        setSelectedModel(data.model_id);
      }
    }

    // Definir estilo
    if (data.style) {
      const styleExists = STYLE_PRESETS.some(s => s.id === data.style);
      if (styleExists) {
        setSelectedStyle(data.style);
      }
    }

    // Definir tamanho - encontrar o preset correspondente ou usar o mais próximo
    if (data.width && data.height) {
      const sizePresets = data.mode === 'image-to-image' ? SIZE_PRESETS_IMG2IMG : SIZE_PRESETS_TEXT2IMG;
      const matchingSize = sizePresets.find(s => s.width === data.width && s.height === data.height);
      if (matchingSize) {
        setSelectedSize(matchingSize.id);
      } else {
        // Se não encontrar exato, usar 'square' como fallback
        setSelectedSize('square');
      }
    }

    // Definir negative prompt
    if (data.negative_prompt) {
      setNegativePrompt(data.negative_prompt);
      setShowAdvanced(true); // Mostrar avançado se tem negative prompt
    }

    // Definir seed
    if (data.seed) {
      setSeed(data.seed.toString());
      setShowAdvanced(true); // Mostrar avançado se tem seed
    }

    // Definir strength (para img2img)
    if (data.strength && data.mode === 'image-to-image') {
      setStrength(data.strength);
    }

    // Definir quality/steps
    if (data.num_inference_steps) {
      setQuality(data.num_inference_steps);
    }
  }, [onModeChange]);

  // Expor funções via ref
  useImperativeHandle(ref, () => ({
    submit: handleGenerate,
    canSubmit,
    setConfigFromData,
  }), [handleGenerate, canSubmit, setConfigFromData]);

  // Estado para animação
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Pequeno delay para garantir que o elemento está no DOM antes de animar
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      // Aguardar a animação de saída antes de remover do DOM
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!shouldRender) return null;

  return (
    <div
      className={`rounded-xl border mb-3 overflow-hidden flex flex-col max-h-[50vh] transition-all duration-300 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4'
      } ${
        isDark
          ? 'bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 border-white/[0.08]'
          : 'bg-gradient-to-br from-blue-500/5 via-white to-cyan-500/5 border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b ${
        isDark ? 'border-white/[0.05]' : 'border-gray-100'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Gerar Imagem
          </span>
        </div>
        <button
          onClick={onClose}
          className={`p-1 rounded-lg transition-colors ${
            isDark ? 'hover:bg-white/[0.05] text-white/50' : 'hover:bg-gray-100 text-gray-400'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content - scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {/* Mode Toggle */}
        <div className={`flex rounded-lg p-1 ${isDark ? 'bg-white/[0.03]' : 'bg-gray-100'}`}>
          <button
            onClick={() => handleModeChange('text-to-image')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              mode === 'text-to-image'
                ? isDark
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-white text-blue-600 shadow-sm'
                : isDark
                  ? 'text-white/50 hover:text-white/70'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wand2 className="w-4 h-4" />
            Text-to-Image
          </button>
          <button
            onClick={() => handleModeChange('image-to-image')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              mode === 'image-to-image'
                ? isDark
                  ? 'bg-purple-500/20 text-purple-300'
                  : 'bg-white text-purple-600 shadow-sm'
                : isDark
                  ? 'text-white/50 hover:text-white/70'
                  : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ImagePlus className="w-4 h-4" />
            Image-to-Image
          </button>
        </div>

        {/* Model Selection - apenas para text-to-image */}
        {mode === 'text-to-image' ? (
          <div className="space-y-2">
            <label className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Modelo de IA
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {IMAGE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model.id)}
                  className={`py-2 px-2.5 rounded-lg text-left transition-all ${
                    selectedModel === model.id
                      ? isDark
                        ? 'bg-blue-500/20 border-2 border-blue-500/50'
                        : 'bg-blue-50 border-2 border-blue-300'
                      : isDark
                        ? 'bg-white/[0.03] border border-white/[0.08] hover:bg-white/[0.05]'
                        : 'bg-gray-50 border border-gray-100 hover:bg-gray-100'
                  }`}
                  title={model.description}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className={`text-xs font-medium truncate ${
                      selectedModel === model.id
                        ? isDark ? 'text-blue-300' : 'text-blue-700'
                        : isDark ? 'text-white/80' : 'text-gray-700'
                    }`}>
                      {model.name}
                    </span>
                    {/* Badge de categoria */}
                    {model.category === 'fast' && (
                      <span className={`text-[9px] px-1 py-0.5 rounded ${
                        isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                      }`}>⚡</span>
                    )}
                  </div>
                  <span className={`text-[10px] block truncate ${
                    selectedModel === model.id
                      ? isDark ? 'text-blue-400/70' : 'text-blue-500'
                      : isDark ? 'text-white/40' : 'text-gray-400'
                  }`}>
                    {model.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Nota sobre modelo fixo para img2img */
          <div className={`rounded-lg p-3 ${
            isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'
          }`}>
            <div className="flex items-center gap-2">
              <ImagePlus className={`w-4 h-4 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                Usando Qwen Image Edit
              </span>
            </div>
            <p className={`text-[11px] mt-1 ${isDark ? 'text-purple-400/70' : 'text-purple-600/70'}`}>
              Modelo especializado em edição e transformação de imagens com alta qualidade.
            </p>
          </div>
        )}

        {/* Image Upload (img2img only) */}
        {mode === 'image-to-image' && (
          <div className="space-y-2">
            <label className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
              Imagem de Referência
            </label>

            {!referencePreview ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? isDark
                      ? 'border-blue-400 bg-blue-500/10'
                      : 'border-blue-500 bg-blue-50'
                    : isDark
                      ? 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Upload className={`w-8 h-8 mx-auto mb-2 ${
                  isDark ? 'text-white/30' : 'text-gray-400'
                }`} />
                <p className={`text-sm ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                  Arraste uma imagem ou clique para selecionar
                </p>
                <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                  PNG, JPG, WEBP - máx 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="relative">
                <img
                  src={referencePreview}
                  alt="Referência"
                  className="w-full h-40 object-cover rounded-xl"
                />
                <button
                  onClick={handleRemoveImage}
                  className={`absolute top-2 right-2 p-1.5 rounded-lg transition-colors ${
                    isDark
                      ? 'bg-black/50 hover:bg-black/70 text-white'
                      : 'bg-white/80 hover:bg-white text-gray-700'
                  }`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Strength Slider */}
            <div className="space-y-2 mt-3">
              <div className="flex items-center justify-between">
                <label className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                  Intensidade da transformação
                </label>
                <span className={`text-xs font-mono ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  {strength.toFixed(1)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Sutil</span>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={strength}
                  onChange={(e) => setStrength(parseFloat(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Drástico</span>
              </div>
            </div>
          </div>
        )}

        {/* Style Selection - ocultar se o modelo não suporta estilos */}
        {(() => {
          const currentModel = IMAGE_MODELS.find(m => m.id === selectedModel);
          const supportsStyle = mode === 'image-to-image' || !currentModel?.noStyle;

          if (!supportsStyle) return null;

          return (
            <div className="space-y-2">
              <label className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Estilo
              </label>
              <div className="grid grid-cols-3 gap-2">
                {STYLE_PRESETS.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      selectedStyle === style.id
                        ? isDark
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                        : isDark
                          ? 'bg-white/[0.03] text-white/60 border border-white/[0.05] hover:bg-white/[0.05]'
                          : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
                    }`}
                  >
                    {style.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Size Selection - diferentes opções para text2img vs img2img */}
        {(() => {
          const currentModel = IMAGE_MODELS.find(m => m.id === selectedModel);
          const supportsSize = mode === 'image-to-image' || !currentModel?.noSize;

          if (!supportsSize) return null;

          return (
            <div className="space-y-2">
              <label className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Tamanho {mode === 'image-to-image' && <span className="text-purple-400/70">(máx 1024px)</span>}
              </label>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {(mode === 'image-to-image' ? SIZE_PRESETS_IMG2IMG : SIZE_PRESETS_TEXT2IMG).map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size.id)}
                    className={`flex-shrink-0 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      selectedSize === size.id
                        ? isDark
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                        : isDark
                          ? 'bg-white/[0.03] text-white/60 border border-white/[0.05] hover:bg-white/[0.05]'
                          : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
                    }`}
                  >
                    <span>{size.name}</span>
                    <span className={`block text-[10px] ${
                      selectedSize === size.id
                        ? isDark ? 'text-blue-400' : 'text-blue-500'
                        : isDark ? 'text-white/30' : 'text-gray-400'
                    }`}>
                      {size.width}x{size.height}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Quality Selection - ocultar se o modelo não suporta */}
        {(() => {
          const currentModel = IMAGE_MODELS.find(m => m.id === selectedModel);
          const supportsQuality = mode === 'image-to-image' || !currentModel?.noQuality;

          if (!supportsQuality) return null;

          return (
            <div className="space-y-2">
              <label className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-gray-500'}`}>
                Qualidade
              </label>
              <div className="flex gap-2">
                {QUALITY_PRESETS.map((preset) => (
                  <button
                    key={preset.steps}
                    onClick={() => setQuality(preset.steps)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      quality === preset.steps
                        ? isDark
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                        : isDark
                          ? 'bg-white/[0.03] text-white/60 border border-white/[0.05] hover:bg-white/[0.05]'
                          : 'bg-gray-50 text-gray-600 border border-gray-100 hover:bg-gray-100'
                    }`}
                  >
                    <span>{preset.name}</span>
                    <span className={`block text-[10px] ${
                      quality === preset.steps
                        ? isDark ? 'text-blue-400' : 'text-blue-500'
                        : isDark ? 'text-white/30' : 'text-gray-400'
                    }`}>
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Advanced Settings - ocultar completamente se modelo não suporta nada */}
        {(() => {
          const currentModel = IMAGE_MODELS.find(m => m.id === selectedModel);
          const supportsNegativePrompt = mode === 'image-to-image' || !currentModel?.noNegativePrompt;
          const supportsSeed = mode === 'image-to-image' || !currentModel?.noSeed;

          // Se não suporta nada, não mostrar a seção avançada
          const hasAnyAdvancedOption = supportsNegativePrompt || supportsSeed;

          // Se é um modelo muito limitado (como Z-Image Turbo), mostrar aviso no lugar
          const isVeryLimitedModel = currentModel?.noNegativePrompt && currentModel?.noSeed && currentModel?.noStyle && currentModel?.noSize && currentModel?.noQuality;

          if (isVeryLimitedModel && mode === 'text-to-image') {
            return (
              <div className={`rounded-lg p-3 ${
                isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
              }`}>
                <p className={`text-xs ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                  <strong>{currentModel?.name}</strong> é um modelo ultra-rápido que aceita apenas o prompt.
                  {currentModel?.maxPromptLength && (
                    <> Limite de <strong>{currentModel.maxPromptLength}</strong> caracteres.</>
                  )}
                </p>
              </div>
            );
          }

          if (!hasAnyAdvancedOption) return null;

          return (
            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                  isDark ? 'text-white/50 hover:text-white/70' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                Configurações avançadas
                {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showAdvanced && (
                <div className="mt-3 space-y-3">
                  {/* Negative Prompt - ocultar se o modelo não suporta */}
                  {supportsNegativePrompt && (
                    <div className="space-y-1">
                      <label className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        Prompt negativo
                      </label>
                      <p className={`text-[10px] mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        Descreva elementos que você NÃO quer na imagem (ex: blur, texto, mãos deformadas)
                      </p>
                      <input
                        type="text"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="blur, baixa qualidade, texto, marca d'água..."
                        className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                          isDark
                            ? 'bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/30 focus:border-blue-500/50'
                            : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                        } focus:outline-none`}
                      />
                    </div>
                  )}

                  {/* Seed - ocultar se o modelo não suporta */}
                  {supportsSeed && (
                    <div className="space-y-1">
                      <label className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                        Seed
                      </label>
                      <p className={`text-[10px] mb-1 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        Número que controla a aleatoriedade. Use o mesmo seed para reproduzir a mesma imagem
                      </p>
                      <input
                        type="number"
                        value={seed}
                        onChange={(e) => setSeed(e.target.value)}
                        placeholder="Deixe vazio para aleatório"
                        className={`w-full px-3 py-2 rounded-lg text-sm transition-colors ${
                          isDark
                            ? 'bg-white/[0.03] border border-white/[0.08] text-white placeholder-white/30 focus:border-blue-500/50'
                            : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-blue-500'
                        } focus:outline-none`}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
});

ImageGenerationPanel.displayName = 'ImageGenerationPanel';
