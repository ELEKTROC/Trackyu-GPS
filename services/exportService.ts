/**
 * Service centralisé pour les exports (CSV, Excel, PDF)
 * Unifie les exports à travers toute l'application
 */

// Types
export interface ExportColumn {
  key: string;
  header: string;
  width?: number; // Pour Excel
  format?: 'text' | 'number' | 'date' | 'currency';
}

export interface ExportConfig {
  filename: string;
  title?: string;
  columns: ExportColumn[];
  sheetName?: string; // Pour Excel multi-feuilles
}

export interface CSVExportOptions {
  delimiter?: ',' | ';' | '\t';
  includeHeaders?: boolean;
  addBOM?: boolean; // Pour UTF-8 dans Excel FR
}

export interface ExcelExportOptions {
  headerStyle?: {
    backgroundColor?: string;
    fontColor?: string;
    bold?: boolean;
  };
}

// Constantes
const UTF8_BOM = '\uFEFF';
const DEFAULT_CSV_OPTIONS: CSVExportOptions = {
  delimiter: ';', // Point-virgule pour Excel FR
  includeHeaders: true,
  addBOM: true,
};

/**
 * Formate une valeur pour CSV
 */
const formatCSVValue = (value: any, column: ExportColumn): string => {
  if (value === null || value === undefined) return '';
  
  switch (column.format) {
    case 'date':
      if (value instanceof Date) return value.toLocaleDateString('fr-FR');
      if (typeof value === 'string') return new Date(value).toLocaleDateString('fr-FR');
      return String(value);
      
    case 'currency':
      const num = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(num) ? '0' : num.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      
    case 'number':
      const n = typeof value === 'number' ? value : parseFloat(value);
      return isNaN(n) ? '0' : n.toLocaleString('fr-FR');
      
    default:
      // Escape double quotes and wrap in quotes if contains delimiter or quotes
      const str = String(value).replace(/"/g, '""');
      if (str.includes(',') || str.includes(';') || str.includes('\n') || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
  }
};

/**
 * Export vers CSV avec support UTF-8 et Excel FR
 */
export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  config: ExportConfig,
  options: CSVExportOptions = {}
): void => {
  const opts = { ...DEFAULT_CSV_OPTIONS, ...options };
  
  let csvContent = opts.addBOM ? UTF8_BOM : '';
  
  // Headers
  if (opts.includeHeaders) {
    csvContent += config.columns.map(col => col.header).join(opts.delimiter) + '\n';
  }
  
  // Data rows
  data.forEach(row => {
    const values = config.columns.map(col => formatCSVValue(row[col.key], col));
    csvContent += values.join(opts.delimiter) + '\n';
  });
  
  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${config.filename}.csv`);
};

/**
 * Export vers Excel (TSV compatible ou vrai XLSX si xlsx installé)
 */
export const exportToExcel = <T extends Record<string, any>>(
  data: T[],
  config: ExportConfig,
  options: ExcelExportOptions = {}
): void => {
  // Version TSV (compatible Excel nativement)
  // Pour un vrai XLSX, installer: npm install xlsx
  
  let content = UTF8_BOM;
  
  // Headers
  content += config.columns.map(col => col.header).join('\t') + '\n';
  
  // Data
  data.forEach(row => {
    const values = config.columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '';
      
      // Format dates
      if (col.format === 'date' && value) {
        const date = new Date(value);
        return date.toLocaleDateString('fr-FR');
      }
      
      // Format numbers
      if (col.format === 'currency' || col.format === 'number') {
        const num = typeof value === 'number' ? value : parseFloat(value);
        return isNaN(num) ? '0' : num.toString();
      }
      
      // Escape tabs and newlines
      return String(value).replace(/\t/g, ' ').replace(/\n/g, ' ');
    });
    content += values.join('\t') + '\n';
  });
  
  const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  downloadBlob(blob, `${config.filename}.xls`);
};

/**
 * Export multi-format avec sélection
 */
export const exportData = <T extends Record<string, any>>(
  data: T[],
  config: ExportConfig,
  format: 'csv' | 'excel' | 'json'
): void => {
  switch (format) {
    case 'csv':
      exportToCSV(data, config);
      break;
    case 'excel':
      exportToExcel(data, config);
      break;
    case 'json':
      exportToJSON(data, config);
      break;
  }
};

/**
 * Export vers JSON (pour backup ou API)
 */
export const exportToJSON = <T extends Record<string, any>>(
  data: T[],
  config: ExportConfig
): void => {
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  downloadBlob(blob, `${config.filename}.json`);
};

/**
 * Télécharge un Blob en fichier
 */
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Génère un template CSV pour import
 */
export const generateImportTemplate = (
  columns: ExportColumn[],
  sampleData: Record<string, any>[] = []
): void => {
  const csvContent = UTF8_BOM + 
    columns.map(c => c.header).join(';') + '\n' +
    sampleData.map(row => 
      columns.map(col => formatCSVValue(row[col.key], col)).join(';')
    ).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, 'template_import.csv');
};

// ============================================
// CONFIGURATIONS PRÉ-DÉFINIES PAR MODULE
// ============================================

/**
 * Configuration export Véhicules
 */
export const VEHICLE_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'name', header: 'Immatriculation', format: 'text' },
  { key: 'type', header: 'Type', format: 'text' },
  { key: 'brand', header: 'Marque', format: 'text' },
  { key: 'model', header: 'Modèle', format: 'text' },
  { key: 'status', header: 'Statut', format: 'text' },
  { key: 'fuel', header: 'Carburant', format: 'text' },
  { key: 'mileage', header: 'Kilométrage', format: 'number' },
  { key: 'driver', header: 'Conducteur', format: 'text' },
  { key: 'clientName', header: 'Client', format: 'text' },
];

/**
 * Configuration export Interventions
 */
export const INTERVENTION_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'id', header: 'N° Intervention', format: 'text' },
  { key: 'vehicleName', header: 'Véhicule', format: 'text' },
  { key: 'type', header: 'Type', format: 'text' },
  { key: 'status', header: 'Statut', format: 'text' },
  { key: 'techName', header: 'Technicien', format: 'text' },
  { key: 'createdAt', header: 'Date Création', format: 'date' },
  { key: 'completedAt', header: 'Date Clôture', format: 'date' },
  { key: 'priority', header: 'Priorité', format: 'text' },
];

/**
 * Configuration export Factures
 */
export const INVOICE_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'number', header: 'N° Facture', format: 'text' },
  { key: 'clientName', header: 'Client', format: 'text' },
  { key: 'date', header: 'Date', format: 'date' },
  { key: 'dueDate', header: 'Échéance', format: 'date' },
  { key: 'amountHT', header: 'Montant HT', format: 'currency' },
  { key: 'amountTVA', header: 'TVA', format: 'currency' },
  { key: 'amount', header: 'Montant TTC', format: 'currency' },
  { key: 'status', header: 'Statut', format: 'text' },
];

/**
 * Configuration export Paiements
 */
export const PAYMENT_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'reference', header: 'Référence', format: 'text' },
  { key: 'date', header: 'Date', format: 'date' },
  { key: 'clientName', header: 'Client', format: 'text' },
  { key: 'method', header: 'Méthode', format: 'text' },
  { key: 'amount', header: 'Montant', format: 'currency' },
  { key: 'status', header: 'Statut', format: 'text' },
];

/**
 * Configuration export Tickets Support
 */
export const TICKET_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'id', header: 'N° Ticket', format: 'text' },
  { key: 'subject', header: 'Sujet', format: 'text' },
  { key: 'category', header: 'Catégorie', format: 'text' },
  { key: 'priority', header: 'Priorité', format: 'text' },
  { key: 'status', header: 'Statut', format: 'text' },
  { key: 'clientName', header: 'Client', format: 'text' },
  { key: 'createdAt', header: 'Date Création', format: 'date' },
  { key: 'resolvedAt', header: 'Date Résolution', format: 'date' },
];

/**
 * Configuration export Stock
 */
export const STOCK_EXPORT_COLUMNS: ExportColumn[] = [
  { key: 'sku', header: 'SKU', format: 'text' },
  { key: 'name', header: 'Article', format: 'text' },
  { key: 'category', header: 'Catégorie', format: 'text' },
  { key: 'quantity', header: 'Quantité', format: 'number' },
  { key: 'minQuantity', header: 'Stock Min', format: 'number' },
  { key: 'unitPrice', header: 'Prix Unitaire', format: 'currency' },
  { key: 'location', header: 'Emplacement', format: 'text' },
];

/**
 * Export simplifié pour les rapports (colonnes string[], data string[][])
 * Utilisé par le module Rapports
 */
export const exportReportData = (
  columns: string[],
  data: string[][],
  filename: string,
  format: 'csv' | 'excel'
): void => {
  // Convertir en format compatible avec exportData
  const exportColumns: ExportColumn[] = columns.map((col, idx) => ({
    key: `col_${idx}`,
    header: col,
    format: 'text' as const,
  }));

  const exportData = data.map(row => {
    const obj: Record<string, string> = {};
    columns.forEach((_, idx) => {
      obj[`col_${idx}`] = row[idx] || '';
    });
    return obj;
  });

  const config: ExportConfig = {
    filename,
    columns: exportColumns,
  };

  if (format === 'csv') {
    exportToCSV(exportData, config);
  } else {
    exportToExcel(exportData, config);
  }
};

export default {
  exportToCSV,
  exportToExcel,
  exportToJSON,
  exportData,
  exportReportData,
  generateImportTemplate,
  // Pre-defined column configs
  VEHICLE_EXPORT_COLUMNS,
  INTERVENTION_EXPORT_COLUMNS,
  INVOICE_EXPORT_COLUMNS,
  PAYMENT_EXPORT_COLUMNS,
  TICKET_EXPORT_COLUMNS,
  STOCK_EXPORT_COLUMNS,
};
