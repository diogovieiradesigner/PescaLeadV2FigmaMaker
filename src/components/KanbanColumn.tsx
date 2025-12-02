import { Plus, Trash2 } from 'lucide-react';
import { KanbanCard } from './KanbanCard';
import { CRMLead } from '../types/crm';
import { useDrop, useDrag } from 'react-dnd';
import { Theme } from '../hooks/useTheme';
import { useRef, useEffect, useCallback, memo, useState } from 'react';
import { useThrottle } from '../hooks/useDebouncedDrag';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

interface KanbanColumnProps {
  id: string;
  title: string;
  leads: CRMLead[];
  total?: number;
  hasMore?: boolean;
  loading?: boolean;
  onDrop: (leadId: string, columnId: string) => void;
  onDropAtPosition: (leadId: string, columnId: string, index: number) => void;
  onAddCard: (columnId: string) => void;
  onLeadClick: (lead: CRMLead) => void;
  onLoadMore?: (columnId: string) => void;
  onDeleteLead?: (leadId: string) => void;
  onDeleteAllLeads?: (columnId: string) => void;
  theme: Theme;
}

function KanbanColumnComponent({ 
  id, 
  title, 
  leads, 
  total,
  hasMore,
  loading,
  onDrop, 
  onDropAtPosition, 
  onAddCard, 
  onLeadClick, 
  onLoadMore,
  onDeleteLead,
  onDeleteAllLeads,
  theme 
}: KanbanColumnProps) {
  const isDark = theme === 'dark';
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  
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

  // Intersection Observer for infinite scroll
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!onLoadMore || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore(id);
        }
      },
      { threshold: 0.1, root: scrollContainerRef.current }
    );

    if (loadMoreTriggerRef.current) {
      observer.observe(loadMoreTriggerRef.current);
    }

    return () => observer.disconnect();
  }, [id, onLoadMore, hasMore, loading]);

  const isActive = isOver && canDrop;
  const displayTotal = total !== undefined ? total : leads.length;

  const handleDeleteAll = () => {
    if (onDeleteAllLeads) {
      onDeleteAllLeads(id);
    }
    setShowDeleteAllDialog(false);
  };

  return (
    <>
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
              {displayTotal}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Delete All Button */}
            {onDeleteAllLeads && displayTotal > 0 && (
              <button
                onClick={() => setShowDeleteAllDialog(true)}
                className={`p-1 rounded-lg transition-all ${
                  isDark
                    ? 'text-red-400/60 hover:text-red-400 hover:bg-red-500/10'
                    : 'text-red-500/60 hover:text-red-600 hover:bg-red-50'
                }`}
                title={`Deletar todos os ${displayTotal} leads desta coluna`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            
            {/* Add Card Button */}
            <button
              onClick={() => onAddCard(id)}
              className={`p-1 rounded-lg transition-all ${
                isDark
                  ? 'text-white/40 hover:text-white hover:bg-white/[0.05]'
                  : 'text-text-secondary-light hover:text-text-primary-light hover:bg-light-elevated-hover'
              }`}
              title="Adicionar novo lead"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Column Content */}
        <div
          ref={(node) => {
            drop(node);
            scrollContainerRef.current = node;
          }}
          className={`flex-1 rounded-xl p-2 border transition-all duration-200 overflow-y-auto scrollbar-thin ${
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
                onDeleteLead={onDeleteLead}
                theme={theme} 
              />
            ))}
            
            {/* Load More Trigger */}
            {hasMore && (
              <div ref={loadMoreTriggerRef} className="py-2">
                {loading ? (
                  <div className={`text-center text-xs ${isDark ? 'text-white/40' : 'text-text-secondary-light'}`}>
                    Carregando...
                  </div>
                ) : (
                  <div className={`text-center text-xs ${isDark ? 'text-white/20' : 'text-text-secondary-light'}`}>
                    Role para carregar mais
                  </div>
                )}
              </div>
            )}
            
            {leads.length === 0 && !loading && (
              <div className={`text-center py-8 text-xs ${
                isDark ? 'text-white/20' : 'text-text-secondary-light'
              }`}>
                Solte leads aqui
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent className={isDark ? 'bg-zinc-950 border-white/10' : 'bg-white'}>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-500" />
              Deletar Todos os Leads
            </AlertDialogTitle>
            <AlertDialogDescription className={isDark ? 'text-zinc-400' : 'text-gray-600'}>
              Tem certeza que deseja deletar <strong className="text-red-500">{displayTotal} lead{displayTotal > 1 ? 's' : ''}</strong> da coluna <strong>"{title}"</strong>?
              <br />
              <span className="text-red-500 font-medium">Esta ação não pode ser desfeita.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className={isDark ? 'bg-zinc-900 hover:bg-zinc-800 border-white/10' : ''}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAll}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Sim, Deletar {displayTotal} Lead{displayTotal > 1 ? 's' : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface DraggableCardWithDropZoneProps {
  lead: CRMLead;
  index: number;
  columnId: string;
  onDropAtPosition: (leadId: string, columnId: string, index: number) => void;
  onLeadClick: (lead: CRMLead) => void;
  onDeleteLead?: (leadId: string) => void;
  theme: Theme;
}

const DraggableCardWithDropZone = memo(function DraggableCardWithDropZone({ lead, index, columnId, onDropAtPosition, onLeadClick, onDeleteLead, theme }: DraggableCardWithDropZoneProps) {
  const ref = useRef<HTMLDivElement>(null);

  // 🔥 OTIMIZAÇÃO: Throttle do onDropAtPosition para reduzir chamadas durante drag
  const throttledDropAtPosition = useThrottle(onDropAtPosition, 16); // ~60fps

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

      // 🔥 OTIMIZAÇÃO: Usar versão throttled para reduzir chamadas
      // Time to actually perform the action
      throttledDropAtPosition(item.id, hoverColumnId, hoverIndex);

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
      <KanbanCard lead={lead} isDragging={isDragging} onClick={() => onLeadClick(lead)} onDelete={onDeleteLead} theme={theme} />
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if lead ID, index, or theme changes
  return (
    prevProps.lead.id === nextProps.lead.id &&
    prevProps.index === nextProps.index &&
    prevProps.columnId === nextProps.columnId &&
    prevProps.theme === nextProps.theme
  );
});

// Memoize column to prevent re-render when other columns change
export const KanbanColumn = memo(KanbanColumnComponent, (prevProps, nextProps) => {
  // Re-render only if this column's data changes
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.leads.length === nextProps.leads.length &&
    prevProps.total === nextProps.total &&
    prevProps.hasMore === nextProps.hasMore &&
    prevProps.loading === nextProps.loading &&
    prevProps.theme === nextProps.theme &&
    // Deep compare lead IDs to detect if leads changed
    prevProps.leads.every((lead, idx) => lead.id === nextProps.leads[idx]?.id)
  );
});