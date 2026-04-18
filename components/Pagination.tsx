import React from 'react';
import { useTranslation } from '../i18n';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Nombre total d'éléments à afficher côté gauche */
  totalItems?: number;
  /** Label singulier de l'élément (ex: "contrat", "abonnement") */
  itemLabel?: string;
  /** Affiche "(filtré)" si vrai */
  filtered?: boolean;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemLabel,
  filtered = false,
  className = '',
}) => {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  const btnCls = 'px-2 py-1 min-h-[32px] rounded border disabled:opacity-40 transition-colors text-xs';

  const start = Math.max(1, Math.min(totalPages - 4, currentPage - 2));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i);

  return (
    <div
      className={`flex items-center justify-between text-xs ${className}`}
      style={{ color: 'var(--text-secondary)' }}
    >
      <span>
        {totalItems !== undefined && itemLabel
          ? `${totalItems} ${itemLabel}${totalItems > 1 ? 's' : ''}${filtered ? ' ' + t('shared.pagination.filtered') : ''} · `
          : ''}
        {t('shared.pagination.page', { current: currentPage, total: totalPages })}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className={btnCls}
          aria-label={t('shared.pagination.first')}
          title={t('shared.pagination.first')}
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          «
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={btnCls}
          aria-label={t('shared.pagination.previous')}
          title={t('shared.pagination.previous')}
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          ‹
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className="px-2.5 py-1 rounded border transition-colors text-xs"
            style={
              p === currentPage
                ? { backgroundColor: 'var(--primary)', color: '#ffffff', borderColor: 'var(--primary)' }
                : { borderColor: 'var(--border)', color: 'var(--text-secondary)' }
            }
          >
            {p}
          </button>
        ))}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={btnCls}
          aria-label={t('shared.pagination.next')}
          title={t('shared.pagination.next')}
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className={btnCls}
          aria-label={t('shared.pagination.last')}
          title={t('shared.pagination.last')}
          style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          »
        </button>
      </div>
    </div>
  );
};
