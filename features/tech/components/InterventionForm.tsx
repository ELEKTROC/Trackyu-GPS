/**
 * InterventionForm Component (Refactored)
 *
 * BEFORE: 2,026 lines
 * AFTER: ~400 lines
 *
 * Extracted:
 * - PDF generation → services/pdfServiceV2.ts (via useInterventionForm)
 * - Business logic → hooks/useInterventionForm.ts
 * - Request tab → partials/InterventionRequestTab.tsx
 * - Vehicle tab → partials/InterventionVehicleTab.tsx
 * - Tech tab → partials/InterventionTechTab.tsx
 * - Signature tab → partials/InterventionSignatureTab.tsx
 */

import React, { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Save, X, Calendar, Truck, Wrench, PenTool, CheckCircle, PlayCircle, FileText } from 'lucide-react';
import type { Intervention, Invoice, Ticket } from '../../../types';
import type { SystemUser } from '../../../types/auth';
import { TOAST } from '../../../constants/toastMessages';
import { getStatusBgClass } from '../../../constants';
import { INTERVENTION_STATUSES } from '../constants';
import { useInterventionForm } from '../hooks/useInterventionForm';
import { useDataContext } from '../../../contexts/DataContext';
import { CreateTicketSchema } from '../../../schemas/ticketSchema';
import {
  InterventionRequestTab,
  InterventionVehicleTab,
  InterventionTechTab,
  InterventionSignatureTab,
} from './partials';
import { TicketFormModal } from '../../support/components/partials/TicketFormModal';

interface InterventionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (intervention: Partial<Intervention>) => void;
  initialData?: Intervention | null;
  technicians: SystemUser[];
  initialTab?: 'REQUEST' | 'PLANNING' | 'EXECUTION' | 'REPORT' | 'INVOICING';
}

export const InterventionForm: React.FC<InterventionFormProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  technicians,
  initialTab = 'REQUEST',
}) => {
  // Use custom hook for all business logic
  const {
    // State
    formData,
    setFormData,
    activeTab,
    setActiveTab,
    isTestLoading,
    testResult,
    isTicketModalOpen,
    setIsTicketModalOpen,
    technicianSignature,

    // Computed
    availableVehicles,

    // Context data
    clients,
    stock,
    catalogItems,
    tickets,
    contracts,
    branches,
    user,
    addInvoice,

    // Helpers
    hasMaterial,
    hasTracker,
    hasSim,
    hasSensor,
    isTransfer,

    // Config
    currentNatureConfig,

    // Handlers
    handleSimulateTest,
    handleStartIntervention,
    handleCompleteIntervention,
    handleSubmit,
    handleSaveAndGenerateBon,
    handleTabChange,
    showToast,
  } = useInterventionForm({
    initialData,
    isOpen,
    technicians,
    onSave,
    onClose,
  });

  // --- Ticket Form Modal state & data ---
  // All hooks MUST be called before any early return (Rules of Hooks)
  const { vehicles, tiers, ticketCategories, ticketSubcategories, slaConfig, invoices, addTicket } = useDataContext();
  const [ticketForm, setTicketForm] = useState<Partial<Ticket>>({
    id: '',
    clientId: '',
    subject: '',
    category: 'Support Technique',
    subCategory: '',
    interventionType: 'Dépannage',
    priority: 'MEDIUM',
    vehicleId: '',
    description: '',
    assignedTo: '',
    source: 'TrackYu',
    receivedAt: new Date(),
  });
  const [ticketFormErrors, setTicketFormErrors] = useState<Record<string, string>>({});
  const [stagedAttachments, setStagedAttachments] = useState<File[]>([]);

  // Reset ticket form when opening the modal
  const handleOpenTicketModal = useCallback(() => {
    setTicketForm({
      id: '',
      clientId: formData.clientId || '',
      subject: '',
      category: "Demande d'intervention",
      subCategory: '',
      interventionType: formData.type === 'INSTALLATION' ? 'INSTALLATION' : 'DEPANNAGE',
      priority: 'MEDIUM',
      vehicleId: formData.vehicleId || '',
      description: '',
      assignedTo: '',
      source: 'TrackYu',
      receivedAt: new Date(),
    });
    setTicketFormErrors({});
    setStagedAttachments([]);
    setIsTicketModalOpen(true);
  }, [formData.clientId, formData.type, formData.vehicleId, setIsTicketModalOpen]);

  const handleSaveTicketFromForm = useCallback(async () => {
    const validationResult = CreateTicketSchema.safeParse({
      ...ticketForm,
      vehicleId: ticketForm.vehicleId || undefined,
      subCategory: ticketForm.subCategory || undefined,
    });
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        if (issue.path[0]) errors[issue.path[0].toString()] = issue.message;
      });
      setTicketFormErrors(errors);
      const fieldNames: Record<string, string> = {
        clientId: 'Client',
        subject: 'Sujet',
        description: 'Description',
        category: 'Catégorie',
        priority: 'Priorité',
      };
      const errorFields = Object.keys(errors)
        .map((k) => fieldNames[k] || k)
        .join(', ');
      showToast(TOAST.VALIDATION.REQUIRED_FIELDS, 'error');
      return;
    }
    setTicketFormErrors({});
    try {
      const newId = `T-${Date.now().toString().slice(-6)}`;
      const createdTicket = await addTicket({
        ...ticketForm,
        id: newId,
        tenantId: user?.tenantId || '',
        status: 'OPEN',
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [],
      } as Ticket);
      const ticketId = createdTicket?.id || newId;
      setFormData((prev) => ({ ...prev, ticketId }));
      showToast(TOAST.SUPPORT.TICKET_CREATED, 'success');
      setIsTicketModalOpen(false);
    } catch {
      showToast(TOAST.CRUD.ERROR_CREATE('ticket'), 'error');
    }
  }, [ticketForm, addTicket, user, setFormData, showToast, setIsTicketModalOpen]);

  // Early return AFTER all hooks
  if (!isOpen) return null;

  // Tab configuration — labels courts sur mobile
  const tabs = [
    { id: 'REQUEST' as const, label: '1. Détails & Planification', mobileLabel: 'Détails', icon: Calendar },
    { id: 'VEHICLE' as const, label: '2. Véhicule & Checklist', mobileLabel: 'Véhicule', icon: Truck },
    { id: 'TECH' as const, label: '3. Technique & Matériel', mobileLabel: 'Technique', icon: Wrench },
    { id: 'SIGNATURE' as const, label: '4. Clôture & Signatures', mobileLabel: 'Clôture', icon: PenTool },
  ];

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-[var(--bg-surface)] rounded-t-2xl sm:rounded-xl shadow-2xl w-full max-w-5xl h-[95vh] sm:h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom sm:fade-in sm:zoom-in-95 duration-200 border-0 sm:border border-[var(--border)]">
        {/* Drag handle (mobile only) */}
        <div className="sm:hidden flex justify-center pt-2 pb-1 shrink-0">
          <div className="w-10 h-1 bg-[var(--border)] bg-[var(--bg-elevated)] rounded-full" />
        </div>

        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-elevated)]">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="page-title">Intervention {formData.id || 'Nouvelle'}</h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusBgClass(formData.status || 'PENDING')}`}
              >
                {INTERVENTION_STATUSES[formData.status as keyof typeof INTERVENTION_STATUSES] || formData.status}
              </span>
              {formData.type && (
                <span className="bg-[var(--bg-elevated)] border border-[var(--border)] px-2 py-0.5 rounded text-[10px] font-bold text-[var(--text-secondary)] uppercase">
                  {formData.type}
                </span>
              )}
              {formData.nature && (
                <span className="bg-[var(--primary-dim)] dark:bg-[var(--primary-dim)] border border-[var(--primary)] dark:border-[var(--primary)] px-2 py-0.5 rounded text-[10px] font-medium text-[var(--primary)] dark:text-[var(--primary)]">
                  {formData.nature}
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-2">
              Créé le {new Date(formData.createdAt || Date.now()).toLocaleDateString('fr-FR')} • Ticket lié:{' '}
              <span className="font-mono text-[var(--primary)]">{formData.ticketId || 'N/A'}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              title="Fermer"
              className="p-2 hover:bg-[var(--bg-elevated)] rounded-full text-[var(--text-secondary)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] bg-[var(--bg-surface)] px-2 sm:px-6 overflow-x-auto shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`py-3 sm:py-4 px-2 sm:px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border)]'
              }`}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.mobileLabel}</span>
            </button>
          ))}
        </div>

        {/* Body - Tab Content */}
        <div className="flex-1 overflow-y-auto bg-[var(--bg-elevated)]/50 bg-[var(--bg-surface)]/50 p-3 sm:p-6">
          {activeTab === 'REQUEST' && (
            <InterventionRequestTab
              formData={formData}
              setFormData={setFormData}
              clients={clients}
              tickets={tickets}
              technicians={technicians}
              contracts={contracts}
              catalogItems={catalogItems}
              availableVehicles={availableVehicles}
              allVehicles={vehicles}
              stock={stock}
              branches={branches}
              user={user}
              hasTracker={hasTracker}
              hasSim={hasSim}
              onOpenTicketModal={handleOpenTicketModal}
              showToast={showToast}
              initialTicketId={initialData?.ticketId}
            />
          )}

          {activeTab === 'VEHICLE' && (
            <InterventionVehicleTab
              formData={formData}
              setFormData={setFormData}
              availableVehicles={availableVehicles}
              stock={stock}
              catalogItems={catalogItems}
              user={user}
              hasSensor={hasSensor}
              isTransfer={isTransfer}
              currentNatureConfig={currentNatureConfig}
            />
          )}

          {activeTab === 'TECH' && (
            <InterventionTechTab
              formData={formData}
              setFormData={setFormData}
              isTestLoading={isTestLoading}
              testResult={testResult}
              hasMaterial={hasMaterial}
              hasTracker={hasTracker}
              hasSim={hasSim}
              hasSensor={hasSensor}
              handleSimulateTest={handleSimulateTest}
              showToast={showToast}
              selectedVehicle={availableVehicles.find((v) => v.id === formData.vehicleId)}
              stock={stock}
              currentNatureConfig={currentNatureConfig}
            />
          )}

          {activeTab === 'SIGNATURE' && (
            <InterventionSignatureTab
              formData={formData}
              setFormData={setFormData}
              catalogItems={catalogItems}
              technicianSignature={technicianSignature}
              addInvoice={addInvoice}
              showToast={showToast}
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 border-t border-[var(--border)] bg-[var(--bg-elevated)] flex justify-end items-center shrink-0">
          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] text-sm font-medium hover:bg-[var(--bg-elevated)]"
            >
              Annuler
            </button>

            {/* Signature Tab Actions - Facture et Clôturer */}
            {activeTab === 'SIGNATURE' && (
              <>
                {formData.status === 'COMPLETED' && !formData.invoiceId && (formData.cost || 0) > 0 && (
                  <button
                    onClick={() => {
                      // Mapper invoiceItems (unitPrice) vers items (price)
                      const mappedItems = formData.invoiceItems?.map((item) => ({
                        description: item.description,
                        quantity: item.quantity,
                        price: item.unitPrice || item.price || 0,
                      })) || [{ description: `Intervention ${formData.type}`, quantity: 1, price: formData.cost || 0 }];

                      const newInvoice: Invoice = {
                        id: `INV-${Date.now()}`,
                        tenantId: formData.tenantId || 'tenant_default',
                        clientId: formData.clientId || 'Unknown',
                        number: `INV-${Date.now()}`,
                        subject: `Intervention ${formData.type} - ${new Date(formData.scheduledDate || '').toLocaleDateString('fr-FR')}`,
                        date: new Date().toISOString().split('T')[0],
                        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                        amount: formData.cost || 0,
                        status: 'DRAFT',
                        items: mappedItems,
                        vatRate: 0,
                        invoiceType: 'FACTURE',
                        interventionId: formData.id,
                        category: formData.type === 'INSTALLATION' ? 'INSTALLATION' : 'STANDARD',
                        licensePlate: formData.licensePlate,
                        updateContract: formData.updateContract,
                      };
                      addInvoice(newInvoice);
                      setFormData((prev) => ({ ...prev, invoiceId: newInvoice.id }));
                      showToast(TOAST.CRUD.CREATED('Facture brouillon'), 'success');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold text-sm"
                  >
                    <FileText className="w-4 h-4" /> Facture
                  </button>
                )}

                {formData.status !== 'COMPLETED' && (
                  <button
                    onClick={handleCompleteIntervention}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold shadow-lg shadow-green-600/20 text-sm"
                  >
                    <CheckCircle className="w-4 h-4" /> Clôturer
                  </button>
                )}
              </>
            )}

            {/* Request Tab Start Button */}
            {(!formData.status ||
              formData.status === 'PENDING' ||
              formData.status === 'SCHEDULED' ||
              formData.status === 'EN_ROUTE') &&
              activeTab === 'REQUEST' && (
                <button
                  onClick={handleStartIntervention}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-bold flex items-center gap-2"
                >
                  <PlayCircle className="w-4 h-4" /> Démarrer
                </button>
              )}

            {/* Save */}
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-light)] text-sm font-bold flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Enregistrer
            </button>
          </div>
        </div>

        {/* Ticket Creation Modal — aligned with Support module form */}
        <TicketFormModal
          isOpen={isTicketModalOpen}
          onClose={() => {
            setIsTicketModalOpen(false);
            setStagedAttachments([]);
          }}
          isEditMode={false}
          ticketForm={ticketForm}
          setTicketForm={setTicketForm as any}
          formErrors={ticketFormErrors}
          handleSaveTicket={handleSaveTicketFromForm}
          clients={clients}
          vehicles={vehicles}
          technicians={technicians}
          tiers={tiers}
          ticketCategories={ticketCategories}
          ticketSubcategories={ticketSubcategories}
          slaConfig={slaConfig}
          invoices={invoices}
          stagedFiles={stagedAttachments}
          onStagedFilesChange={setStagedAttachments}
        />
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
