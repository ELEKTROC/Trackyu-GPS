/**
 * TrackYu Web — Card
 * Miroir du composant mobile Card.tsx
 *
 * borderRadius: 14px, borderWidth: 1, bg: var(--bg-surface)
 * Prop `accent` : barre latérale gauche colorée (ex: statut, priorité)
 *
 * Usage :
 *   <Card>...</Card>
 *   <Card title="Titre" icon={Settings}>...</Card>
 *   <Card accent="var(--status-alert)">...</Card>  ← barre rouge
 */
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ElementType;
  onClick?: () => void;
  /** Couleur de la barre d'accentuation gauche (optionnel) */
  accent?: string;
  /** Épaisseur de la barre (défaut : 4) */
  accentWidth?: number;
  /** Padding interne (défaut : 14px, identique mobile) */
  padding?: number;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  action,
  icon: Icon,
  onClick,
  accent,
  accentWidth = 4,
  padding = 14,
}) => {
  const base = [
    'rounded-[14px] border border-[var(--border)] overflow-hidden transition-all duration-200',
    'bg-[var(--bg-surface)]',
    onClick ? 'cursor-pointer hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] active:scale-[0.99]' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {/* En-tête optionnel (titre + icône + action) */}
      {(title || action || Icon) && (
        <div
          className="px-4 py-3 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)]"
          style={accent ? { paddingLeft: `${accentWidth + 16}px` } : undefined}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {Icon && (
              <div
                className="p-2 rounded-lg shrink-0"
                style={{ backgroundColor: 'var(--primary-dim)', color: 'var(--primary)' }}
              >
                <Icon className="w-4 h-4" />
              </div>
            )}
            {title &&
              (typeof title === 'string' ? (
                <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">{title}</h3>
              ) : (
                <div className="font-semibold text-sm text-[var(--text-primary)] w-full">{title}</div>
              ))}
          </div>
          {action && <div className="ml-4 shrink-0">{action}</div>}
        </div>
      )}

      {/* Corps */}
      <div
        className="text-[var(--text-primary)]"
        style={{
          padding: title || action || Icon ? undefined : padding,
          // Si header présent, garder le padding global sauf top
        }}
      >
        {!(title || action || Icon) ? children : (
          <div style={{ padding }}>{children}</div>
        )}
      </div>
    </>
  );

  return (
    <div
      className={base}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {accent ? (
        /* Barre d'accentuation latérale gauche — miroir mobile Card accent prop */
        <div className="flex h-full">
          <div
            className="shrink-0"
            style={{ width: accentWidth, backgroundColor: accent }}
          />
          <div className="flex-1 min-w-0">{content}</div>
        </div>
      ) : (
        content
      )}
    </div>
  );
};

export default Card;
