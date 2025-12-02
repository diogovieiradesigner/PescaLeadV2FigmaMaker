#!/usr/bin/env python3
"""
Script para aplicar as modificações necessárias para fazer o chat ficar em tela cheia
no componente LeadFullViewModal.tsx
"""

import re

def apply_fixes():
    file_path = 'components/LeadFullViewModal.tsx'
    
    print("📖 Lendo arquivo...")
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # FIX 1: Linha 648 - Tornar a borda condicional
    print("✏️  Aplicando Fix 1: Borda condicional...")
    content = content.replace(
        '<div className="flex-1 flex flex-col min-w-0 border-r border-border-light dark:border-white/[0.08]">',
        '<div className={`flex-1 flex flex-col min-w-0 ${activeTab === \'chat\' ? \'\' : \'border-r border-border-light dark:border-white/[0.08]\'}`}>'
    )
    
    # FIX 2: Linha 649 - Adicionar condição para esconder tabs
    print("✏️  Aplicando Fix 2: Esconder barra de abas...")
    content = content.replace(
        '               {/* Tabs Header */}\n               <div className={`flex items-center px-6 border-b ${',
        '               {/* Tabs Header - Esconder quando em modo chat */}\n               {activeTab !== \'chat\' && (\n               <div className={`flex items-center px-6 border-b ${'
    )
    
    # FIX 3: Linha 686 - Fechar condição das tabs
    print("✏️  Aplicando Fix 3: Fechar condição das tabs...")
    content = content.replace(
        '               </div>\n\n               {/* Tab Content */',
        '               </div>\n               )}\n\n               {/* Tab Content */'
    )
    
    # FIX 4: Linha 1192 - Adicionar condição para esconder sidebar + scrollbar-thin
    print("✏️  Aplicando Fix 4: Esconder sidebar...")
    content = content.replace(
        '            {/* Right Column - Sidebar */}\n            <div className={`w-80 flex-shrink-0 border-l overflow-y-auto ${',
        '            {/* Right Column - Sidebar - Esconder quando em modo chat */}\n            {activeTab !== \'chat\' && (\n            <div className={`w-80 flex-shrink-0 border-l overflow-y-auto scrollbar-thin ${'
    )
    
    # FIX 5: Linha ~1305 - Fechar condição do sidebar
    print("✏️  Aplicando Fix 5: Fechar condição do sidebar...")
    # Procurar pelo fechamento do sidebar (última div antes do Main Body fechar)
    content = content.replace(
        '               </div>\n            </div>\n\n         </div>\n       </div>\n     </div>',
        '               </div>\n            </div>\n            )}\n\n         </div>\n       </div>\n     </div>'
    )
    
    if content == original_content:
        print("❌ Nenhuma modificação foi aplicada. Verifique se o arquivo já foi modificado ou se o formato mudou.")
        return False
    
    # Salvar arquivo modificado
    print("💾 Salvando arquivo modificado...")
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Modificações aplicadas com sucesso!")
    print("\n📋 Resumo:")
    print("   - Borda removida quando chat ativo")
    print("   - Barra de abas escondida quando chat ativo")
    print("   - Sidebar escondido quando chat ativo")
    print("   - Scrollbar customizado adicionado ao sidebar")
    return True

if __name__ == '__main__':
    try:
        apply_fixes()
    except FileNotFoundError:
        print("❌ Erro: Arquivo não encontrado. Certifique-se de executar no diretório raiz do projeto.")
    except Exception as e:
        print(f"❌ Erro inesperado: {e}")
