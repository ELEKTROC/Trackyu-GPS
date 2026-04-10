import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../../../components/Modal';
import { Mail, MessageCircle, Send, RefreshCw, FileText, ChevronDown } from 'lucide-react';
import { api } from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { TOAST } from '../../../constants/toastMessages';
import { mapError } from '../../../utils/errorMapper';
import { useCurrency } from '../../../hooks/useCurrency';
import type { Tier } from '../../../types';

interface MessageTemplate {
    id: string;
    name: string;
    category: string;
    channel: string;
    subject?: string;
    content: string;
    variables: string[];
    is_active: boolean;
}

type SendChannel = 'EMAIL' | 'WHATSAPP';

interface SendDocumentData {
    id?: string;
    number?: string;
    status: string;
    [key: string]: unknown;
}

interface SendDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    documentData: SendDocumentData;
    client: Tier | null;
    mode: 'INVOICES' | 'QUOTES';
    onSaveAndSend: (data: SendDocumentData) => void;
}

export const SendDocumentModal: React.FC<SendDocumentModalProps> = ({
    isOpen, onClose, documentData, client, mode, onSaveAndSend
}) => {
    const { showToast } = useToast();
    const { formatPrice } = useCurrency();

    const [channel, setChannel] = useState<SendChannel>('EMAIL');
    const [sending, setSending] = useState(false);
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(true);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    // Form fields
    const docLabel = mode === 'QUOTES' ? 'Devis' : 'Facture';
    const docNumber = documentData?.number || 'Nouveau';

    const [emailTo, setEmailTo] = useState(client?.email || '');
    const [whatsappTo, setWhatsappTo] = useState(client?.phone || '');
    const [subject, setSubject] = useState(`${docLabel} ${docNumber}`);
    const [message, setMessage] = useState(`Veuillez trouver ci-joint votre ${docLabel.toLowerCase()}.`);

    // Load message templates
    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        const load = async () => {
            setLoadingTemplates(true);
            try {
                const data = await api.messageTemplates.list();
                if (!cancelled) setTemplates(Array.isArray(data) ? data.filter(t => t.is_active) : []);
            } catch {
                if (!cancelled) setTemplates([]);
            } finally {
                if (!cancelled) setLoadingTemplates(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, [isOpen]);

    // Filter templates by channel
    const filteredTemplates = useMemo(() => {
        return templates.filter(t => t.channel === channel);
    }, [templates, channel]);

    // Apply template
    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplateId(templateId);
        if (!templateId) return;
        const tpl = templates.find(t => t.id === templateId);
        if (!tpl) return;

        // Replace variables in content
        let content = tpl.content;
        const vars: Record<string, string> = {
            '{client_name}': client?.name || '',
            '{document_number}': docNumber,
            '{document_type}': docLabel,
            '{amount}': formatPrice(documentData?.amount || 0),
            '{valid_until}': documentData?.validUntil ? new Date(documentData.validUntil).toLocaleDateString('fr-FR') : '',
            '{company_name}': 'TrackYu GPS',
        };
        Object.entries(vars).forEach(([key, val]) => {
            content = content.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val);
        });

        setMessage(content);
        if (tpl.subject) {
            let subjectText = tpl.subject;
            Object.entries(vars).forEach(([key, val]) => {
                subjectText = subjectText.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), val);
            });
            setSubject(subjectText);
        }
    };

    // Reset on channel change
    useEffect(() => {
        setSelectedTemplateId('');
    }, [channel]);

    const handleSend = async () => {
        const recipient = channel === 'EMAIL' ? emailTo : whatsappTo;
        if (!recipient) {
            showToast(TOAST.VALIDATION.REQUIRED_FIELD(channel === 'EMAIL' ? 'adresse email' : 'numéro WhatsApp'), 'error');
            return;
        }

        setSending(true);
        try {
            // First save the document (parent will handle API call)
            // Mark as SENT
            const dataToSave = { ...documentData, status: 'SENT' };

            if (channel === 'EMAIL') {
                // Use the finance sendInvoiceEmail for existing docs, or generic send for new
                if (documentData.id) {
                    await api.finance.sendInvoiceEmail(documentData.id, {
                        recipientEmail: emailTo,
                        subject,
                        message
                    });
                } else {
                    await api.send.email({
                        to: emailTo,
                        subject,
                        text: message
                    });
                }
            } else {
                // WhatsApp
                await api.send.whatsapp({
                    to: whatsappTo,
                    message: `${subject}\n\n${message}`
                });
            }

            showToast(TOAST.COMM.EMAIL_SENT(channel === 'EMAIL' ? recipient : `WhatsApp: ${recipient}`), 'success');
            onSaveAndSend(dataToSave);
        } catch (error: unknown) {
            showToast(mapError(error, 'envoi'), 'error');
        } finally {
            setSending(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Enregistrer et Envoyer — ${docLabel}`} maxWidth="max-w-xl">
            <div className="p-5 space-y-4">
                {/* Document summary */}
                <div className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] p-3 rounded-lg border border-[var(--border)] dark:border-[var(--primary)]">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[var(--primary)] dark:text-[var(--primary)]" />
                        <span className="text-sm font-semibold text-[var(--primary)] dark:text-[var(--primary)]">
                            {docLabel} {docNumber}
                        </span>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-[var(--primary)] dark:text-[var(--primary)]">
                        <span>Client: {client?.name || documentData?.clientName || '—'}</span>
                        <span>Montant: {formatPrice(documentData?.amount || 0)}</span>
                    </div>
                </div>

                {/* Channel selector */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
                        Canal d'envoi
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={() => setChannel('EMAIL')}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 font-bold text-sm transition-all ${
                                channel === 'EMAIL'
                                    ? 'border-[var(--primary)] bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] text-[var(--primary)] dark:text-[var(--primary)]'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            <Mail className="w-4 h-4" /> Email
                        </button>
                        <button
                            type="button"
                            onClick={() => setChannel('WHATSAPP')}
                            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border-2 font-bold text-sm transition-all ${
                                channel === 'WHATSAPP'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
                            }`}
                        >
                            <MessageCircle className="w-4 h-4" /> WhatsApp
                        </button>
                    </div>
                </div>

                {/* Recipient */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        {channel === 'EMAIL' ? 'Email du destinataire' : 'Numéro WhatsApp'} <span className="text-red-500">*</span>
                    </label>
                    <input
                        type={channel === 'EMAIL' ? 'email' : 'tel'}
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                        value={channel === 'EMAIL' ? emailTo : whatsappTo}
                        onChange={e => channel === 'EMAIL' ? setEmailTo(e.target.value) : setWhatsappTo(e.target.value)}
                        placeholder={channel === 'EMAIL' ? 'email@exemple.com' : '+225XXXXXXXXXX'}
                    />
                </div>

                {/* Template selection */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Modèle de message
                    </label>
                    <div className="relative">
                        <select
                            title="Modèle de message"
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white appearance-none pr-8"
                            value={selectedTemplateId}
                            onChange={e => handleTemplateSelect(e.target.value)}
                        >
                            <option value="">— Message personnalisé —</option>
                            {loadingTemplates ? (
                                <option disabled>Chargement...</option>
                            ) : (
                                filteredTemplates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))
                            )}
                            {!loadingTemplates && filteredTemplates.length === 0 && (
                                <option disabled>Aucun modèle {channel} disponible</option>
                            )}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                    {filteredTemplates.length === 0 && !loadingTemplates && (
                        <p className="text-[10px] text-slate-400 mt-1">
                            Créez des modèles dans Administration → Messages
                        </p>
                    )}
                </div>

                {/* Subject (email only) */}
                {channel === 'EMAIL' && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                            Objet
                        </label>
                        <input
                            type="text"
                            title="Objet de l'email"
                            className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white"
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        />
                    </div>
                )}

                {/* Message */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                        Message
                    </label>
                    <textarea
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white h-28 resize-none"
                        value={message}
                        onChange={e => { setMessage(e.target.value); setSelectedTemplateId(''); }}
                        placeholder="Message qui accompagnera le document..."
                    />
                </div>

                {/* Attachment indicator */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Le {docLabel.toLowerCase()} sera joint au format PDF</span>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold disabled:opacity-50"
                    >
                        Annuler
                    </button>
                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending || (channel === 'EMAIL' ? !emailTo : !whatsappTo)}
                        className={`px-6 py-2 text-white rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            channel === 'EMAIL'
                                ? 'bg-[var(--primary)] hover:bg-[var(--primary-light)] shadow-blue-500/30'
                                : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'
                        }`}
                    >
                        {sending ? (
                            <><RefreshCw className="w-4 h-4 animate-spin" /> Envoi en cours...</>
                        ) : (
                            <><Send className="w-4 h-4" /> Enregistrer et Envoyer</>
                        )}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
