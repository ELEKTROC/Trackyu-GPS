import React from 'react';

// ─── MobileCardList ──────────────────────────────────────────────────────────
// Standardized container for mobile list views (divide-y + scroll + optional border)

interface MobileCardListProps {
  children: React.ReactNode;
  className?: string;
  /** Include bg + rounded-2xl + border for standalone containers (default: true).
   *  Use false when the list is already inside a <Card> or bordered container. */
  bordered?: boolean;
}

export function MobileCardList({ children, className = '', bordered = true }: MobileCardListProps) {
  return (
    <div
      className={[
        'flex-1 overflow-y-auto divide-y divide-[var(--border)]',
        bordered ? 'bg-[var(--bg-surface)] rounded-2xl border border-[var(--border)]' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

// ─── MobileCard ──────────────────────────────────────────────────────────────
// Standardized row wrapper: padding + optional border-l-4 + hover/dark states

interface MobileCardProps {
  /** Tailwind border color, e.g. "border-l-green-500". Omit for no left stripe. */
  borderColor?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function MobileCard({ borderColor, onClick, children, className = '' }: MobileCardProps) {
  return (
    <div
      onClick={onClick}
      className={[
        'px-4 py-3 bg-[var(--bg-surface)]',
        'hover:bg-[var(--bg-elevated)] active:bg-[var(--bg-elevated)]',
        borderColor ? `border-l-4 ${borderColor}` : '',
        onClick ? 'cursor-pointer' : '',
        className,
      ].filter(Boolean).join(' ')}
    >
      {children}
    </div>
  );
}

// ─── MobileCardAction ────────────────────────────────────────────────────────
// Standardized action button for mobile card rows

export type MobileCardActionColor =
  | 'blue' | 'red' | 'green' | 'purple'
  | 'slate' | 'emerald' | 'orange' | 'amber';

const ACTION_COLORS: Record<MobileCardActionColor, string> = {
  blue:    'bg-[var(--primary-dim)] text-[var(--primary)]',
  red:     'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  green:   'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  purple:  'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  slate:   'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  orange:  'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  amber:   'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
};

interface MobileCardActionProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  color?: MobileCardActionColor;
}

export function MobileCardAction({ icon, children, onClick, color = 'blue' }: MobileCardActionProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2.5 py-1 ${ACTION_COLORS[color]} text-xs font-semibold rounded-lg active:scale-95 transition-all`}
    >
      {icon}
      {children}
    </button>
  );
}
