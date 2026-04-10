import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, FileText, X } from 'lucide-react';
import { Modal } from './Modal';
import type { ImportResult } from '../services/importService';
import { parseCSV } from '../services/importService';
import { logger } from '../utils/logger';

interface ImportModalProps<T> {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: T[]) => void;
  title: string;
  requiredColumns: string[];
  sampleData?: string; // CSV string for template
}

export const ImportModal = <T extends any>({ isOpen, onClose, onImport, title, requiredColumns, sampleData }: ImportModalProps<T>) => {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult<T> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    try {
      const res = await parseCSV<T>(selectedFile, requiredColumns);
      setResult(res);
    } catch (error) {
      logger.error("Import error:", error);
      // Handle error
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (result && result.data.length > 0) {
      onImport(result.data);
      handleClose();
    }
  };

  const handleClose = () => {
    setFile(null);
    setResult(null);
    onClose();
  };

  const downloadTemplate = () => {
    if (!sampleData) return;
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={title}>
      <div className="p-6 space-y-6">
        
        {/* File Upload Area */}
        {!file ? (
          <div 
            className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-[var(--primary)] hover:bg-[var(--primary-dim)] dark:hover:bg-[var(--primary-dim)]/20 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-12 h-12 bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)] rounded-full flex items-center justify-center mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">Cliquez pour sélectionner un fichier CSV</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">ou glissez-déposez votre fichier ici</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv" 
              onChange={handleFileChange} 
            />
          </div>
        ) : (
          <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{file.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button onClick={() => { setFile(null); setResult(null); }} className="text-slate-400 hover:text-red-500">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Results Summary */}
        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                <div className="text-2xl font-bold text-slate-700 dark:text-slate-200">{result.meta.total}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 uppercase font-bold">Lignes trouvées</div>
              </div>
              <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-center">
                <div className="text-2xl font-bold text-green-600">{result.meta.success}</div>
                <div className="text-xs text-green-600 uppercase font-bold">Valides</div>
              </div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-center">
                <div className="text-2xl font-bold text-red-600">{result.meta.failed}</div>
                <div className="text-xs text-red-600 uppercase font-bold">Erreurs</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 max-h-40 overflow-y-auto custom-scrollbar">
                <h5 className="text-xs font-bold text-red-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Erreurs détectées ({result.errors.length})
                </h5>
                <ul className="space-y-1">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-600 font-mono">• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Template Download */}
        {sampleData && !file && (
          <div className="text-center">
            <button onClick={downloadTemplate} className="text-xs text-[var(--primary)] hover:underline font-medium">
              Télécharger un modèle CSV
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
        <button 
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
        >
          Annuler
        </button>
        <button 
          onClick={handleConfirm}
          disabled={!result || result.meta.success === 0}
          className="px-4 py-2 text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-light)] rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Importer {result?.meta.success ? `${result.meta.success} éléments` : ''}
        </button>
      </div>
    </Modal>
  );
};
