import React from 'react';
import { Loader2 } from 'lucide-react';

interface FormActionsProps {
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel?: string;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
  variant?: 'default' | 'danger';
  className?: string;
}

export const FormActions: React.FC<FormActionsProps> = ({
  onCancel,
  cancelLabel = 'Annuler',
  submitLabel = 'Enregistrer',
  isSubmitting = false,
  submitDisabled = false,
  variant = 'default',
  className = '',
}) => {
  const submitColors =
    variant === 'danger'
      ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500/30 text-white'
      : 'bg-[var(--primary)] hover:bg-[var(--primary-light)] focus:ring-[var(--primary-dim)] text-white';

  return (
    <div className={`flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)] mt-6 ${className}`}>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="
            px-4 py-2.5 text-sm font-medium
            text-[var(--text-primary)]
            bg-[var(--bg-elevated)]
            border border-[var(--border)]
            rounded-lg
            hover:bg-[var(--bg-elevated)]
            focus:outline-none focus:ring-4 focus:ring-slate-500/20
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {cancelLabel}
        </button>
      )}

      <button
        type="submit"
        disabled={isSubmitting || submitDisabled}
        className={`
          px-5 py-2.5 text-sm font-semibold
          rounded-lg
          focus:outline-none focus:ring-4
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-center gap-2
          min-w-[120px]
          shadow-sm hover:shadow
          ${submitColors}
        `}
      >
        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
        {isSubmitting ? 'Chargement...' : submitLabel}
      </button>
    </div>
  );
};
