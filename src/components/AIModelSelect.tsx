import * as React from "react"
import { Search, X, Box, DollarSign, Sparkles } from "lucide-react"
import { cn } from "./ui/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./ui/popover"
import { Badge } from "./ui/badge"
import { useOpenRouterModels } from "../hooks/useOpenRouterModels"

interface AIModelSelectProps {
  value: string;
  onChange: (modelId: string) => void;
  showOnlyFree?: boolean;
  className?: string;
  isDark?: boolean;
}

export function AIModelSelect({ value, onChange, showOnlyFree = false, className, isDark = true }: AIModelSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")
  const { models, loading, error } = useOpenRouterModels()

  const filteredModels = React.useMemo(() => {
    return showOnlyFree ? models.filter(m => m.isFree) : models;
  }, [models, showOnlyFree]);

  // Group models by provider
  const groupedModels = React.useMemo(() => {
    return filteredModels.reduce((acc, model) => {
      const provider = model.id.split('/')[0];
      if (!acc[provider]) acc[provider] = [];
      acc[provider].push(model);
      return acc;
    }, {} as Record<string, typeof models>);
  }, [filteredModels]);

  const selectedModel = React.useMemo(() => 
    models.find((model) => model.id === value),
    [models, value]
  );

  // Reset scroll to top when search value changes
  React.useEffect(() => {
    if (searchValue) {
      // Find the CommandList element and scroll it to top
      const commandList = document.querySelector('[data-slot="command-list"]');
      if (commandList) {
        commandList.scrollTop = 0;
      }
    }
  }, [searchValue]);

  // Reset search when popover closes
  React.useEffect(() => {
    if (!open) {
      setSearchValue("");
    }
  }, [open]);

  const handleRemoveModel = () => {
    onChange("");
  };

  if (error && models.length === 0) {
    return (
      <div className={`text-sm p-3 rounded-lg border ${
        isDark 
          ? 'text-red-400 bg-red-900/20 border-red-800/30'
          : 'text-red-600 bg-red-50 border-red-200'
      }`}>
        <div className="font-medium mb-1">⚠️ Erro ao carregar modelos</div>
        <div className="text-xs opacity-80">{error}</div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Error Warning - se houve erro mas temos modelos fallback */}
      {error && models.length > 0 && (
        <div className={`text-xs p-2 rounded border ${
          isDark 
            ? 'text-yellow-400 bg-yellow-900/10 border-yellow-800/30'
            : 'text-yellow-700 bg-yellow-50 border-yellow-200'
        }`}>
          ⚠️ Usando modelos padrão (erro ao conectar: {error})
        </div>
      )}
      
      {/* Search Field */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            role="combobox"
            aria-expanded={open}
            disabled={loading}
            className={cn(
              "w-full px-3 py-2 rounded-lg border outline-none transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-left",
              isDark
                ? "bg-white/[0.05] border-white/[0.1] text-white hover:border-white/[0.15] focus:border-[#0169D9]"
                : "bg-white border-gray-300 text-gray-900 hover:border-gray-400 focus:border-[#0169D9]"
            )}
          >
            <Search className={cn("w-4 h-4 shrink-0", isDark ? "text-white/50" : "text-gray-400")} />
            {loading ? (
              <span className={cn("flex items-center gap-2", isDark ? "text-white/60" : "text-gray-600")}>
                <Box className="w-3 h-3 animate-pulse" />
                Carregando modelos...
              </span>
            ) : (
              <span className={isDark ? "text-white/40" : "text-gray-400"}>Buscar modelo de IA...</span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className={cn(
            "w-[480px] p-0",
            isDark ? "bg-[#181818] border-white/[0.1]" : "bg-white border-gray-200"
          )}
          align="start"
        >
          <Command className={isDark ? "bg-[#181818]" : "bg-white"} shouldFilter={false}>
            <CommandInput 
              placeholder="Buscar modelo..." 
              value={searchValue}
              onValueChange={setSearchValue}
              className={cn(
                "border-b",
                isDark 
                  ? "border-white/[0.08] text-white placeholder:text-white/40 [&>svg]:text-white/50"
                  : "border-gray-200 text-gray-900 placeholder:text-gray-400 [&>svg]:text-gray-400"
              )}
            />
            <CommandList className="max-h-[380px] overflow-y-auto scrollbar-thin">
              <CommandEmpty className={cn("py-6 text-center text-sm", isDark ? "text-white/60" : "text-gray-500")}>
                Nenhum modelo encontrado.
              </CommandEmpty>
              {Object.entries(groupedModels)
                .filter(([provider, providerModels]) => {
                  if (!searchValue) return true;
                  const search = searchValue.toLowerCase();
                  return providerModels.some(model => 
                    model.name.toLowerCase().includes(search) ||
                    model.id.toLowerCase().includes(search) ||
                    provider.toLowerCase().includes(search)
                  );
                })
                .map(([provider, providerModels]) => {
                  const filteredProviderModels = providerModels.filter(model => {
                    if (!searchValue) return true;
                    const search = searchValue.toLowerCase();
                    return model.name.toLowerCase().includes(search) ||
                           model.id.toLowerCase().includes(search) ||
                           provider.toLowerCase().includes(search);
                  });

                  if (filteredProviderModels.length === 0) return null;

                  return (
                    <CommandGroup 
                      key={provider}
                      className="px-2 py-2"
                    >
                      <div className={cn("px-2 py-1.5 text-xs font-medium", isDark ? "text-white/70" : "text-gray-600")}>
                        {formatProviderName(provider)}
                      </div>
                      {filteredProviderModels.map((model) => (
                        <CommandItem
                          key={model.id}
                          value={model.id}
                          onSelect={() => {
                            onChange(model.id)
                            setOpen(false)
                          }}
                          className={cn(
                            "flex flex-col items-start gap-1 py-3 px-2 cursor-pointer rounded-md mb-1 group",
                            isDark
                              ? "text-white hover:bg-white/[0.05] aria-selected:bg-white/[0.08]"
                              : "text-gray-900 hover:bg-gray-100 aria-selected:bg-gray-100"
                          )}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{model.name}</span>
                              {model.isFree && (
                                <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-green-500/30 text-green-400 bg-green-500/10">
                                  FREE
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className={cn(
                            "flex items-center gap-3 text-xs w-full transition-colors",
                            isDark
                              ? "text-white/50 group-hover:text-white/70 group-aria-selected:text-white/70"
                              : "text-gray-500 group-hover:text-gray-700 group-aria-selected:text-gray-700"
                          )}>
                             <span className="truncate max-w-[220px]">{model.id}</span>
                             
                             {model.context_length && (
                               <span className="flex items-center gap-1 ml-auto flex-shrink-0" title="Context Window">
                                 <Box className="w-3 h-3" />
                                 {Math.round(model.context_length / 1000)}k
                               </span>
                             )}
                             
                             {model.pricing && !model.isFree && (
                               <span className="flex items-center gap-0.5 flex-shrink-0" title="Price per 1M tokens (Input)">
                                 <DollarSign className="w-3 h-3" />
                                 {formatPrice(model.pricing.prompt)}
                               </span>
                             )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  );
                })}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected Model Card */}
      {selectedModel && (
        <div className={cn(
          "p-3.5 rounded-lg border",
          isDark 
            ? "bg-white/[0.02] border-white/[0.08]"
            : "bg-gray-50 border-gray-200"
        )}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="mt-0.5 p-2 rounded-md bg-[#0169D9]/10 border border-[#0169D9]/20">
                <Sparkles className="w-4 h-4 text-[#0169D9]" />
              </div>
              
              <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("font-medium text-sm", isDark ? "text-white" : "text-gray-900")}>
                    {selectedModel.name}
                  </span>
                  {selectedModel.isFree && (
                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-green-500/30 text-green-400 bg-green-500/10">
                      FREE
                    </Badge>
                  )}
                </div>
                
                <div className={cn("text-xs space-y-1", isDark ? "text-white/50" : "text-gray-600")}>
                  <div className="truncate">{selectedModel.id}</div>
                  
                  <div className="flex items-center gap-3 flex-wrap">
                    {selectedModel.context_length && (
                      <span className="flex items-center gap-1" title="Context Window">
                        <Box className="w-3 h-3" />
                        {Math.round(selectedModel.context_length / 1000)}k contexto
                      </span>
                    )}
                    
                    {selectedModel.pricing && !selectedModel.isFree && (
                      <span className="flex items-center gap-1" title="Preço por 1M tokens">
                        <DollarSign className="w-3 h-3" />
                        ${formatPrice(selectedModel.pricing.prompt)}/1M
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={handleRemoveModel}
              className={cn(
                "h-7 w-7 shrink-0 rounded-md flex items-center justify-center hover:bg-red-500/10 hover:text-red-400 transition-colors",
                isDark ? "text-white/40" : "text-gray-400"
              )}
              title="Remover modelo"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function formatProviderName(provider: string): string {
  const names: Record<string, string> = {
    'anthropic': 'Anthropic',
    'openai': 'OpenAI',
    'meta-llama': 'Meta Llama',
    'google': 'Google',
    'mistralai': 'Mistral AI',
    'deepseek': 'DeepSeek',
    'perplexity': 'Perplexity',
    'cohere': 'Cohere',
    'qwen': 'Qwen',
    'microsoft': 'Microsoft',
    'openrouter': 'OpenRouter'
  };
  return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
}

function formatPrice(price: string): string {
  const num = parseFloat(price) * 1000000;
  if (num === 0) return '0.00';
  if (num < 0.01) return '<0.01';
  return num.toFixed(2);
}
