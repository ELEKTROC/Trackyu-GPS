// services/api/finance.ts — Finance domain: contracts, invoices, quotes, catalog, stock, accounting, payments, etc.

import {
  USE_MOCK,
  NETWORK_DELAY,
  API_URL,
  DB_KEYS,
  db,
  sleep,
  filterByTenant,
  getHeaders,
  handleAuthError,
} from './client';
import { logger } from '../../utils/logger';
import type {
  Contract,
  Invoice,
  Quote,
  CatalogItem,
  StockMovement,
  JournalEntry,
  Payment,
  SupplierInvoice,
  BankTransaction,
  Budget,
  Subscription,
} from '../../types';
import type { AccountingPeriod } from '../../types/accounting';

/** Maps backend snake_case DB row → frontend camelCase BankTransaction */
function fromBankTransactionRow(r: any): BankTransaction {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    date: r.date,
    description: r.description ?? '',
    amount: parseFloat(r.amount ?? '0'),
    type: r.type,
    status: (r.status as BankTransaction['status']) ?? 'PENDING',
    reference: r.reference,
    matchedEntryId: r.matched_entry_id,
    accountCode: r.account_code,
    category: r.category,
    tierId: r.tier_id,
    resellerId: r.reseller_id,
    paymentMethod: r.payment_method,
    notes: r.notes,
  };
}

/** Maps frontend camelCase BankTransaction → backend snake_case POST/PUT payload */
function toBankTransactionPayload(tx: BankTransaction) {
  return {
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    category: tx.category,
    reference: tx.reference,
    status: tx.status,
    accountCode: tx.accountCode,
    tierId: tx.tierId,
    resellerId: tx.resellerId,
    paymentMethod: tx.paymentMethod,
    notes: tx.notes,
  };
}

/** Maps backend snake_case DB row → frontend camelCase SupplierInvoice */
function fromSupplierInvoiceRow(r: any): SupplierInvoice {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    supplierId: r.supplier_id,
    supplierName: r.supplier_name ?? '',
    invoiceNumber: r.invoice_number,
    reference: r.reference ?? '',
    label: r.label,
    date: r.date,
    dueDate: r.due_date,
    paymentTerms: r.payment_terms,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : (r.items ?? []),
    amount: parseFloat(r.total_ttc ?? r.amount ?? '0'),
    amountHT: parseFloat(r.total_ht ?? '0'),
    amountTVA: parseFloat(r.vat_amount ?? '0'),
    vatRate: parseFloat(r.vat_rate ?? '0'),
    accountCode: r.account_code,
    category: r.category,
    status: r.status ?? 'PENDING',
    paymentMethod: r.payment_method,
    paymentReference: r.payment_reference,
    isRecurring: r.is_recurring ?? false,
    recurrencePeriod: r.recurrence_period,
    notes: r.notes,
    resellerId: r.reseller_id,
    attachments: typeof r.attachments === 'string' ? JSON.parse(r.attachments) : (r.attachments ?? []),
    createdAt: r.created_at ?? '',
  };
}

/** Maps frontend camelCase SupplierInvoice → backend snake_case POST/PUT payload */
function toSupplierInvoicePayload(inv: SupplierInvoice) {
  return {
    supplierId: inv.supplierId ?? inv.supplierName ?? '',
    supplierName: inv.supplierName,
    invoiceNumber: inv.invoiceNumber ?? inv.reference,
    reference: inv.reference,
    label: inv.label,
    date: inv.date,
    dueDate: inv.dueDate,
    paymentTerms: inv.paymentTerms,
    items: inv.items ?? [],
    totalHT: inv.amountHT ?? 0,
    totalTTC: inv.amount ?? 0,
    vatRate: inv.vatRate ?? 0,
    vatAmount: inv.amountTVA ?? 0,
    accountCode: inv.accountCode,
    category: inv.category,
    status: inv.status,
    paymentMethod: inv.paymentMethod,
    paymentReference: inv.paymentReference,
    isRecurring: inv.isRecurring,
    recurrencePeriod: inv.recurrencePeriod,
    notes: inv.notes,
    resellerId: inv.resellerId,
    attachments: inv.attachments ?? [],
  };
}

export function createFinanceApi() {
  return {
    // --- CONTRACTS ---
    contracts: {
      list: async (tenantId?: string): Promise<Contract[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return db.get(DB_KEYS.CONTRACTS, [] as Contract[]);
        }
        try {
          const response = await fetch(`${API_URL}/contracts`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch contracts');
          const rawData = await response.json();

          return rawData.map((c: any) => ({
            id: c.id,
            contractNumber: c.contract_number || c.contractNumber || null,
            tenantId: c.tenant_id || c.tenantId,
            clientId: c.tier_id || c.client_id || c.clientId,
            clientName: c.client_name || c.clientName,
            resellerName: c.reseller_name || c.resellerName || null,
            startDate: c.start_date || c.startDate,
            endDate: c.end_date || c.endDate,
            status: c.status,
            monthlyFee: parseFloat(c.monthly_fee || c.monthlyFee || '0'),
            vehicleCount: c.vehicle_count || c.vehicleCount || 0,
            billingCycle: c.billing_cycle || c.billingCycle || 'MONTHLY',
            autoRenew: c.auto_renew ?? c.autoRenew ?? true,
            items: c.items
              ? (typeof c.items === 'string' ? JSON.parse(c.items) : c.items).map((item: any) => ({
                  description: item.description,
                  quantity: item.quantity,
                  price: item.unit_price ?? item.price ?? 0,
                  catalogItemId: item.catalogItemId ?? item.catalog_item_id ?? undefined,
                  taxRate: item.tax_rate ?? undefined,
                }))
              : [],
            pdfUrl: c.pdf_url || c.pdfUrl,
            notes: c.notes,
            subject: c.subject,
            vehicleIds: c.vehicle_ids || c.vehicleIds || [],
            createdAt: c.created_at || c.createdAt,
          }));
        } catch (e) {
          logger.error('API Error (contracts):', e);
          if (!USE_MOCK) throw e;
          return db.get(DB_KEYS.CONTRACTS, [] as Contract[]);
        }
      },
      create: async (contract: Contract): Promise<Contract> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const contracts = db.get(DB_KEYS.CONTRACTS, [] as Contract[]);
          const newContract = { ...contract, id: `CTR-${Date.now()}` };
          contracts.push(newContract);
          db.save(DB_KEYS.CONTRACTS, contracts);
          return newContract;
        }
        try {
          // Convert camelCase to snake_case for backend
          const payload = {
            tier_id: contract.clientId,
            client_id: contract.clientId,
            start_date: contract.startDate,
            end_date: contract.endDate ?? null,
            status: contract.status,
            monthly_fee: Number(contract.monthlyFee) || 0,
            vehicle_count: Number(contract.vehicleCount) || 0,
            billing_cycle: contract.billingCycle,
            auto_renew: contract.autoRenew,
            items: contract.items?.map((item) => ({
              description: item.description,
              quantity: Number(item.quantity) || 1,
              unit_price: Number(item.price) || 0,
            })),
            pdf_url: contract.pdfUrl,
            notes: contract.notes,
            subject: contract.subject,
            vehicle_ids: contract.vehicleIds,
            reseller_id: contract.resellerId,
          };
          const response = await fetch(`${API_URL}/contracts`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const err = new Error(errData.error || 'Failed to create contract') as Error & {
              conflicts?: { vehicleId: string; contractNumber: string }[];
            };
            if (errData.conflicts) err.conflicts = errData.conflicts;
            throw err;
          }
          const c = await response.json();
          return {
            id: c.id,
            tenantId: c.tenant_id || c.tenantId,
            clientId: c.tier_id || c.client_id || c.clientId,
            clientName: c.client_name || c.clientName,
            startDate: c.start_date || c.startDate,
            endDate: c.end_date || c.endDate,
            status: c.status,
            monthlyFee: parseFloat(c.monthly_fee || c.monthlyFee || '0'),
            vehicleCount: c.vehicle_count || c.vehicleCount || 0,
            billingCycle: c.billing_cycle || c.billingCycle || 'MONTHLY',
            autoRenew: c.auto_renew ?? c.autoRenew ?? true,
            items: c.items
              ? (typeof c.items === 'string' ? JSON.parse(c.items) : c.items).map((i: any) => ({
                  description: i.description,
                  quantity: i.quantity,
                  price: i.unit_price ?? i.price ?? 0,
                }))
              : [],
            pdfUrl: c.pdf_url || c.pdfUrl,
            notes: c.notes,
            subject: c.subject,
            vehicleIds: c.vehicle_ids || c.vehicleIds || [],
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (contract: Contract): Promise<Contract> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const contracts = db.get(DB_KEYS.CONTRACTS, [] as Contract[]);
          const index = contracts.findIndex((c) => c.id === contract.id);
          if (index !== -1) {
            contracts[index] = contract;
            db.save(DB_KEYS.CONTRACTS, contracts);
            return contract;
          }
          throw new Error('Contract not found');
        }
        try {
          const payload = {
            tier_id: contract.clientId,
            client_id: contract.clientId,
            start_date: contract.startDate,
            end_date: contract.endDate ?? null,
            status: contract.status,
            monthly_fee: Number(contract.monthlyFee) || 0,
            vehicle_count: Number(contract.vehicleCount) || 0,
            billing_cycle: contract.billingCycle,
            auto_renew: contract.autoRenew,
            items: contract.items?.map((item) => ({
              description: item.description,
              quantity: Number(item.quantity) || 1,
              unit_price: Number(item.price) || 0,
            })),
            pdf_url: contract.pdfUrl,
            notes: contract.notes,
            subject: contract.subject,
            vehicle_ids: contract.vehicleIds,
            reseller_id: contract.resellerId,
          };
          const response = await fetch(`${API_URL}/contracts/${contract.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const err = new Error(errData.error || 'Failed to update contract') as Error & {
              conflicts?: { vehicleId: string; contractNumber: string }[];
            };
            if (errData.conflicts) err.conflicts = errData.conflicts;
            throw err;
          }
          const c = await response.json();
          return {
            id: c.id,
            contractNumber: c.contract_number || c.contractNumber || null,
            tenantId: c.tenant_id || c.tenantId,
            clientId: c.tier_id || c.client_id || c.clientId,
            clientName: c.client_name || c.clientName,
            resellerName: c.reseller_name || c.resellerName || null,
            startDate: c.start_date || c.startDate,
            endDate: c.end_date || c.endDate,
            status: c.status,
            monthlyFee: parseFloat(c.monthly_fee || c.monthlyFee || '0'),
            vehicleCount: c.vehicle_count || c.vehicleCount || 0,
            billingCycle: c.billing_cycle || c.billingCycle || 'MONTHLY',
            autoRenew: c.auto_renew ?? c.autoRenew ?? true,
            items: c.items
              ? (typeof c.items === 'string' ? JSON.parse(c.items) : c.items).map((i: any) => ({
                  description: i.description,
                  quantity: i.quantity,
                  price: i.unit_price ?? i.price ?? 0,
                }))
              : [],
            pdfUrl: c.pdf_url || c.pdfUrl,
            notes: c.notes,
            subject: c.subject,
            vehicleIds: c.vehicle_ids || c.vehicleIds || [],
            createdAt: c.created_at || c.createdAt,
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<void> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const contracts = db.get(DB_KEYS.CONTRACTS, [] as Contract[]);
          const filtered = contracts.filter((c) => c.id !== id);
          db.save(DB_KEYS.CONTRACTS, filtered);
          return;
        }
        try {
          const response = await fetch(`${API_URL}/contracts/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to delete contract');
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      renew: async (id: string, data?: { newEndDate?: string; newMonthlyFee?: number }): Promise<Contract> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const contracts = db.get(DB_KEYS.CONTRACTS, [] as Contract[]);
          const idx = contracts.findIndex((c) => c.id === id);
          if (idx !== -1) {
            contracts[idx].status = 'ACTIVE';
            if (data?.newEndDate) contracts[idx].endDate = data.newEndDate;
            db.save(DB_KEYS.CONTRACTS, contracts);
            return contracts[idx];
          }
          throw new Error('Contract not found');
        }
        const response = await fetch(`${API_URL}/contracts/${id}/renew`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data || {}),
        });
        if (!response.ok) throw new Error('Failed to renew contract');
        const result = await response.json();
        return result.contract || result;
      },
      terminate: async (id: string, data?: { reason?: string; terminationDate?: string }): Promise<Contract> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const contracts = db.get(DB_KEYS.CONTRACTS, [] as Contract[]);
          const idx = contracts.findIndex((c) => c.id === id);
          if (idx !== -1) {
            contracts[idx].status = 'TERMINATED';
            db.save(DB_KEYS.CONTRACTS, contracts);
            return contracts[idx];
          }
          throw new Error('Contract not found');
        }
        const response = await fetch(`${API_URL}/contracts/${id}/terminate`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data || {}),
        });
        if (!response.ok) throw new Error('Failed to terminate contract');
        const result = await response.json();
        return result.contract || result;
      },
    },

    // --- INVOICES ---
    invoices: {
      list: async (tenantId?: string): Promise<Invoice[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return db.get(DB_KEYS.INVOICES, [] as Invoice[]);
        }
        try {
          // Fetch ALL pages from paginated API (backend defaults to 100/page, max 200)
          let allRawItems: any[] = [];
          let page = 1;
          const limit = 200; // Max allowed by backend
          let hasMore = true;

          while (hasMore) {
            const response = await fetch(`${API_URL}/finance/invoices?page=${page}&limit=${limit}`, {
              headers: getHeaders(),
            });
            if (!response.ok) throw new Error('Failed to fetch invoices');
            const rawData = await response.json();

            // Backend returns { data: [...], total, page, limit }
            const rawArray = Array.isArray(rawData) ? rawData : rawData?.data || rawData?.invoices || [];
            allRawItems = allRawItems.concat(rawArray);

            const total = rawData?.total || rawArray.length;
            hasMore = !Array.isArray(rawData) && page * limit < total;
            page++;

            // Safety: max 100 pages to avoid infinite loop
            if (page > 100) break;
          }

          const rawArray = allRawItems;

          const mappedData = rawArray.map((i: any) => {
            // Map tenant_id to reseller name
            const resellerNames: Record<string, string> = {
              tenant_abj: 'ABIDJAN GPS',
              tenant_smt: 'SMARTRACK SOLUTIONS',
              tenant_trackyu: 'TrackYu GPS',
            };
            // Parse items from API (from zoho_invoice_items join)
            let parsedItems: any[] = [];
            if (i.items) {
              const itemsData = typeof i.items === 'string' ? JSON.parse(i.items) : i.items;
              if (Array.isArray(itemsData) && itemsData.length > 0) {
                parsedItems = itemsData.map((item: any) => ({
                  description: item.description || '',
                  quantity: parseFloat(item.quantity || '1'),
                  price: parseFloat(item.unit_price || item.price || '0'),
                }));
              }
            }
            // Priorité : taux stocké sur la facture, tenant_tax_rate sert uniquement de référence affichage
            const vatRate = parseFloat(i.tax_rate ?? i.vat_rate ?? i.tenant_tax_rate ?? '0');
            return {
              id: i.id,
              tenantId: i.tenant_id,
              clientId: i.tier_id || i.client_id, // API returns tier_id
              clientName: i.tier_name, // Include client name from API
              resellerName: resellerNames[i.tenant_id] || i.tenant_id, // Map tenant to reseller name
              number: i.invoice_number || i.number, // API returns invoice_number
              subject: i.subject,
              date: i.date,
              dueDate: i.due_date,
              amount: parseFloat(i.amount_ttc || i.amount || '0'), // API returns amount_ttc
              amountHT: parseFloat(i.amount_ht || '0'),
              status: ((s) => (s === 'PENDING' ? 'DRAFT' : s === 'PARTIAL' ? 'PARTIALLY_PAID' : s))(
                (i.status || 'DRAFT').toUpperCase()
              ), // pending → DRAFT, partial → PARTIALLY_PAID
              items: parsedItems,
              vatRate: vatRate,
              category: i.category || null,
              invoiceType: i.invoice_type,
              contractId: i.contract_id,
              contractNumber: i.contract_number || null,
              licensePlate: i.license_plate || i.order_number || null,
              subscriptionNumber: i.subscription_number || null,
              orderNumber: i.order_number,
              paymentTerms: i.payment_terms,
              generalConditions: i.general_conditions,
              notes: i.notes,
              paidAmount: parseFloat(i.paid_amount || '0'),
              installationDate: i.installation_date || null,
            };
          });

          // Debug removed

          return mappedData;
        } catch (e) {
          if (!USE_MOCK) throw e;
          logger.warn('API Error (invoices), falling back to mock data:', e);
          return db.get(DB_KEYS.INVOICES, [] as Invoice[]);
        }
      },
      create: async (invoice: Invoice): Promise<Invoice> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const invoices = db.get(DB_KEYS.INVOICES, [] as Invoice[]);
          const newInvoice = { ...invoice, id: `INV-${Date.now()}` };
          invoices.push(newInvoice);
          db.save(DB_KEYS.INVOICES, invoices);
          return newInvoice;
        }
        try {
          // Convert camelCase to snake_case for backend
          const payload = {
            tier_id: invoice.clientId,
            reseller_id: (invoice as any).resellerId || undefined,
            number: invoice.number,
            subject: invoice.subject,
            date: invoice.date,
            due_date: invoice.dueDate,
            amount: invoice.amount, // TTC
            amount_ht: (invoice as any).amountHT ?? invoice.amount,
            vat_rate: invoice.vatRate,
            discount: (invoice as any).discount ?? 0,
            items: invoice.items?.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unit_price: item.price,
            })),
            notes: invoice.notes,
            general_conditions: (invoice as any).generalConditions,
            status: invoice.status?.toUpperCase(),
            category: invoice.category,
            invoice_type: invoice.invoiceType || 'FACTURE',
            contract_id: invoice.contractId,
            license_plate: invoice.licensePlate || undefined,
            order_number: invoice.orderNumber || undefined,
            installation_date: (invoice as any).installationDate || undefined,
          };
          const response = await fetch(`${API_URL}/finance/invoices`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
          });
          if (!response.ok) throw new Error('Failed to create invoice');
          const rawData = await response.json();
          // Map snake_case response back to camelCase
          return {
            id: rawData.id,
            tenantId: rawData.tenant_id,
            clientId: rawData.tier_id,
            number: rawData.invoice_number || rawData.number,
            subject: rawData.subject,
            date: rawData.date,
            dueDate: rawData.due_date,
            amount: parseFloat(rawData.amount_ttc || rawData.amount || '0'),
            amountHT: parseFloat(rawData.amount_ht || '0'),
            vatRate: parseFloat(rawData.tax_rate || rawData.vat_rate || '0'),
            status: (rawData.status || 'DRAFT').toUpperCase(),
            items: (() => {
              const raw = rawData.items
                ? typeof rawData.items === 'string'
                  ? JSON.parse(rawData.items)
                  : rawData.items
                : [];
              return raw.map((item: any) => ({
                description: item.description || '',
                quantity: Number(item.quantity) || 1,
                price: Number(item.price ?? item.unit_price ?? 0),
              }));
            })(),
            notes: rawData.notes,
            generalConditions: rawData.general_conditions,
            category: rawData.category,
            contractId: rawData.contract_id,
            contractNumber: rawData.contract_number || null,
            orderNumber: rawData.order_number,
            licensePlate: rawData.license_plate || rawData.order_number || null,
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (invoice: Invoice): Promise<Invoice> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const invoices = db.get(DB_KEYS.INVOICES, [] as Invoice[]);
          const index = invoices.findIndex((i) => i.id === invoice.id);
          if (index !== -1) {
            invoices[index] = invoice;
            db.save(DB_KEYS.INVOICES, invoices);
            return invoice;
          }
          throw new Error('Invoice not found');
        }
        try {
          // Convert camelCase to snake_case for backend
          const rawPayload: Record<string, any> = {
            tier_id: invoice.clientId,
            reseller_id: (invoice as any).resellerId || undefined,
            number: invoice.number,
            subject: invoice.subject,
            date: invoice.date,
            due_date: invoice.dueDate,
            amount: invoice.amount, // TTC
            amount_ht: (invoice as any).amountHT ?? invoice.amount,
            vat_rate: invoice.vatRate,
            discount: (invoice as any).discount ?? 0,
            items: invoice.items?.map((item) => ({
              description: item.description || '',
              quantity: Number(item.quantity) || 0,
              unit_price: Number(item.price) || 0,
            })),
            notes: invoice.notes,
            general_conditions: (invoice as any).generalConditions,
            status: invoice.status?.toUpperCase(),
            category: invoice.category,
            invoice_type: invoice.invoiceType || 'FACTURE',
            contract_id: invoice.contractId,
            license_plate: invoice.licensePlate || undefined,
            order_number: invoice.orderNumber || undefined,
            installation_date: (invoice as any).installationDate || undefined,
            recovery_level: invoice.recoveryLevel,
            last_reminder_date: invoice.lastReminderDate,
            next_reminder_date: invoice.nextReminderDate,
            reminder_count: invoice.reminderCount,
          };
          // Strip null/undefined values to avoid Zod rejection
          const payload = Object.fromEntries(
            Object.entries(rawPayload).filter(([_, v]) => v !== null && v !== undefined)
          );
          const response = await fetch(`${API_URL}/finance/invoices/${invoice.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            logger.error('[api.invoices.update] Server error:', response.status, errorData);
            throw new Error(errorData?.error || 'Failed to update invoice');
          }
          const rawData = await response.json();
          // Map snake_case response back to camelCase
          // Preserve fields from the original invoice that the backend doesn't return (clientName, resellerName, etc.)
          return {
            id: rawData.id,
            tenantId: rawData.tenant_id,
            clientId: rawData.tier_id,
            clientName: rawData.tier_name || invoice.clientName,
            resellerName: invoice.resellerName,
            number: rawData.invoice_number || rawData.number,
            subject: rawData.subject,
            date: rawData.date,
            dueDate: rawData.due_date,
            installationDate: rawData.installation_date || invoice.installationDate,
            amount: parseFloat(rawData.amount_ttc || rawData.amount || '0'),
            amountHT: parseFloat(rawData.amount_ht || '0'),
            vatRate: parseFloat(rawData.tax_rate || rawData.vat_rate || '0'),
            paidAmount: parseFloat(rawData.paid_amount || '0'),
            status: (rawData.status || 'DRAFT').toUpperCase(),
            items: (() => {
              const raw = rawData.items
                ? typeof rawData.items === 'string'
                  ? JSON.parse(rawData.items)
                  : rawData.items
                : [];
              return raw.map((item: any) => ({
                description: item.description || '',
                quantity: Number(item.quantity) || 1,
                price: Number(item.price ?? item.unit_price ?? 0),
              }));
            })(),
            notes: rawData.notes,
            generalConditions: rawData.general_conditions || (invoice as any).generalConditions,
            licensePlate: rawData.license_plate || rawData.order_number || invoice.licensePlate,
            invoiceType: rawData.invoice_type || invoice.invoiceType,
            category: rawData.category,
            contractId: rawData.contract_id,
            contractNumber: rawData.contract_number || invoice.contractNumber,
            orderNumber: rawData.order_number,
            recoveryLevel: rawData.recovery_level,
            lastReminderDate: rawData.last_reminder_date,
            nextReminderDate: rawData.next_reminder_date,
            reminderCount: rawData.reminder_count,
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<void> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const invoices = db.get(DB_KEYS.INVOICES, [] as Invoice[]);
          const filtered = invoices.filter((i) => i.id !== id);
          db.save(DB_KEYS.INVOICES, filtered);
          return;
        }
        try {
          const response = await fetch(`${API_URL}/finance/invoices/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to delete invoice');
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
    },

    // --- QUOTES ---
    quotes: {
      list: async (tenantId?: string): Promise<Quote[]> => {
        if (USE_MOCK) return db.get(DB_KEYS.QUOTES, [] as Quote[]);
        try {
          // Utiliser /finance/quotes qui filtre par tenant
          const response = await fetch(`${API_URL}/finance/quotes`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch quotes');
          const rawData = await response.json();
          const rawArray = Array.isArray(rawData) ? rawData : rawData?.data || rawData?.quotes || [];

          return rawArray.map((q: any) => ({
            id: q.id,
            tenantId: q.tenant_id,
            // tier_id contient le client (CLI-XXX-XXXX)
            clientId: q.tier_id || q.client_id,
            tier_id: q.tier_id,
            clientName: q.tier_name,
            resellerId: q.reseller_id,
            resellerName: q.reseller_name,
            // amount_ttc est le montant total, amount peut être 0
            amount: parseFloat(q.amount_ttc || q.amount || '0'),
            amountHT: parseFloat(q.amount_ht || '0'),
            status: ((s: string) => (s === 'PENDING' ? 'DRAFT' : s))(q.status?.toUpperCase() || 'DRAFT'),
            items: q.items
              ? (Array.isArray(q.items) ? q.items : JSON.parse(q.items || '[]')).map((item: any) => ({
                  description: item.description,
                  quantity: parseFloat(item.quantity || '1'),
                  price: parseFloat(item.unit_price || item.price || '0'),
                }))
              : [],
            createdAt: q.created_at ? new Date(q.created_at) : new Date(),
            validUntil: q.valid_until ? new Date(q.valid_until) : undefined,
            subject: q.subject,
            // quote_number est le numéro du devis (DEV-SLUG-XXXXXX)
            number: q.quote_number || q.number,
            paymentTerms: q.payment_terms,
            contractId: q.contract_id,
            orderNumber: q.order_number,
            vatRate: parseFloat(q.vat_rate || q.tax_rate || '0'),
            discount: parseFloat(q.discount || '0'),
            generalConditions: q.general_conditions,
            notes: q.notes,
            date: q.date,
            // Nouveaux champs
            licensePlate: q.license_plate,
            category: q.category || 'STANDARD',
            leadId: q.lead_id,
          }));
        } catch (e) {
          logger.error('API Error (quotes):', e);
          throw e;
        }
      },
      create: async (quote: Quote): Promise<Quote> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const quotes = db.get(DB_KEYS.QUOTES, [] as Quote[]);
          const newQuote = { ...quote, id: `QUO-${Date.now()}`, createdAt: new Date() };
          quotes.push(newQuote);
          db.save(DB_KEYS.QUOTES, quotes);
          return newQuote;
        }
        try {
          // Mapper camelCase → snake_case pour le backend
          const payload = {
            tier_id: quote.clientId || quote.tier_id || null,
            number: quote.number,
            subject: quote.subject,
            date: quote.date || quote.createdAt,
            valid_until: quote.validUntil,
            items: quote.items?.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.price })),
            vat_rate: quote.vatRate,
            notes: quote.notes,
            general_conditions: quote.generalConditions,
            reseller_id: quote.resellerId,
            payment_terms: quote.paymentTerms,
            order_number: quote.orderNumber,
            contract_id: quote.contractId,
            license_plate: quote.licensePlate,
            category: quote.category,
            lead_id: quote.leadId || null,
            currency: quote.currency,
          };
          const response = await fetch(`${API_URL}/finance/quotes`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error || 'Failed to create quote');
          }
          const q = await response.json();
          return {
            id: q.id,
            tenantId: q.tenant_id,
            clientId: q.tier_id || q.client_id,
            tier_id: q.tier_id,
            clientName: q.tier_name,
            resellerId: q.reseller_id,
            resellerName: q.reseller_name,
            amount: parseFloat(q.amount_ttc || q.amount || '0'),
            amountHT: parseFloat(q.amount_ht || '0'),
            status: q.status || 'DRAFT',
            items: q.items
              ? (Array.isArray(q.items) ? q.items : JSON.parse(q.items || '[]')).map((item: any) => ({
                  description: item.description,
                  quantity: parseFloat(item.quantity || '1'),
                  price: parseFloat(item.unit_price || item.price || '0'),
                }))
              : [],
            createdAt: q.created_at ? new Date(q.created_at) : new Date(),
            validUntil: q.valid_until ? new Date(q.valid_until) : undefined,
            subject: q.subject,
            number: q.quote_number || q.number,
            paymentTerms: q.payment_terms,
            contractId: q.contract_id,
            orderNumber: q.order_number,
            vatRate: parseFloat(q.vat_rate || q.tax_rate || '0'),
            discount: parseFloat(q.discount || '0'),
            generalConditions: q.general_conditions,
            notes: q.notes,
            date: q.date,
            licensePlate: q.license_plate,
            category: q.category || 'STANDARD',
            leadId: q.lead_id,
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (quote: Quote): Promise<Quote> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const quotes = db.get(DB_KEYS.QUOTES, [] as Quote[]);
          const index = quotes.findIndex((q) => q.id === quote.id);
          if (index !== -1) {
            quotes[index] = quote;
            db.save(DB_KEYS.QUOTES, quotes);
            return quote;
          }
          throw new Error('Quote not found');
        }
        try {
          // Mapper camelCase → snake_case pour le backend
          const payload = {
            tier_id: quote.clientId || quote.tier_id || null,
            number: quote.number,
            subject: quote.subject,
            date: quote.date || quote.createdAt,
            valid_until: quote.validUntil,
            items: quote.items?.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.price })),
            vat_rate: quote.vatRate,
            notes: quote.notes,
            general_conditions: quote.generalConditions,
            status: quote.status,
            reseller_id: quote.resellerId,
            payment_terms: quote.paymentTerms,
            order_number: quote.orderNumber,
            contract_id: quote.contractId,
            license_plate: quote.licensePlate,
            category: quote.category,
            lead_id: quote.leadId || null,
            currency: quote.currency,
          };
          const response = await fetch(`${API_URL}/finance/quotes/${quote.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            throw new Error(errBody.error || 'Failed to update quote');
          }
          const q = await response.json();
          return {
            id: q.id,
            tenantId: q.tenant_id,
            clientId: q.tier_id || q.client_id,
            tier_id: q.tier_id,
            clientName: q.tier_name,
            resellerId: q.reseller_id,
            resellerName: q.reseller_name,
            amount: parseFloat(q.amount_ttc || q.amount || '0'),
            amountHT: parseFloat(q.amount_ht || '0'),
            status: q.status || 'DRAFT',
            items: q.items
              ? (Array.isArray(q.items) ? q.items : JSON.parse(q.items || '[]')).map((item: any) => ({
                  description: item.description,
                  quantity: parseFloat(item.quantity || '1'),
                  price: parseFloat(item.unit_price || item.price || '0'),
                }))
              : [],
            createdAt: q.created_at ? new Date(q.created_at) : new Date(),
            validUntil: q.valid_until ? new Date(q.valid_until) : undefined,
            subject: q.subject,
            number: q.quote_number || q.number,
            paymentTerms: q.payment_terms,
            contractId: q.contract_id,
            orderNumber: q.order_number,
            vatRate: parseFloat(q.vat_rate || q.tax_rate || '0'),
            discount: parseFloat(q.discount || '0'),
            generalConditions: q.general_conditions,
            notes: q.notes,
            date: q.date,
            licensePlate: q.license_plate,
            category: q.category || 'STANDARD',
            leadId: q.lead_id,
          };
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<void> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const quotes = db.get(DB_KEYS.QUOTES, [] as Quote[]);
          const filtered = quotes.filter((q) => q.id !== id);
          db.save(DB_KEYS.QUOTES, filtered);
          return;
        }
        try {
          const response = await fetch(`${API_URL}/finance/quotes/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to delete quote');
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
    },

    // --- CATALOG ---
    catalog: {
      list: async (tenantId?: string): Promise<CatalogItem[]> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) return db.get(DB_KEYS.CATALOG, [] as CatalogItem[]);
        try {
          const response = await fetch(`${API_URL}/catalog?tenantId=${tenantId}`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch catalog');
          return await response.json();
        } catch (e) {
          logger.warn('API Error (catalog), falling back to mock data:', e);
          return db.get(DB_KEYS.CATALOG, [] as CatalogItem[]);
        }
      },
      create: async (item: Partial<CatalogItem>): Promise<CatalogItem> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const items = db.get(DB_KEYS.CATALOG, [] as CatalogItem[]);
          const newItem = { ...item, id: item.id || `CAT-${Date.now()}` } as CatalogItem;
          db.save(DB_KEYS.CATALOG, [...items, newItem]);
          return newItem;
        }
        const response = await fetch(`${API_URL}/catalog`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(item),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Erreur serveur' }));
          throw new Error(err.error || 'Erreur lors de la création');
        }
        return await response.json();
      },
      update: async (item: CatalogItem): Promise<CatalogItem> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const items = db.get(DB_KEYS.CATALOG, [] as CatalogItem[]);
          const updatedItems = items.map((i) => (i.id === item.id ? item : i));
          db.save(DB_KEYS.CATALOG, updatedItems);
          return item;
        }
        const response = await fetch(`${API_URL}/catalog/${item.id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(item),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Erreur serveur' }));
          throw new Error(err.error || 'Erreur lors de la mise à jour');
        }
        return await response.json();
      },
      delete: async (id: string): Promise<void> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const items = db.get(DB_KEYS.CATALOG, [] as CatalogItem[]);
          db.set(
            DB_KEYS.CATALOG,
            items.filter((i) => i.id !== id)
          );
          return;
        }
        const response = await fetch(`${API_URL}/catalog/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Erreur serveur' }));
          throw new Error(err.error || 'Erreur lors de la suppression');
        }
      },
    },

    // --- STOCK MOVEMENTS ---
    stockMovements: {
      list: async (tenantId?: string): Promise<StockMovement[]> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          return db.get(DB_KEYS.STOCK_MOVEMENTS, []);
        }
        try {
          const response = await fetch(`${API_URL}/stock-movements?tenantId=${tenantId}`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch stock movements');
          return await response.json();
        } catch (e) {
          logger.error('API Error (stockMovements):', e);
          throw e;
        }
      },
      create: async (movement: StockMovement): Promise<StockMovement> => {
        if (USE_MOCK) {
          await sleep(NETWORK_DELAY);
          const movements = db.get(DB_KEYS.STOCK_MOVEMENTS, []);
          const newMovement = { ...movement, id: movement.id || `MOV-${Date.now()}` };
          db.save(DB_KEYS.STOCK_MOVEMENTS, [...movements, newMovement]);
          return newMovement;
        }
        try {
          const response = await fetch(`${API_URL}/stock-movements`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(movement),
          });
          if (!response.ok) throw new Error('Failed to create stock movement');
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
    },

    // --- ACCOUNTING (Journal Entries) ---
    accounting: {
      list: async (tenantId?: string): Promise<JournalEntry[]> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) return db.get(DB_KEYS.JOURNAL, [] as JournalEntry[]);
        try {
          const response = await fetch(`${API_URL}/finance/journal-entries?tenantId=${tenantId}`, {
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to fetch journal');
          return await response.json();
        } catch (e) {
          if (!USE_MOCK) throw e;
          return db.get(DB_KEYS.JOURNAL, [] as JournalEntry[]);
        }
      },
      create: async (entry: JournalEntry): Promise<JournalEntry> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const entries = db.get(DB_KEYS.JOURNAL, []);
          const newEntry = { ...entry, id: entry.id || `JRN-${Date.now()}` };
          db.set(DB_KEYS.JOURNAL, [...entries, newEntry]);
          return newEntry;
        }
        const response = await fetch(`${API_URL}/finance/journal-entries`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(entry),
        });
        if (!response.ok) throw new Error('Failed to create journal entry');
        return await response.json();
      },
      update: async (id: string, entry: Partial<JournalEntry>): Promise<JournalEntry> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const entries = db.get(DB_KEYS.JOURNAL, []);
          const updated = entries.map((e: JournalEntry) => (e.id === id ? { ...e, ...entry } : e));
          db.set(DB_KEYS.JOURNAL, updated);
          return updated.find((e: JournalEntry) => e.id === id);
        }
        const response = await fetch(`${API_URL}/finance/journal-entries/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(entry),
        });
        if (!response.ok) throw new Error('Failed to update journal entry');
        return await response.json();
      },
      delete: async (id: string): Promise<void> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const entries = db.get(DB_KEYS.JOURNAL, []);
          db.set(
            DB_KEYS.JOURNAL,
            entries.filter((e: JournalEntry) => e.id !== id)
          );
          return;
        }
        const response = await fetch(`${API_URL}/finance/journal-entries/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) throw new Error('Failed to delete journal entry');
      },
      /** Accounting period management */
      periods: {
        list: async (year?: number): Promise<AccountingPeriod[]> => {
          await sleep(NETWORK_DELAY);
          const y = year || new Date().getFullYear();
          if (USE_MOCK) return [];
          const response = await fetch(`${API_URL}/finance/accounting-periods?year=${y}`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch accounting periods');
          const data = await response.json();
          return data.periods || [];
        },
        manage: async (payload: {
          periodId: string;
          action: 'close' | 'lock' | 'reopen';
          reason?: string;
        }): Promise<AccountingPeriod> => {
          await sleep(NETWORK_DELAY);
          if (USE_MOCK) throw new Error('Period management not available in mock mode');
          const response = await fetch(`${API_URL}/finance/accounting-periods/manage`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || 'Failed to manage period');
          }
          const data = await response.json();
          return data.period;
        },
        validate: async (
          date: string
        ): Promise<{ status: string; canCreate: boolean; canEdit: boolean; canDelete: boolean; reason?: string }> => {
          await sleep(NETWORK_DELAY);
          if (USE_MOCK) return { status: 'OPEN', canCreate: true, canEdit: true, canDelete: true };
          const response = await fetch(`${API_URL}/finance/accounting-periods/validate?date=${date}`, {
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to validate period');
          return await response.json();
        },
      },

      /** Create a balanced journal entry (all lines in one backend call). Returns flat per-line entries. */
      createGrouped: async (payload: {
        date: string;
        description: string;
        reference?: string;
        journalCode?: string;
        lines: Array<{ account_code: string; debit: number; credit: number; description?: string }>;
      }): Promise<JournalEntry[]> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const entries = db.get(DB_KEYS.JOURNAL, [] as JournalEntry[]);
          const entryId = `JE-${Date.now()}`;
          const newEntries: JournalEntry[] = payload.lines
            .filter((l) => l.debit > 0 || l.credit > 0)
            .map((line, i) => ({
              id: `JRN-${Date.now()}-${i}`,
              entryId,
              date: payload.date,
              ref: payload.reference || '',
              label: line.description || payload.description,
              account: line.account_code,
              debit: line.debit,
              credit: line.credit,
              journalCode: (payload.journalCode || 'OD') as JournalEntry['journalCode'],
            }));
          db.set(DB_KEYS.JOURNAL, [...entries, ...newEntries]);
          return newEntries;
        }
        const response = await fetch(`${API_URL}/finance/journal-entries`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error('Failed to create journal entry');
        const data = await response.json();
        return (data.lines || []).map((line: any) => ({
          id: String(line.id),
          entryId: String(data.id),
          date: data.date,
          ref: data.reference || data.entry_number || '',
          label: line.description || data.description || '',
          account: line.account_code,
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0,
          journalCode: (payload.journalCode || 'OD') as JournalEntry['journalCode'],
          status: data.status,
        }));
      },
    },

    // --- CASH CLOSINGS ---
    cashClosings: {
      list: async (): Promise<any[]> => {
        if (USE_MOCK) return [];
        const response = await fetch(`${API_URL}/finance/cash-closings`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Failed to fetch cash closings');
        const data = await response.json();
        return data.map((c: any) => ({
          id: c.id,
          tenantId: c.tenant_id,
          date: c.date,
          openingBalance: parseFloat(c.opening_balance) || 0,
          closingBalance: parseFloat(c.closing_balance) || 0,
          theoreticalBalance: parseFloat(c.theoretical_balance) || 0,
          gap: parseFloat(c.gap) || 0,
          entriesCount: c.entries_count || 0,
          totalIn: parseFloat(c.total_in) || 0,
          totalOut: parseFloat(c.total_out) || 0,
          notes: c.notes || '',
          closedAt: c.closed_at,
          closedBy: c.closed_by,
        }));
      },
      create: async (data: {
        date: string;
        openingBalance: number;
        closingBalance: number;
        theoreticalBalance: number;
        gap: number;
        entriesCount: number;
        totalIn: number;
        totalOut: number;
        notes?: string;
      }): Promise<any> => {
        if (USE_MOCK) return { ...data, id: `CLOSE-${Date.now()}`, closedAt: new Date().toISOString() };
        const response = await fetch(`${API_URL}/finance/cash-closings`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Erreur lors de la clôture de caisse');
        }
        const c = await response.json();
        return {
          id: c.id,
          tenantId: c.tenant_id,
          date: c.date,
          openingBalance: parseFloat(c.opening_balance) || 0,
          closingBalance: parseFloat(c.closing_balance) || 0,
          theoreticalBalance: parseFloat(c.theoretical_balance) || 0,
          gap: parseFloat(c.gap) || 0,
          entriesCount: c.entries_count || 0,
          totalIn: parseFloat(c.total_in) || 0,
          totalOut: parseFloat(c.total_out) || 0,
          notes: c.notes || '',
          closedAt: c.closed_at,
          closedBy: c.closed_by,
        };
      },
    },

    // --- PAYMENTS ---
    payments: {
      list: async (tenantId?: string): Promise<Payment[]> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) return db.get(DB_KEYS.PAYMENTS, []);
        try {
          const response = await fetch(`${API_URL}/finance/payments?tenantId=${tenantId}`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch payments');
          const rows: any[] = await response.json();
          return rows.map((p: any) => ({
            id: p.id,
            tenantId: p.tenant_id,
            invoiceId: p.invoice_id,
            invoiceIds: p.invoice_id ? [p.invoice_id] : [],
            clientId: p.client_id || p.tier_id,
            date: p.payment_date || p.date,
            amount: parseFloat(p.amount || '0'),
            currency: p.currency || 'XOF',
            method: p.method || 'VIREMENT',
            reference: p.reference || p.payment_number,
            notes: p.notes,
            status: p.status || 'COMPLETED',
            type: p.type || 'INCOMING',
            allocations:
              p.allocations || (p.invoice_id ? [{ invoiceId: p.invoice_id, amount: parseFloat(p.amount || '0') }] : []),
            createdAt: p.created_at,
            recordedBy: p.recorded_by,
            invoiceNumber: p.invoice_number,
            invoiceAmount: parseFloat(p.invoice_amount || '0'),
          }));
        } catch (e) {
          if (!USE_MOCK) throw e;
          logger.warn('API Error (payments), falling back to mock data:', e);
          return db.get(DB_KEYS.PAYMENTS, []);
        }
      },
      create: async (payment: Payment): Promise<Payment> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const payments = db.get(DB_KEYS.PAYMENTS, []);
          const newPayment = { ...payment, id: payment.id || `PAY-${Date.now()}` };
          db.set(DB_KEYS.PAYMENTS, [...payments, newPayment]);
          return newPayment;
        }
        try {
          const allocations = payment.allocations || [];
          const baseBody = {
            date: payment.date,
            method: payment.method,
            reference: payment.reference,
            notes: payment.notes,
            payment_number: payment.reference || `PAY-${Date.now()}`,
            currency: payment.currency,
          };

          if (allocations.length > 1) {
            // Multi-invoice: one backend call per allocation
            let last: Payment = payment;
            for (const alloc of allocations) {
              const response = await fetch(`${API_URL}/finance/payments`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ ...baseBody, invoice_id: alloc.invoiceId, amount: alloc.amount }),
              });
              if (!response.ok) throw new Error('Failed to create payment');
              last = await response.json();
            }
            return last;
          }

          // Single invoice
          const invoiceId =
            allocations[0]?.invoiceId || payment.invoiceId || (payment as Payment & { invoice_id?: string }).invoice_id;
          const amount = allocations[0]?.amount ?? payment.amount;
          const response = await fetch(`${API_URL}/finance/payments`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ ...baseBody, invoice_id: invoiceId, amount }),
          });
          if (!response.ok) throw new Error('Failed to create payment');
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (id: string, payment: Partial<Payment>): Promise<Payment> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const payments = db.get(DB_KEYS.PAYMENTS, []);
          const updated = payments.map((p: Payment) => (p.id === id ? { ...p, ...payment } : p));
          db.set(DB_KEYS.PAYMENTS, updated);
          return updated.find((p: Payment) => p.id === id);
        }
        try {
          const response = await fetch(`${API_URL}/finance/payments/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(payment),
          });
          if (!response.ok) throw new Error('Failed to update payment');
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<void> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const payments = db.get(DB_KEYS.PAYMENTS, []);
          db.set(
            DB_KEYS.PAYMENTS,
            payments.filter((p: Payment) => p.id !== id)
          );
          return;
        }
        try {
          const response = await fetch(`${API_URL}/finance/payments/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to delete payment');
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      getPaymentHistory: async (
        invoiceId: string
      ): Promise<{ invoice: any; history: any[]; totalPaid: number; balance: number }> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const payments = db.get(DB_KEYS.PAYMENTS, []).filter((p: Payment) => p.invoiceId === invoiceId);
          const invoices = db.get(DB_KEYS.INVOICES, []);
          const invoice = invoices.find((i: any) => i.id === invoiceId);
          const totalPaid = payments.reduce((sum: number, p: Payment) => sum + (p.amount || 0), 0);
          return { invoice, history: payments, totalPaid, balance: (invoice?.amount || 0) - totalPaid };
        }
        try {
          const response = await fetch(`${API_URL}/finance/invoices/${invoiceId}/payment-history`, {
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to fetch payment history');
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
    },

    // --- SUPPLIER INVOICES ---
    supplierInvoices: {
      list: async (tenantId?: string): Promise<SupplierInvoice[]> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) return db.get(DB_KEYS.SUPPLIER_INVOICES, []);
        try {
          const response = await fetch(`${API_URL}/supplier-invoices?tenantId=${tenantId}`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch supplier invoices');
          const rows: any[] = await response.json();
          return rows.map(fromSupplierInvoiceRow);
        } catch (e) {
          if (!USE_MOCK) throw e;
          logger.warn('API Error (supplierInvoices), falling back to mock data:', e);
          return db.get(DB_KEYS.SUPPLIER_INVOICES, []);
        }
      },
      create: async (invoice: SupplierInvoice): Promise<SupplierInvoice> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const invoices = db.get(DB_KEYS.SUPPLIER_INVOICES, []);
          const newInvoice = { ...invoice, id: invoice.id || `SUP-INV-${Date.now()}` };
          db.set(DB_KEYS.SUPPLIER_INVOICES, [...invoices, newInvoice]);
          return newInvoice;
        }
        try {
          const response = await fetch(`${API_URL}/supplier-invoices`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(toSupplierInvoicePayload(invoice)),
          });
          if (!response.ok) throw new Error('Failed to create supplier invoice');
          return fromSupplierInvoiceRow(await response.json());
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (invoice: SupplierInvoice): Promise<SupplierInvoice> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const invoices = db.get(DB_KEYS.SUPPLIER_INVOICES, []);
          const updated = invoices.map((i: SupplierInvoice) => (i.id === invoice.id ? invoice : i));
          db.set(DB_KEYS.SUPPLIER_INVOICES, updated);
          return invoice;
        }
        try {
          const response = await fetch(`${API_URL}/supplier-invoices/${invoice.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(toSupplierInvoicePayload(invoice)),
          });
          if (!response.ok) throw new Error('Failed to update supplier invoice');
          return fromSupplierInvoiceRow(await response.json());
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<string> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const invoices = db.get(DB_KEYS.SUPPLIER_INVOICES, []);
          db.set(
            DB_KEYS.SUPPLIER_INVOICES,
            invoices.filter((i: SupplierInvoice) => i.id !== id)
          );
          return id;
        }
        try {
          const response = await fetch(`${API_URL}/supplier-invoices/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to delete supplier invoice');
          return id;
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
    },

    // --- BANK TRANSACTIONS ---
    bankTransactions: {
      list: async (tenantId?: string): Promise<BankTransaction[]> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) return db.get(DB_KEYS.BANK_TRANSACTIONS, []);
        try {
          const response = await fetch(`${API_URL}/bank-transactions?tenantId=${tenantId}`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch bank transactions');
          const rows: any[] = await response.json();
          return rows.map(fromBankTransactionRow);
        } catch (e) {
          if (!USE_MOCK) throw e;
          return db.get(DB_KEYS.BANK_TRANSACTIONS, []);
        }
      },
      create: async (tx: BankTransaction): Promise<BankTransaction> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const txs = db.get(DB_KEYS.BANK_TRANSACTIONS, []);
          const newTx = { ...tx, id: tx.id || `BTX-${Date.now()}` };
          db.set(DB_KEYS.BANK_TRANSACTIONS, [...txs, newTx]);
          return newTx;
        }
        try {
          const response = await fetch(`${API_URL}/bank-transactions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(toBankTransactionPayload(tx)),
          });
          if (!response.ok) throw new Error('Failed to create bank transaction');
          return fromBankTransactionRow(await response.json());
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (tx: BankTransaction): Promise<BankTransaction> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const txs = db.get(DB_KEYS.BANK_TRANSACTIONS, []);
          const updated = txs.map((t: BankTransaction) => (t.id === tx.id ? tx : t));
          db.set(DB_KEYS.BANK_TRANSACTIONS, updated);
          return tx;
        }
        try {
          const response = await fetch(`${API_URL}/bank-transactions/${tx.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(toBankTransactionPayload(tx)),
          });
          if (!response.ok) throw new Error('Failed to update bank transaction');
          return fromBankTransactionRow(await response.json());
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<string> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const txs = db.get(DB_KEYS.BANK_TRANSACTIONS, []);
          db.set(
            DB_KEYS.BANK_TRANSACTIONS,
            txs.filter((t: BankTransaction) => t.id !== id)
          );
          return id;
        }
        try {
          const response = await fetch(`${API_URL}/bank-transactions/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to delete bank transaction');
          return id;
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
    },

    // --- BUDGETS ---
    budgets: {
      list: async (tenantId?: string): Promise<Budget[]> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) return db.get(DB_KEYS.BUDGETS, []);
        try {
          const response = await fetch(`${API_URL}/budgets?tenantId=${tenantId}`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch budgets');
          return await response.json();
        } catch (e) {
          if (!USE_MOCK) throw e;
          return db.get(DB_KEYS.BUDGETS, []);
        }
      },
      create: async (budget: Budget): Promise<Budget> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const budgets = db.get(DB_KEYS.BUDGETS, []);
          const newBudget = { ...budget, id: budget.id || `BUD-${Date.now()}` };
          db.set(DB_KEYS.BUDGETS, [...budgets, newBudget]);
          return newBudget;
        }
        try {
          const response = await fetch(`${API_URL}/budgets`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(budget),
          });
          if (!response.ok) throw new Error('Failed to create budget');
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (budget: Budget): Promise<Budget> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const budgets = db.get(DB_KEYS.BUDGETS, []);
          const updated = budgets.map((b: Budget) => (b.id === budget.id ? budget : b));
          db.set(DB_KEYS.BUDGETS, updated);
          return budget;
        }
        try {
          const response = await fetch(`${API_URL}/budgets/${budget.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(budget),
          });
          if (!response.ok) throw new Error('Failed to update budget');
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<string> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const budgets = db.get(DB_KEYS.BUDGETS, []);
          db.set(
            DB_KEYS.BUDGETS,
            budgets.filter((b: Budget) => b.id !== id)
          );
          return id;
        }
        try {
          const response = await fetch(`${API_URL}/budgets/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to delete budget');
          return id;
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
    },

    // --- SUBSCRIPTIONS (SAAS ENGINE) ---
    subscriptions: {
      list: async (): Promise<Subscription[]> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) return db.get(DB_KEYS.SUBSCRIPTIONS, []);
        try {
          const response = await fetch(`${API_URL}/subscriptions`, { headers: getHeaders() });
          if (!response.ok) throw new Error('Failed to fetch subscriptions');
          return await response.json();
        } catch (e) {
          if (!USE_MOCK) throw e;
          logger.error(e);
          return db.get(DB_KEYS.SUBSCRIPTIONS, []);
        }
      },
      create: async (sub: Subscription): Promise<Subscription> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const subs = db.get(DB_KEYS.SUBSCRIPTIONS, []);
          const newSub = { ...sub, id: sub.id || `SUB-${Date.now()}` };
          db.set(DB_KEYS.SUBSCRIPTIONS, [...subs, newSub]);
          return newSub;
        }
        try {
          const response = await fetch(`${API_URL}/subscriptions`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(sub),
          });
          if (!response.ok) throw new Error('Failed to create subscription');
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      update: async (sub: Subscription): Promise<Subscription> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const subs = db.get(DB_KEYS.SUBSCRIPTIONS, []);
          const updated = subs.map((s: Subscription) => (s.id === sub.id ? sub : s));
          db.set(DB_KEYS.SUBSCRIPTIONS, updated);
          return sub;
        }
        try {
          const response = await fetch(`${API_URL}/subscriptions/${sub.id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(sub),
          });
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) handleAuthError(response);
            const body = await response.json().catch(() => ({}));
            throw new Error(body?.error || body?.message || `Erreur ${response.status}`);
          }
          return await response.json();
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      delete: async (id: string): Promise<string> => {
        await sleep(NETWORK_DELAY);
        if (USE_MOCK) {
          const subs = db.get(DB_KEYS.SUBSCRIPTIONS, []);
          db.set(
            DB_KEYS.SUBSCRIPTIONS,
            subs.filter((s: Subscription) => s.id !== id)
          );
          return id;
        }
        try {
          const response = await fetch(`${API_URL}/subscriptions/${id}`, {
            method: 'DELETE',
            headers: getHeaders(),
          });
          if (!response.ok) throw new Error('Failed to delete subscription');
          return id;
        } catch (e) {
          logger.error(e);
          throw e;
        }
      },
      suspend: async (id: string): Promise<Subscription> => {
        if (USE_MOCK) {
          const subs = db.get(DB_KEYS.SUBSCRIPTIONS, []);
          const updated = subs.map((s: Subscription) => (s.id === id ? { ...s, status: 'SUSPENDED' as const } : s));
          db.set(DB_KEYS.SUBSCRIPTIONS, updated);
          return updated.find((s: Subscription) => s.id === id) as Subscription;
        }
        const response = await fetch(`${API_URL}/subscriptions/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ status: 'SUSPENDED' }),
        });
        if (!response.ok) throw new Error('Erreur lors de la suspension');
        return response.json();
      },
      résilier: async (id: string, reason?: string): Promise<Subscription> => {
        if (USE_MOCK) {
          const subs = db.get(DB_KEYS.SUBSCRIPTIONS, []);
          const updated = subs.map((s: Subscription) => (s.id === id ? { ...s, status: 'CANCELED' as const } : s));
          db.set(DB_KEYS.SUBSCRIPTIONS, updated);
          return updated.find((s: Subscription) => s.id === id) as Subscription;
        }
        const response = await fetch(`${API_URL}/subscriptions/${id}/cancel`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ reason: reason || null }),
        });
        if (!response.ok) throw new Error('Erreur lors de la résiliation');
        return response.json();
      },
      generateInvoice: async (id: string, data: { billingDate: string; dueDate?: string | null }): Promise<unknown> => {
        const response = await fetch(`${API_URL}/subscriptions/${id}/generate-invoice`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error((body as { error?: string })?.error || `Erreur ${response.status}`);
        }
        return response.json();
      },
    },

    // --- FINANCE (NEW MODULES - REAL API) ---
    finance: {
      // Invoices
      getInvoices: async () => {
        const response = await fetch(`${API_URL}/finance/invoices`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Erreur lors du chargement des factures');
        return response.json();
      },
      createInvoice: async (invoice: any) => {
        const response = await fetch(`${API_URL}/finance/invoices`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(invoice),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la création de la facture');
        }
        return response.json();
      },
      updateInvoice: async (id: string, updates: any) => {
        const response = await fetch(`${API_URL}/finance/invoices/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la mise à jour de la facture');
        }
        return response.json();
      },
      deleteInvoice: async (id: string) => {
        const response = await fetch(`${API_URL}/finance/invoices/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la suppression de la facture');
        }
        return response.json();
      },

      // Expenses
      getExpenses: async () => {
        const response = await fetch(`${API_URL}/finance/expenses`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Erreur lors du chargement des dépenses');
        return response.json();
      },
      createExpense: async (expense: any) => {
        const response = await fetch(`${API_URL}/finance/expenses`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(expense),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la création de la dépense');
        }
        return response.json();
      },
      updateExpense: async (id: string, updates: any) => {
        const response = await fetch(`${API_URL}/finance/expenses/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la mise à jour de la dépense');
        }
        return response.json();
      },
      deleteExpense: async (id: string) => {
        const response = await fetch(`${API_URL}/finance/expenses/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la suppression de la dépense');
        }
        return response.json();
      },

      // Payments
      getPayments: async () => {
        const response = await fetch(`${API_URL}/finance/payments`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Erreur lors du chargement des paiements');
        return response.json();
      },
      createPayment: async (payment: any) => {
        const response = await fetch(`${API_URL}/finance/payments`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payment),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la création du paiement');
        }
        return response.json();
      },
      deletePayment: async (id: string) => {
        const response = await fetch(`${API_URL}/finance/payments/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la suppression du paiement');
        }
        return response.json();
      },

      // Quotes (Devis)
      getQuotes: async () => {
        const response = await fetch(`${API_URL}/finance/quotes`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Erreur lors du chargement des devis');
        return response.json();
      },
      createQuote: async (quote: any) => {
        const response = await fetch(`${API_URL}/finance/quotes`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(quote),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la création du devis');
        }
        return response.json();
      },
      updateQuote: async (id: string, updates: any) => {
        const response = await fetch(`${API_URL}/finance/quotes/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(updates),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la mise à jour du devis');
        }
        return response.json();
      },
      deleteQuote: async (id: string) => {
        const response = await fetch(`${API_URL}/finance/quotes/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la suppression du devis');
        }
        return response.json();
      },
      convertQuoteToInvoice: async (quoteId: string) => {
        const response = await fetch(`${API_URL}/finance/quotes/${quoteId}/convert`, {
          method: 'POST',
          headers: getHeaders(),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || 'Erreur lors de la conversion du devis');
        }
        return response.json();
      },

      // Journal Entries
      getJournalEntries: async () => {
        const response = await fetch(`${API_URL}/finance/journal-entries`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Erreur lors du chargement des écritures');
        return response.json();
      },
      createJournalEntry: async (entry: any) => {
        const response = await fetch(`${API_URL}/finance/journal-entries`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(entry),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || "Erreur lors de la création de l'écriture");
        }
        return response.json();
      },
      deleteJournalEntry: async (id: string) => {
        const response = await fetch(`${API_URL}/finance/journal-entries/${id}`, {
          method: 'DELETE',
          headers: getHeaders(),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || "Erreur lors de la suppression de l'écriture");
        }
        return response.json();
      },
      validateJournalEntry: async (id: string) => {
        const response = await fetch(`${API_URL}/finance/journal-entries/${id}/validate`, {
          method: 'POST',
          headers: getHeaders(),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error((err as { error?: string }).error || "Erreur lors de la validation de l'écriture");
        }
        return response.json();
      },

      // Config
      getConfig: async () => {
        const response = await fetch(`${API_URL}/finance/config`, { headers: getHeaders() });
        if (!response.ok) throw new Error('Erreur lors du chargement de la configuration');
        return response.json();
      },

      // Email
      sendInvoiceEmail: async (
        invoiceId: string,
        data: { to: string; cc?: string; subject: string; message: string }
      ) => {
        const response = await fetch(`${API_URL}/finance/invoices/${invoiceId}/send`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Erreur lors de l'envoi");
        }
        return response.json();
      },

      sendQuoteEmail: async (quoteId: string, data: { to: string; cc?: string; subject: string; message: string }) => {
        const response = await fetch(`${API_URL}/finance/quotes/${quoteId}/send`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Erreur lors de l'envoi");
        }
        return response.json();
      },

      // Credit Notes (Avoirs)
      createCreditNote: async (data: any) => {
        const response = await fetch(`${API_URL}/credit-notes`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(data),
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Erreur lors de la création');
        }
        return response.json();
      },
    },
  };
}
