import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, File, FileText, Image as ImageIcon, Download, Trash2 } from 'lucide-react';
import { api } from '../../../services/apiLazy';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useConfirmDialog } from '../../../components/ConfirmDialog';

interface Attachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
}

interface AttachmentUploadProps {
  ticketId: string;
}

export const AttachmentUpload: React.FC<AttachmentUploadProps> = ({ ticketId }) => {
  const { showToast } = useToast();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les pièces jointes
  useEffect(() => {
    loadAttachments();
  }, [ticketId]);

  const loadAttachments = async () => {
    try {
      const data = await api.tickets.getAttachments(ticketId);
      setAttachments(data);
    } catch {
      // silent
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await uploadFiles(files);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await uploadFiles(files);
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) return;

    // Validation taille (10 MB max)
    const maxSize = 10 * 1024 * 1024;
    const invalidFiles = files.filter((f) => f.size > maxSize);
    if (invalidFiles.length > 0) {
      showToast(`Fichier(s) trop volumineux (max 10 MB): ${invalidFiles.map((f) => f.name).join(', ')}`, 'error');
      return;
    }

    setIsUploading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('ticketId', ticketId);

        await api.tickets.addAttachment(ticketId, formData);
      }

      showToast(`${files.length} fichier(s) uploadé(s)`, 'success');
      loadAttachments();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de l'upload";
      showToast(errorMessage, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (
      !(await confirm({
        message: 'Supprimer cette pièce jointe ?',
        variant: 'danger',
        title: 'Confirmer la suppression',
        confirmLabel: 'Supprimer',
      }))
    )
      return;

    try {
      await api.tickets.deleteAttachment(ticketId, attachmentId);
      showToast('Pièce jointe supprimée', 'success');
      loadAttachments();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors de la suppression';
      showToast(errorMessage, 'error');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || ''))
      return <ImageIcon className="w-5 h-5 text-[var(--primary)]" />;
    if (['pdf'].includes(ext || '')) return <FileText className="w-5 h-5 text-red-500" />;
    return <File className="w-5 h-5 text-[var(--text-secondary)]" />;
  };

  const isImageFile = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '');
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase flex items-center gap-2">
        <Upload className="w-3 h-3" /> Pièces Jointes ({attachments.length})
      </h4>

      {/* Zone de drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
                    border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
                    ${
                      isDragging
                        ? 'border-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)]'
                        : 'border-[var(--border)] hover:border-[var(--primary)]'
                    }
                    ${isUploading ? 'opacity-50 pointer-events-none' : ''}
                `}
      >
        <Upload
          className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-[var(--primary)]' : 'text-[var(--text-muted)]'}`}
        />
        <p className="text-sm text-[var(--text-secondary)] mb-1">
          {isUploading ? 'Upload en cours...' : 'Glissez-déposez ou cliquez'}
        </p>
        <p className="text-xs text-[var(--text-muted)]">PDF, Images, Docs (max 10 MB)</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          aria-label="Sélectionner des fichiers"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx,.txt"
        />
      </div>

      {/* Liste des fichiers */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-3 p-3 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border)]"
            >
              {getFileIcon(attachment.fileName)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{attachment.fileName}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {formatFileSize(attachment.fileSize)} • {new Date(attachment.uploadedAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="flex gap-1">
                <a
                  href={attachment.fileUrl}
                  download
                  className="p-2 hover:bg-[var(--bg-elevated)] rounded transition-colors"
                  title="Télécharger"
                >
                  <Download className="w-4 h-4 text-[var(--text-secondary)]" />
                </a>
                <button
                  onClick={() => handleDelete(attachment.id)}
                  className="p-2 hover:bg-[var(--clr-danger-muted)] rounded transition-colors"
                  title="Supprimer"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview images */}
      {attachments.filter((a) => isImageFile(a.fileName)).length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {attachments
            .filter((a) => isImageFile(a.fileName))
            .map((attachment) => (
              <a
                key={attachment.id}
                href={attachment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square rounded-lg overflow-hidden border border-[var(--border)] hover:opacity-80 transition-opacity"
              >
                <img src={attachment.fileUrl} alt={attachment.fileName} className="w-full h-full object-cover" />
              </a>
            ))}
        </div>
      )}
      <ConfirmDialogComponent />
    </div>
  );
};
