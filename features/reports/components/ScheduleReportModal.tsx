import React, { useState } from 'react';
import { Modal } from '../../../components/Modal';
import { Clock, Mail, FileText, MessageSquare, Repeat } from 'lucide-react';

interface ScheduleReportData {
    subject: string;
    message: string;
    time: string;
    frequency: string;
    recipients: string[];
    format: string;
}

interface ScheduleReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSchedule: (data: ScheduleReportData) => void;
}

export const ScheduleReportModal: React.FC<ScheduleReportModalProps> = ({ isOpen, onClose, onSchedule }) => {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [time, setTime] = useState('08:00');
    const [frequency, setFrequency] = useState('weekly');
    const [recipients, setRecipients] = useState('');
    const [format, setFormat] = useState('pdf');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSchedule({
            subject,
            message,
            time,
            frequency,
            recipients: recipients.split(',').map(r => r.trim()),
            format
        });
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Programmer l'envoi du rapport"
            maxWidth="max-w-2xl"
        >
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Objet
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Rapport hebdomadaire..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Mail className="w-4 h-4" /> Destinataires
                        </label>
                        <input
                            type="text"
                            value={recipients}
                            onChange={(e) => setRecipients(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="email@exemple.com, ..."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Heure d'envoi
                        </label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <Repeat className="w-4 h-4" /> Fréquence
                        </label>
                        <select
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="daily">Quotidien</option>
                            <option value="weekly">Hebdomadaire</option>
                            <option value="monthly">Mensuel</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Format
                        </label>
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="pdf">PDF</option>
                            <option value="csv">CSV</option>
                            <option value="excel">Excel</option>
                        </select>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Message
                    </label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                        placeholder="Message accompagnant le rapport..."
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Programmer
                    </button>
                </div>
            </form>
        </Modal>
    );
};
