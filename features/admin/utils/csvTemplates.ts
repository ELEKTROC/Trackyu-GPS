/**
 * CSV Templates for Data Migration
 * Provides downloadable CSV templates for importing data from various sources
 */

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================

export interface CSVTemplate {
  id: string;
  name: string;
  description: string;
  source: 'TRAKZEE' | 'ZOHO_BOOKS' | 'ZOHO_INVOICE' | 'GENERIC';
  dataType: string;
  headers: string[];
  sampleData: string[][];
  instructions: string[];
}

export const CSV_TEMPLATES: CSVTemplate[] = [
  // ============================================================================
  // TRAKZEE TEMPLATES
  // ============================================================================
  {
    id: 'trakzee_clients',
    name: 'Clients TRAKZEE',
    description: 'Import des clients depuis TRAKZEE',
    source: 'TRAKZEE',
    dataType: 'CLIENTS',
    headers: [
      'client_id',
      'client_name',
      'client_code',
      'contact_person',
      'email',
      'phone',
      'mobile',
      'address',
      'city',
      'country',
      'status',
      'vehicle_count',
      'subscription_type',
      'subscription_expiry'
    ],
    sampleData: [
      ['CLT001', 'TRANSPORT ABIDJAN SA', 'TA001', 'Kouassi Jean', 'contact@transport-abidjan.ci', '+225 07 00 00 01', '+225 05 00 00 01', 'Zone Industrielle Yopougon', 'Abidjan', 'Côte d\'Ivoire', 'active', '15', 'Premium', '2025-12-31'],
      ['CLT002', 'LOGISTIQUE EXPRESS', 'LE002', 'Traoré Marie', 'info@logistique-express.ci', '+225 07 00 00 02', '+225 05 00 00 02', 'Plateau, Rue du Commerce', 'Abidjan', 'Côte d\'Ivoire', 'active', '8', 'Standard', '2025-06-30'],
      ['CLT003', 'DISTRIBUTION COTE D\'IVOIRE', 'DCI003', 'Koné Ibrahim', 'ibrahim@dci.ci', '+225 07 00 00 03', '', 'Boulevard Houphouët-Boigny', 'Bouaké', 'Côte d\'Ivoire', 'active', '12', 'Premium', '2025-09-15'],
    ],
    instructions: [
      'client_id: Identifiant unique du client dans TRAKZEE',
      'client_name: Nom complet du client/entreprise',
      'client_code: Code court pour identification rapide',
      'status: "active", "inactive" ou "suspended"',
      'subscription_type: Type d\'abonnement (Standard, Premium, Enterprise)',
      'subscription_expiry: Date d\'expiration au format YYYY-MM-DD'
    ]
  },
  {
    id: 'trakzee_vehicles',
    name: 'Véhicules TRAKZEE',
    description: 'Import des véhicules depuis TRAKZEE',
    source: 'TRAKZEE',
    dataType: 'VEHICLES',
    headers: [
      'vehicle_id',
      'vehicle_name',
      'plate_number',
      'vehicle_type',
      'device_imei',
      'sim_number',
      'client_id',
      'client_name',
      'driver_id',
      'driver_name',
      'fuel_capacity',
      'odometer',
      'status'
    ],
    sampleData: [
      ['VEH001', 'Camion 01', 'CI-1234-AB', 'truck', '123456789012345', '+225 01 00 00 01', 'CLT001', 'TRANSPORT ABIDJAN SA', 'DRV001', 'Diallo Moussa', '200', '45000', 'active'],
      ['VEH002', 'Pickup 02', 'CI-5678-CD', 'car', '123456789012346', '+225 01 00 00 02', 'CLT001', 'TRANSPORT ABIDJAN SA', 'DRV002', 'Bamba Sita', '65', '32000', 'active'],
      ['VEH003', 'Moto 01', 'CI-9012-EF', 'motorcycle', '123456789012347', '+225 01 00 00 03', 'CLT002', 'LOGISTIQUE EXPRESS', '', '', '15', '12000', 'active'],
    ],
    instructions: [
      'vehicle_id: Identifiant unique du véhicule',
      'plate_number: Numéro d\'immatriculation',
      'vehicle_type: car, truck, motorcycle, bus, trailer, other',
      'device_imei: IMEI du traceur GPS (15 chiffres)',
      'sim_number: Numéro de la carte SIM du traceur',
      'fuel_capacity: Capacité du réservoir en litres',
      'odometer: Kilométrage actuel'
    ]
  },
  {
    id: 'trakzee_drivers',
    name: 'Conducteurs TRAKZEE',
    description: 'Import des conducteurs depuis TRAKZEE',
    source: 'TRAKZEE',
    dataType: 'DRIVERS',
    headers: [
      'driver_id',
      'driver_name',
      'driver_code',
      'license_number',
      'license_expiry',
      'phone',
      'email',
      'client_id',
      'client_name',
      'assigned_vehicle_id',
      'status'
    ],
    sampleData: [
      ['DRV001', 'Diallo Moussa', 'DM001', 'CI-P-123456', '2026-03-15', '+225 07 11 11 11', 'diallo.moussa@email.ci', 'CLT001', 'TRANSPORT ABIDJAN SA', 'VEH001', 'active'],
      ['DRV002', 'Bamba Sita', 'BS002', 'CI-P-234567', '2025-08-20', '+225 07 22 22 22', 'bamba.sita@email.ci', 'CLT001', 'TRANSPORT ABIDJAN SA', 'VEH002', 'active'],
      ['DRV003', 'Touré Aminata', 'TA003', 'CI-P-345678', '2025-12-01', '+225 07 33 33 33', '', 'CLT002', 'LOGISTIQUE EXPRESS', '', 'active'],
    ],
    instructions: [
      'driver_id: Identifiant unique du conducteur',
      'license_number: Numéro du permis de conduire',
      'license_expiry: Date d\'expiration du permis (YYYY-MM-DD)',
      'assigned_vehicle_id: ID du véhicule assigné (optionnel)',
      'status: "active" ou "inactive"'
    ]
  },

  // ============================================================================
  // ZOHO BOOKS TEMPLATES (ABIDJAN GPS)
  // ============================================================================
  {
    id: 'zoho_books_contacts',
    name: 'Contacts Zoho Books',
    description: 'Import des contacts/clients depuis Zoho Books (ABIDJAN GPS)',
    source: 'ZOHO_BOOKS',
    dataType: 'CLIENTS',
    headers: [
      'contact_id',
      'contact_name',
      'company_name',
      'contact_type',
      'email',
      'phone',
      'mobile',
      'billing_address',
      'billing_city',
      'billing_country',
      'outstanding_receivable',
      'status',
      'created_time'
    ],
    sampleData: [
      ['1234567890001', 'TRANSPORT ABIDJAN SA', 'TRANSPORT ABIDJAN SA', 'customer', 'comptabilite@transport-abidjan.ci', '+225 27 20 00 01', '+225 07 00 00 01', 'Zone Industrielle Yopougon', 'Abidjan', 'Côte d\'Ivoire', '1500000', 'active', '2023-01-15'],
      ['1234567890002', 'LOGISTIQUE EXPRESS SARL', 'LOGISTIQUE EXPRESS', 'customer', 'finance@logistique-express.ci', '+225 27 20 00 02', '+225 07 00 00 02', 'Plateau, Immeuble CCIA', 'Abidjan', 'Côte d\'Ivoire', '850000', 'active', '2023-03-22'],
      ['1234567890003', 'DISTRIBUTION CI', 'DISTRIBUTION COTE D\'IVOIRE', 'customer', 'dci.finance@dci.ci', '+225 27 20 00 03', '+225 07 00 00 03', 'Avenue Houphouët-Boigny', 'Bouaké', 'Côte d\'Ivoire', '0', 'active', '2023-06-10'],
    ],
    instructions: [
      'contact_id: ID Zoho du contact',
      'contact_type: "customer" pour les clients',
      'outstanding_receivable: Montant dû en FCFA',
      'Notez les différences de noms entre Zoho et TRAKZEE',
      'Le rapprochement sera fait par email ou téléphone si les noms diffèrent'
    ]
  },
  {
    id: 'zoho_books_estimates',
    name: 'Devis Zoho Books',
    description: 'Import des devis depuis Zoho Books (ABIDJAN GPS)',
    source: 'ZOHO_BOOKS',
    dataType: 'ESTIMATES',
    headers: [
      'estimate_id',
      'estimate_number',
      'customer_id',
      'customer_name',
      'date',
      'expiry_date',
      'status',
      'sub_total',
      'tax_total',
      'total',
      'currency_code',
      'notes'
    ],
    sampleData: [
      ['EST001', 'DEV-2024-0001', '1234567890001', 'TRANSPORT ABIDJAN SA', '2024-12-01', '2024-12-31', 'sent', '2500000', '450000', '2950000', 'XOF', 'Installation 5 traceurs GPS'],
      ['EST002', 'DEV-2024-0002', '1234567890002', 'LOGISTIQUE EXPRESS SARL', '2024-12-05', '2025-01-05', 'draft', '1800000', '324000', '2124000', 'XOF', 'Renouvellement abonnement annuel'],
      ['EST003', 'DEV-2024-0003', '1234567890003', 'DISTRIBUTION CI', '2024-12-10', '2025-01-10', 'accepted', '3200000', '576000', '3776000', 'XOF', 'Nouveau contrat 10 véhicules'],
    ],
    instructions: [
      'estimate_number: Numéro du devis',
      'customer_id: ID du client Zoho (doit correspondre à un contact existant)',
      'status: draft, sent, accepted, declined, invoiced, expired',
      'Les montants sont en FCFA (XOF)',
      'tax_total: TVA à 18%'
    ]
  },
  {
    id: 'zoho_books_items',
    name: 'Articles Zoho Books',
    description: 'Import des articles/produits depuis Zoho Books (ABIDJAN GPS)',
    source: 'ZOHO_BOOKS',
    dataType: 'ITEMS',
    headers: [
      'item_id',
      'name',
      'description',
      'sku',
      'rate',
      'unit',
      'product_type',
      'is_taxable',
      'tax_percentage',
      'purchase_rate',
      'status'
    ],
    sampleData: [
      ['ITEM001', 'Traceur GPS GT06N', 'Traceur GPS véhicule avec antenne externe', 'GPS-GT06N', '45000', 'pièce', 'goods', 'true', '18', '25000', 'active'],
      ['ITEM002', 'Abonnement Mensuel Standard', 'Abonnement tracking GPS mensuel - 1 véhicule', 'ABO-STD-M', '15000', 'mois', 'service', 'true', '18', '0', 'active'],
      ['ITEM003', 'Abonnement Annuel Premium', 'Abonnement tracking GPS annuel premium - 1 véhicule', 'ABO-PREM-A', '150000', 'an', 'service', 'true', '18', '0', 'active'],
      ['ITEM004', 'Installation Traceur', 'Main d\'oeuvre installation traceur GPS', 'INST-GPS', '25000', 'prestation', 'service', 'true', '18', '0', 'active'],
      ['ITEM005', 'Carte SIM M2M', 'Carte SIM machine-to-machine pour traceur', 'SIM-M2M', '5000', 'pièce', 'goods', 'true', '18', '2500', 'active'],
    ],
    instructions: [
      'sku: Code article unique',
      'rate: Prix de vente HT en FCFA',
      'purchase_rate: Prix d\'achat (pour les produits)',
      'product_type: "goods" pour produits, "service" pour services',
      'is_taxable: "true" ou "false"',
      'tax_percentage: Taux de TVA (18% en CI)'
    ]
  },

  // ============================================================================
  // ZOHO INVOICE TEMPLATES (SMARTRACK SOLUTIONS)
  // ============================================================================
  {
    id: 'zoho_invoice_contacts',
    name: 'Contacts Zoho Invoice',
    description: 'Import des contacts/clients depuis Zoho Invoice (SMARTRACK SOLUTIONS)',
    source: 'ZOHO_INVOICE',
    dataType: 'CLIENTS',
    headers: [
      'contact_id',
      'contact_name',
      'company_name',
      'email',
      'phone',
      'mobile',
      'billing_address',
      'billing_city',
      'billing_country',
      'outstanding',
      'status'
    ],
    sampleData: [
      ['ZI001', 'KOUAME ENTERPRISE', 'KOUAME ENTERPRISE SARL', 'kouame@enterprise.ci', '+225 27 21 00 01', '+225 05 00 00 01', 'Cocody, Rue des Jardins', 'Abidjan', 'Côte d\'Ivoire', '750000', 'active'],
      ['ZI002', 'GOLDEN TRANSPORT', 'GOLDEN TRANSPORT SA', 'info@golden-transport.ci', '+225 27 21 00 02', '+225 05 00 00 02', 'Marcory, Zone 4', 'Abidjan', 'Côte d\'Ivoire', '1200000', 'active'],
      ['ZI003', 'RAPIDE LIVRAISON', 'RAPIDE LIVRAISON', 'contact@rapide-liv.ci', '+225 27 21 00 03', '+225 05 00 00 03', 'Treichville', 'Abidjan', 'Côte d\'Ivoire', '0', 'active'],
    ],
    instructions: [
      'contact_id: ID Zoho Invoice du contact',
      'outstanding: Montant impayé en FCFA',
      'Ces clients sont gérés par SMARTRACK SOLUTIONS',
      'Certains peuvent aussi exister dans TRAKZEE ou Zoho Books'
    ]
  },
  {
    id: 'zoho_invoice_payments',
    name: 'Paiements Zoho Invoice',
    description: 'Import des paiements depuis Zoho Invoice (SMARTRACK SOLUTIONS)',
    source: 'ZOHO_INVOICE',
    dataType: 'PAYMENTS',
    headers: [
      'payment_id',
      'payment_number',
      'customer_id',
      'customer_name',
      'invoice_id',
      'invoice_number',
      'date',
      'amount',
      'payment_mode',
      'reference_number',
      'description'
    ],
    sampleData: [
      ['PAY001', 'PMT-2024-001', 'ZI001', 'KOUAME ENTERPRISE', 'INV001', 'FAC-2024-0001', '2024-12-15', '500000', 'bank_transfer', 'VIR-12345', 'Règlement facture décembre'],
      ['PAY002', 'PMT-2024-002', 'ZI002', 'GOLDEN TRANSPORT', 'INV002', 'FAC-2024-0002', '2024-12-18', '350000', 'mobile_money', 'OM-67890', 'Acompte sur facture'],
      ['PAY003', 'PMT-2024-003', 'ZI003', 'RAPIDE LIVRAISON', 'INV003', 'FAC-2024-0003', '2024-12-20', '1200000', 'check', 'CHQ-11111', 'Règlement intégral'],
    ],
    instructions: [
      'payment_mode: bank_transfer, mobile_money, cash, check, card',
      'reference_number: Référence du virement/chèque/transaction',
      'amount: Montant en FCFA',
      'invoice_id: ID de la facture concernée (optionnel pour acomptes)'
    ]
  },
  {
    id: 'zoho_invoice_expenses',
    name: 'Dépenses Zoho Invoice',
    description: 'Import des dépenses depuis Zoho Invoice (SMARTRACK SOLUTIONS)',
    source: 'ZOHO_INVOICE',
    dataType: 'EXPENSES',
    headers: [
      'expense_id',
      'date',
      'account_name',
      'vendor_name',
      'amount',
      'tax_amount',
      'total',
      'is_billable',
      'customer_id',
      'customer_name',
      'description',
      'reference_number'
    ],
    sampleData: [
      ['EXP001', '2024-12-01', 'Achats Matériel', 'GPS WORLD SUPPLIER', '250000', '45000', '295000', 'false', '', '', 'Achat lot traceurs GT06N', 'PO-2024-001'],
      ['EXP002', '2024-12-05', 'Frais Installation', 'TECH INSTALL CI', '150000', '27000', '177000', 'true', 'ZI001', 'KOUAME ENTERPRISE', 'Installation 5 traceurs', 'FAC-TECH-123'],
      ['EXP003', '2024-12-10', 'Cartes SIM', 'ORANGE CI', '50000', '9000', '59000', 'false', '', '', 'Recharge forfait SIM M2M', 'FAC-OR-456'],
    ],
    instructions: [
      'account_name: Catégorie de dépense',
      'vendor_name: Nom du fournisseur',
      'is_billable: "true" si refacturable au client',
      'customer_id/customer_name: Renseigner si la dépense est refacturable',
      'Les montants incluent la TVA quand applicable'
    ]
  }
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate CSV content from template
 */
export const generateCSVContent = (template: CSVTemplate, includeInstructions = true): string => {
  const lines: string[] = [];
  
  // Add instructions as comments if requested
  if (includeInstructions) {
    lines.push(`# Template: ${template.name}`);
    lines.push(`# Description: ${template.description}`);
    lines.push(`# Source: ${template.source}`);
    lines.push('#');
    lines.push('# Instructions:');
    template.instructions.forEach(instr => {
      lines.push(`# - ${instr}`);
    });
    lines.push('#');
    lines.push('# Les lignes commençant par # seront ignorées lors de l\'import');
    lines.push('#');
  }
  
  // Add headers
  lines.push(template.headers.join(','));
  
  // Add sample data
  template.sampleData.forEach(row => {
    lines.push(row.map(cell => {
      // Escape cells containing commas or quotes
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(','));
  });
  
  return lines.join('\n');
};

/**
 * Download template as CSV file
 */
export const downloadTemplate = (templateId: string): void => {
  const template = CSV_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    return;
  }
  
  const content = generateCSVContent(template);
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.id}_template.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Download all templates as a ZIP (simplified: downloads as individual files)
 */
export const downloadAllTemplates = (source?: 'TRAKZEE' | 'ZOHO_BOOKS' | 'ZOHO_INVOICE'): void => {
  const templates = source 
    ? CSV_TEMPLATES.filter(t => t.source === source)
    : CSV_TEMPLATES;
  
  templates.forEach((template, index) => {
    setTimeout(() => downloadTemplate(template.id), index * 500);
  });
};

/**
 * Get templates by source
 */
export const getTemplatesBySource = (source: 'TRAKZEE' | 'ZOHO_BOOKS' | 'ZOHO_INVOICE' | 'GENERIC'): CSVTemplate[] => {
  return CSV_TEMPLATES.filter(t => t.source === source);
};

/**
 * Get template by data type
 */
export const getTemplateByDataType = (source: string, dataType: string): CSVTemplate | undefined => {
  return CSV_TEMPLATES.find(t => t.source === source && t.dataType === dataType);
};

export default CSV_TEMPLATES;
