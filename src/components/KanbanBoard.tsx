import { KanbanColumn } from './KanbanColumn';
import { KanbanColumn as KanbanColumnType } from '../types/crm';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Theme } from '../hooks/useTheme';
import { CRMLead } from '../types/crm';

interface KanbanBoardProps {
  columns: KanbanColumnType[];
  onLeadMove: (leadId: string, targetColumnId: string) => void;
  onLeadMoveWithPosition: (leadId: string, targetColumnId: string, targetIndex: number) => void;
  onAddCard: (columnId: string) => void;
  onLeadClick: (lead: CRMLead) => void;
  theme: Theme;
}

export function KanbanBoard({ columns, onLeadMove, onLeadMoveWithPosition, onAddCard, onLeadClick, theme }: KanbanBoardProps) {
  const isDark = theme === 'dark';
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`flex-1 overflow-x-auto overflow-y-hidden p-4 transition-colors ${
        isDark ? 'bg-true-black' : 'bg-light-bg'
      }`}>
        <div className="flex gap-4 h-[calc(100vh-200px)] pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              leads={column.leads}
              onDrop={onLeadMove}
              onDropAtPosition={onLeadMoveWithPosition}
              onAddCard={onAddCard}
              onLeadClick={onLeadClick}
              theme={theme}
            />
          ))}
        </div>
      </div>
    </DndProvider>
  );
}