import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import type { DashboardSectionId } from '../../../hooks/useDashboardLayout';

interface DraggableSectionProps {
  id: DashboardSectionId;
  label: string;
  collapsed: boolean;
  hidden?: boolean;
  editMode?: boolean;
  onToggleCollapse: (id: DashboardSectionId) => void;
  onToggleHidden?: (id: DashboardSectionId) => void;
  children: React.ReactNode;
  showHeader?: boolean;
}

export const DraggableSection: React.FC<DraggableSectionProps> = ({
  id,
  label,
  collapsed,
  hidden = false,
  editMode = false,
  onToggleCollapse,
  onToggleHidden,
  children,
  showHeader = true,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : hidden ? 0.45 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  // In normal mode, hidden sections are not rendered at all
  if (hidden && !editMode) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/section relative ${editMode ? 'rounded-xl ring-1 ring-dashed ring-[var(--primary-dim)] dark:ring-[var(--primary-dim)]/50 p-2 -mx-2' : ''} ${hidden ? 'pointer-events-auto' : ''}`}
    >
      {showHeader && (
        <div className="flex items-center gap-2 mb-2">
          {/* Drag handle — always visible in edit mode */}
          <button
            {...attributes}
            {...listeners}
            className={`p-1 rounded-md text-[var(--text-muted)] dark:text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]/50 cursor-grab active:cursor-grabbing transition-colors ${editMode ? 'opacity-100' : 'opacity-0 group-hover/section:opacity-100 focus:opacity-100'}`}
            aria-label={`Déplacer la section ${label}`}
            title="Glisser pour réorganiser"
          >
            <GripVertical className="w-4 h-4" />
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => onToggleCollapse(id)}
            className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${hidden ? 'text-[var(--text-muted)] dark:text-[var(--text-secondary)] line-through' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)]'}`}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {label}
          </button>

          {/* Subtle separator line */}
          <div className="flex-1 h-px bg-[var(--bg-elevated)]/50" />

          {/* Hide/show toggle — only in edit mode */}
          {editMode && onToggleHidden && (
            <button
              onClick={() => onToggleHidden(id)}
              className={`p-1 rounded-md transition-colors ${hidden ? 'text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] dark:hover:text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]/50'}`}
              title={hidden ? 'Afficher cette section' : 'Masquer cette section'}
            >
              {hidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}

      {/* Content with smooth collapse animation */}
      {!hidden && (
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            collapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
          }`}
        >
          {children}
        </div>
      )}

      {/* Hidden placeholder in edit mode */}
      {hidden && editMode && (
        <div className="flex items-center justify-center py-4 text-xs text-[var(--text-muted)] dark:text-[var(--text-secondary)] italic">
          Section masquée — cliquez sur l'œil pour réafficher
        </div>
      )}
    </div>
  );
};
