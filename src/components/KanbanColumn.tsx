import { Plus } from 'lucide-react';
import { KanbanCard } from './KanbanCard';
import { CRMLead } from '../types/crm';
import { useDrop, useDrag } from 'react-dnd';
import { Theme } from '../hooks/useTheme';
import { useRef } from 'react';

interface KanbanColumnProps {
  id: string;
  title: string;
  leads: CRMLead[];
  onDrop: (leadId: string, columnId: string) => void;
  onDropAtPosition: (leadId: string, columnId: string, index: number) => void;
  onAddCard: (columnId: string) => void;
  onLeadClick: (lead: CRMLead) => void;
  theme: Theme;
}

export function KanbanColumn({ id, title, leads, onDrop, onDropAtPosition, onAddCard, onLeadClick, theme }: KanbanColumnProps) {
  const isDark = theme === 'dark';
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'LEAD',
    drop: (item: { id: string }) => {
      // This is a fallback if dropped on empty space
      onDrop(item.id, id);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
      canDrop: monitor.canDrop(),
    }),
  });

  const isActive = isOver && canDrop;

  return (
    <div className="flex flex-col h-full min-w-[280px] w-[280px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className={`text-sm ${isDark ? 'text-white' : 'text-text-primary-light'}`}>
            {title}
          </h3>
          <span className={`px-1.5 py-0.5 rounded-full text-xs ${
            isDark 
              ? 'bg-white/[0.05] text-white/50' 
              : 'bg-light-elevated text-text-secondary-light'
          }`}>
            {leads.length}
          </span>
        </div>
        <button
          onClick={() => onAddCard(id)}
          className={`p-1 rounded-lg transition-all ${
            isDark
              ? 'text-white/40 hover:text-white hover:bg-white/[0.05]'
              : 'text-text-secondary-light hover:text-text-primary-light hover:bg-light-elevated-hover'
          }`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Column Content */}
      <div
        ref={drop}
        className={`flex-1 rounded-xl p-2 border transition-all duration-200 overflow-y-auto ${
          isActive
            ? 'border-[#0169D9] bg-[#0169D9]/5'
            : isDark
            ? 'bg-elevated/50 border-white/[0.05]'
            : 'bg-light-elevated border-border-light-elevated'
        }`}
      >
        <div className="space-y-2">
          {leads.map((lead, index) => (
            <DraggableCardWithDropZone 
              key={lead.id} 
              lead={lead} 
              index={index}
              columnId={id}
              onDropAtPosition={onDropAtPosition}
              onLeadClick={onLeadClick}
              theme={theme} 
            />
          ))}
          
          {leads.length === 0 && (
            <div className={`text-center py-8 text-xs ${
              isDark ? 'text-white/20' : 'text-text-secondary-light'
            }`}>
              Solte leads aqui
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface DraggableCardWithDropZoneProps {
  lead: CRMLead;
  index: number;
  columnId: string;
  onDropAtPosition: (leadId: string, columnId: string, index: number) => void;
  onLeadClick: (lead: CRMLead) => void;
  theme: Theme;
}

function DraggableCardWithDropZone({ lead, index, columnId, onDropAtPosition, onLeadClick, theme }: DraggableCardWithDropZoneProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'LEAD',
    item: { id: lead.id, index, columnId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'LEAD',
    hover: (item: { id: string; index: number; columnId: string }, monitor) => {
      if (!ref.current) {
        return;
      }

      const dragIndex = item.index;
      const hoverIndex = index;
      const dragColumnId = item.columnId;
      const hoverColumnId = columnId;

      // Don't replace items with themselves
      if (dragIndex === hoverIndex && dragColumnId === hoverColumnId) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      onDropAtPosition(item.id, hoverColumnId, hoverIndex);

      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
      item.columnId = hoverColumnId;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Connect both drag and drop to the same ref
  drag(drop(ref));

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="relative"
    >
      <KanbanCard lead={lead} isDragging={isDragging} onClick={() => onLeadClick(lead)} theme={theme} />
    </div>
  );
}