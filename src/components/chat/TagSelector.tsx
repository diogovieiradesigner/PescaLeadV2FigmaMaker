import { useState, useRef, useEffect } from 'react';
import { Tag, X, Plus } from 'lucide-react';
import { Theme } from '../../hooks/useTheme';

interface TagSelectorProps {
  theme: Theme;
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

// Tags disponíveis no sistema (mesmas do pipeline)
const AVAILABLE_TAGS = [
  'Empresa',
  'PME',
  'SaaS',
  'Consultoria',
  'Marketing',
  'Produto',
  'IA',
  'Infraestrutura',
  'Cloud',
  'Internacional',
  'E-commerce',
  'Automação',
  'Mobile',
  'Web',
];

export function TagSelector({ theme, selectedTags, onTagsChange }: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setNewTagName('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onTagsChange(selectedTags.filter((t) => t !== tag));
    } else {
      onTagsChange([...selectedTags, tag]);
    }
  };

  const handleAddNewTag = () => {
    const trimmedTag = newTagName.trim();
    if (trimmedTag && !AVAILABLE_TAGS.includes(trimmedTag) && !selectedTags.includes(trimmedTag)) {
      onTagsChange([...selectedTags, trimmedTag]);
      setNewTagName('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    onTagsChange(selectedTags.filter((t) => t !== tag));
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Selected Tags Display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
              isDark
                ? 'bg-white/[0.05] text-white border border-white/[0.08]'
                : 'bg-light-elevated text-text-primary-light border border-border-light'
            }`}
          >
            <Tag className="w-3 h-3" />
            {tag}
            <button
              onClick={() => handleRemoveTag(tag)}
              className={`ml-1 hover:bg-white/10 rounded p-0.5 transition-colors`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        
        {/* Add Tag Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs border transition-colors ${
            isDark
              ? 'border-white/[0.08] text-white/70 hover:bg-white/[0.05]'
              : 'border-border-light text-text-secondary-light hover:bg-light-elevated'
          }`}
        >
          <Plus className="w-3 h-3" />
          Adicionar Tag
        </button>
      </div>

      {/* Tag Picker Dropdown */}
      {isOpen && (
        <div
          className={`absolute left-0 top-full mt-1 w-64 rounded-lg border shadow-lg z-50 ${
            isDark
              ? 'bg-[#1a1a1a] border-white/[0.08]'
              : 'bg-white border-border-light'
          }`}
        >
          <div className="p-3">
            <p className={`text-xs mb-2 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
              Tags disponíveis
            </p>
            <div className="space-y-1 max-h-48 overflow-y-auto mb-3">
              {AVAILABLE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleToggleTag(tag)}
                  className={`w-full px-3 py-2 rounded text-sm text-left transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-[#0169D9] text-white'
                      : isDark
                      ? 'hover:bg-white/[0.05] text-white'
                      : 'hover:bg-light-elevated text-text-primary-light'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Add Custom Tag */}
            <div className="pt-3 border-t border-white/[0.08]">
              <p className={`text-xs mb-2 ${isDark ? 'text-white/50' : 'text-text-secondary-light'}`}>
                Criar nova tag
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nome da tag..."
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddNewTag()}
                  className={`flex-1 px-2 py-1 rounded text-sm border transition-colors focus:outline-none focus:border-[#0169D9] ${
                    isDark
                      ? 'bg-true-black border-white/[0.08] text-white placeholder-white/40'
                      : 'bg-white border-border-light text-text-primary-light placeholder-text-secondary-light'
                  }`}
                />
                <button
                  onClick={handleAddNewTag}
                  className="px-3 py-1 rounded text-sm bg-[#0169D9] text-white hover:bg-[#0159C9] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}