import { KanbanColumn } from './KanbanColumn';
import { KanbanColumn as KanbanColumnType } from '../types/crm';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Theme } from '../hooks/useTheme';
import { CRMLead } from '../types/crm';

interface ColumnState {
  leads: CRMLead[];
  total?: number;
  hasMore?: boolean;
  loading?: boolean;
}

interface KanbanBoardProps {
  columns: KanbanColumnType[];
  columnStates?: { [columnId: string]: ColumnState };
  onLeadMove: (leadId: string, targetColumnId: string) => void;
  onLeadMoveWithPosition: (leadId: string, targetColumnId: string, targetIndex: number) => void;
  onAddCard: (columnId: string) => void;
  onLeadClick: (lead: CRMLead) => void;
  onLoadMore?: (columnId: string) => void;
  onDeleteLead?: (leadId: string) => void;
  onDeleteAllLeads?: (columnId: string) => void;
  theme: Theme;
}

export function KanbanBoard({ 
  columns, 
  columnStates,
  onLeadMove, 
  onLeadMoveWithPosition, 
  onAddCard, 
  onLeadClick, 
  onLoadMore,
  onDeleteLead,
  onDeleteAllLeads,
  theme 
}: KanbanBoardProps) {
  const isDark = theme === 'dark';
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className={`flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin p-3 md:p-4 transition-colors ${
        isDark ? 'bg-true-black' : 'bg-light-bg'
      }`}>
        <div className="flex gap-3 md:gap-4 h-[calc(100vh-200px)] md:h-[calc(100vh-200px)] pb-4 min-w-min">
          {columns.map((column) => {
            const columnState = columnStates?.[column.id];
            
            return (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.title}
                leads={column.leads}
                total={columnState?.total}
                hasMore={columnState?.hasMore}
                loading={columnState?.loading}
                onDrop={onLeadMove}
                onDropAtPosition={onLeadMoveWithPosition}
                onAddCard={onAddCard}
                onLeadClick={onLeadClick}
                onLoadMore={onLoadMore}
                onDeleteLead={onDeleteLead}
                onDeleteAllLeads={onDeleteAllLeads}
                theme={theme}
              />
            );
          })}
        </div>
      </div>
    </DndProvider>
  );
}