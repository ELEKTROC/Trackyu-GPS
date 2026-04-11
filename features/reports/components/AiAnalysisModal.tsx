import React from 'react';
import { Modal } from '../../../components/Modal';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface AiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportLabel: string;
  isAnalyzing: boolean;
  analysisResult: string;
  rowCount: number;
}

export const AiAnalysisModal: React.FC<AiAnalysisModalProps> = ({
  isOpen,
  onClose,
  reportLabel,
  isAnalyzing,
  analysisResult,
  rowCount,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Analyse Intelligente (IA)">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-800 rounded-full text-indigo-600 dark:text-indigo-300">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-indigo-900 dark:text-indigo-200">Analyse de {reportLabel}</h4>
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              L'IA analyse {rowCount} lignes de données pour détecter des tendances et anomalies.
            </p>
          </div>
        </div>

        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 text-[var(--primary)] animate-spin" />
            <p className="text-[var(--text-secondary)] font-medium animate-pulse">Analyse en cours...</p>
            <p className="text-xs text-[var(--text-muted)]">Cela peut prendre quelques secondes.</p>
          </div>
        ) : analysisResult ? (
          <div className="prose prose-sm dark:prose-invert max-w-none bg-[var(--bg-elevated)] p-4 rounded-lg border border-[var(--border)] shadow-sm max-h-[400px] overflow-y-auto custom-scrollbar">
            <div className="whitespace-pre-wrap">{analysisResult}</div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
            <AlertCircle className="w-10 h-10 mb-2 opacity-50" />
            <p>Aucun résultat d'analyse disponible.</p>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-[var(--border)] border-[var(--border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-primary)] rounded-lg font-medium hover:bg-[var(--bg-elevated)] dark:hover:bg-slate-600 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </Modal>
  );
};
