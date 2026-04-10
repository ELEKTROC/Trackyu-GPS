import type jsPDF from 'jspdf';
import { loadPDFLibraries } from './pdfLoader';
import { numberToWords } from '../utils/numberToWords';
import { logger } from '../utils/logger';

// ============================================
// TYPES
// ============================================

export interface TenantBranding {
  name: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string; // Base64 encoded image
  primaryColor?: [number, number, number];
  secondaryColor?: [number, number, number];
  footer?: string; // Mentions légales
  siret?: string;
  tva?: string;
  bankDetails?: string;
}

export interface PDFDocumentOptions {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter';
  branding?: TenantBranding;
  showFooter?: boolean;
  showPageNumbers?: boolean;
  type?: PDFDocumentType;
}

export type PDFDocumentType =
  | 'invoice'
  | 'quote'
  | 'receipt'
  | 'intervention'
  | 'report'
  | 'contract'
  | 'generic';

export interface InvoiceData {
  number: string;
  date: string;
  dueDate: string;
  clientId?: string;
  currency?: string; // ISO 4217 code (XOF, EUR, USD, etc.)
  client: {
    name: string;
    address?: string;
    city?: string;
    email?: string;
    phone?: string;
  };
  items: {
    description: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  discount?: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  status?: string;
  notes?: string;
  paymentTerms?: string;
  generalConditions?: string;
  resellerName?: string;
  meta?: {
    licensePlate?: string;
    contractId?: string;
    orderNumber?: string;
    paymentMethod?: string;
  };
}

export interface InterventionData {
  id: string;
  date: string;
  vehicle: {
    plate: string;
    brand?: string;
    model?: string;
    client?: string;
    mileage?: string;
    type?: string;
  };
  technician: {
    name: string;
    phone?: string;
  };
  client?: {
    name: string;
    phone?: string;
    location?: string;
  };
  type: string;
  nature?: string;
  ticketId?: string;
  description: string;
  actions?: string[];
  partsUsed?: { name: string; quantity: number }[];
  duration?: string;
  signatureTech?: string; // Base64 image
  signatureClient?: string; // Base64 image
  notes?: string;
  status: string;
  // Nouveaux champs pour différencier Bon vs Rapport
  documentType?: 'BON' | 'RAPPORT';
  checklist?: { label: string; checked?: boolean }[];
  testResults?: string;
  imei?: string;
  simCard?: string;
  observations?: string;
}

// ============================================
// COULEURS ET STYLES
// ============================================

const DEFAULT_BRANDING: TenantBranding = {
  name: "",
  address: "",
  city: "Abidjan, Côte d'Ivoire",
  phone: "",
  email: "",
  website: "",
  primaryColor: [51, 51, 51], // Neutral dark
  secondaryColor: [100, 116, 139], // Slate-500
  footer: "",
  bankDetails: "",
};

const COLORS = {
  primary: [51, 51, 51] as [number, number, number],       // Dark charcoal (neutral)
  secondary: [100, 116, 139] as [number, number, number],  // Slate-500
  text: [30, 41, 59] as [number, number, number],           // Slate-800
  textLight: [148, 163, 184] as [number, number, number],   // Slate-400
  light: [241, 245, 249] as [number, number, number],       // Slate-100
  white: [255, 255, 255] as [number, number, number],
  success: [150, 150, 150] as [number, number, number],     // Neutral gray (watermark)
  warning: [150, 150, 150] as [number, number, number],     // Neutral gray (watermark)
  error: [150, 150, 150] as [number, number, number],       // Neutral gray (watermark)
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

// Multi-currency formatting
interface CurrencyMeta { symbol: string; decimals: number; locale: string; position: 'prefix' | 'suffix'; }
const CURRENCY_META: Record<string, CurrencyMeta> = {
  XOF: { symbol: 'FCFA', decimals: 0, locale: 'fr-FR', position: 'suffix' },
  XAF: { symbol: 'FCFA', decimals: 0, locale: 'fr-FR', position: 'suffix' },
  EUR: { symbol: '€', decimals: 2, locale: 'fr-FR', position: 'suffix' },
  USD: { symbol: '$', decimals: 2, locale: 'en-US', position: 'prefix' },
  MAD: { symbol: 'DH', decimals: 2, locale: 'fr-FR', position: 'suffix' },
  GNF: { symbol: 'GNF', decimals: 0, locale: 'fr-FR', position: 'suffix' },
};

const formatCurrency = (amount: number, currencyCode: string = 'XOF'): string => {
  const meta = CURRENCY_META[currencyCode] || CURRENCY_META['XOF'];
  // Use manual formatting to avoid Unicode separators (\u202f, \u00a0) that jsPDF can't render
  const sign = amount < 0 ? '-' : '';
  const parts = Math.abs(amount).toFixed(meta.decimals).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const number = meta.decimals > 0 ? parts.join(',') : parts[0];
  if (meta.position === 'prefix') return `${sign}${meta.symbol} ${number}`;
  return `${sign}${number} ${meta.symbol}`;
};

const addWatermark = (doc: jsPDF, text: string, color: [number, number, number]) => {
  doc.saveGraphicsState();
  (doc as any).setGState(new (doc as any).GState({ opacity: 0.15 }));
  doc.setFontSize(60);
  doc.setTextColor(color[0], color[1], color[2]);
  doc.setFont("helvetica", "bold");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.text(text, pageWidth / 2, pageHeight / 2, {
    align: 'center',
    angle: 45
  });
  doc.restoreGraphicsState();
};

// ============================================
// CRÉATION DOCUMENT BASE
// ============================================

export const createPDFDocument = async (
  title: string,
  type: PDFDocumentType = 'generic',
  options: PDFDocumentOptions = {}
): Promise<jsPDF> => {
  const { jsPDF } = await loadPDFLibraries();
  const branding = options.branding || DEFAULT_BRANDING;
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait',
    format: options.format || 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const primaryColor = branding.primaryColor || COLORS.primary;

  // === HEADER ===

  // Logo (si disponible en Base64)
  let logoLoaded = false;
  const textStartX = 14;
  let companyNameX = textStartX;
  let detailsStartY = 26;

  if (branding.logo) {
    try {
      doc.addImage(branding.logo, 'PNG', 14, 8, 28, 28);
      logoLoaded = true;
      companyNameX = 46; // Décaler le texte à droite du logo
      detailsStartY = 26;
    } catch {
      // Logo invalide — on continue sans
    }
  }

  // Nom entreprise
  doc.setFontSize(22);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFont("helvetica", "bold");
  doc.text(branding.name, companyNameX, 20);

  // Informations entreprise
  const infoX = logoLoaded ? companyNameX : textStartX;
  doc.setFontSize(8);
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.setFont("helvetica", "normal");
  doc.text(branding.address, infoX, detailsStartY);
  doc.text(branding.city, infoX, detailsStartY + 4);
  doc.text(`Tél: ${branding.phone}`, infoX, detailsStartY + 8);
  doc.text(`Email: ${branding.email}`, infoX, detailsStartY + 12);
  if (branding.website) {
    doc.text(`Web: ${branding.website}`, infoX, detailsStartY + 16);
  }

  // SIRET/TVA
  const siretStartY = branding.website ? detailsStartY + 20 : detailsStartY + 16;
  if (branding.siret) {
    doc.text(`SIRET: ${branding.siret}`, infoX, siretStartY);
  }
  if (branding.tva) {
    doc.text(`N° TVA: ${branding.tva}`, infoX, branding.siret ? siretStartY + 4 : siretStartY);
  }

  // Titre document (droite)
  doc.setFontSize(18);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), pageWidth - 14, 20, { align: 'right' });

  // Type de document avec badge coloré
  const typeColors: Record<PDFDocumentType, [number, number, number]> = {
    invoice: [80, 80, 80],
    quote: [80, 80, 80],
    receipt: [80, 80, 80],
    intervention: [80, 80, 80],
    report: [80, 80, 80],
    contract: [80, 80, 80],
    generic: [80, 80, 80],
  };
  const typeLabels: Record<PDFDocumentType, string> = {
    invoice: 'FACTURE',
    quote: 'DEVIS',
    receipt: 'REÇU',
    intervention: 'INTERVENTION',
    report: 'RAPPORT',
    contract: 'CONTRAT',
    generic: 'DOCUMENT',
  };

  const typeColor = typeColors[type];
  const typeLabel = typeLabels[type];

  // Badge type
  doc.setFillColor(typeColor[0], typeColor[1], typeColor[2]);
  const badgeWidth = doc.getTextWidth(typeLabel) + 8;
  doc.roundedRect(pageWidth - 14 - badgeWidth, 24, badgeWidth, 8, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(typeLabel, pageWidth - 14 - badgeWidth / 2, 29, { align: 'center' });

  // Date
  doc.setFontSize(9);
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, 38, { align: 'right' });

  // Ligne séparatrice — positionner dynamiquement selon le contenu
  doc.setDrawColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
  doc.setLineWidth(0.5);
  let headerEndY = detailsStartY + 16; // base: après email
  if (branding.website) headerEndY += 4;
  if (branding.siret) headerEndY += 4;
  if (branding.tva) headerEndY += 4;
  // Si logo, s'assurer qu'on ne coupe pas le logo (logo fait 28px de haut, commence à y=8)
  if (logoLoaded) headerEndY = Math.max(headerEndY, 40);
  doc.line(14, headerEndY, pageWidth - 14, headerEndY);

  return doc;
};

// ============================================
// FOOTER ET NUMÉROS DE PAGE
// ============================================

export const addDocumentFooter = (
  doc: jsPDF,
  branding: TenantBranding = DEFAULT_BRANDING
): void => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Ligne séparatrice footer
    doc.setDrawColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 20, pageWidth - 14, pageHeight - 20);

    // Mentions légales
    if (branding.footer) {
      doc.setFontSize(7);
      doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
      doc.setFont("helvetica", "normal");
      doc.text(branding.footer, pageWidth / 2, pageHeight - 15, { align: 'center' });
    }

    // Numéro de page
    doc.setFontSize(8);
    doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
    doc.text(
      `Page ${i} / ${pageCount}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );

    // Copyright
    doc.setFontSize(7);
    doc.text(
      `© ${new Date().getFullYear()} ${branding.name}`,
      pageWidth - 14,
      pageHeight - 8,
      { align: 'right' }
    );
  }
};

// ============================================
// GÉNÉRATION FACTURE
// ============================================

/**
 * Génération de Facture ou Devis (Service Unifié)
 */
export const generateInvoicePDF = async (
  data: InvoiceData,
  options: PDFDocumentOptions = {}
): Promise<void> => {
  const currency = data.currency || 'XOF';

  const { autoTable } = await loadPDFLibraries();
  const branding = options.branding || DEFAULT_BRANDING;

  // Déterminer le type (Facture par défaut, Devis si spécifié dans les options ou détecté)
  const docType: PDFDocumentType = options.type || (data.number.startsWith('DEV') ? 'quote' : 'invoice');

  const doc = await createPDFDocument(data.number, docType, options);
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const startY = 65;

  // === FILIGRANE STATUT ===
  if (data.status) {
    const statusUpper = data.status.toUpperCase();
    if (statusUpper === 'DRAFT' || statusUpper === 'BROUILLON') {
      addWatermark(doc, 'BROUILLON', [150, 150, 150]);
    } else if (statusUpper === 'PAID' || statusUpper === 'PAYÉE') {
      addWatermark(doc, 'PAYÉE', [150, 150, 150]);
    } else if (statusUpper === 'CANCELLED' || statusUpper === 'ANNULÉE') {
      addWatermark(doc, 'ANNULÉE', [150, 150, 150]);
    }
  }

  // === INFORMATIONS CLIENT ===
  doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
  doc.roundedRect(pageWidth / 2 + 10, startY, pageWidth / 2 - 24, 35, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFont("helvetica", "bold");
  doc.text(docType === 'quote' ? "DESTINATAIRE" : "FACTURÉ À", pageWidth / 2 + 15, startY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(data.client.name, pageWidth / 2 + 15, startY + 16);
  if (data.client.address) doc.text(data.client.address, pageWidth / 2 + 15, startY + 22);
  if (data.client.city) doc.text(data.client.city, pageWidth / 2 + 15, startY + 28);
  if (data.client.email || data.client.phone) {
    const contact = [data.client.email, data.client.phone].filter(Boolean).join(' | ');
    doc.text(contact, pageWidth / 2 + 15, startY + 34);
  }

  // === DÉTAILS DOCUMENT ===
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("RÉFÉRENCES", 14, startY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`N° ${docType === 'quote' ? 'Devis' : 'Facture'}: ${data.number}`, 14, startY + 16);
  doc.text(`Date ${docType === 'quote' ? 'du devis' : 'de facture'}: ${formatDate(data.date)}`, 14, startY + 22);
  doc.text(`${docType === 'quote' ? 'Validité' : 'Échéance'}: ${formatDate(data.dueDate)}`, 14, startY + 28);

  // Métadonnées spécifiques (Plaque, Contrat, etc.)
  let metaY = startY + 34;
  if (data.meta?.licensePlate) {
    doc.setFont("helvetica", "bold");
    doc.text(`Plaque: ${data.meta.licensePlate}`, 14, metaY);
    metaY += 6;
  }
  if (data.meta?.contractId) {
    doc.setFont("helvetica", "normal");
    doc.text(`Réf. Contrat: ${data.meta.contractId}`, 14, metaY);
    metaY += 6;
  }
  if (data.meta?.paymentMethod) {
    doc.setFont("helvetica", "normal");
    doc.text(`Paiement: ${data.meta.paymentMethod}`, 14, metaY);
    metaY += 6;
  }

  // === TABLEAU ARTICLES ===
  const tableStartY = Math.max(startY + 45, metaY + 5);

  autoTable(doc, {
    startY: tableStartY,
    head: [['Description', 'Qté', 'Prix Unit. HT', 'Total HT']],
    body: data.items.map(item => [
      item.description,
      item.quantity.toString(),
      formatCurrency(item.price, currency),
      formatCurrency(item.total, currency)
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 35, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: COLORS.light,
    },
    margin: { left: 14, right: 14 },
  });

  // === TOTAUX ===
  let currentY = (doc as any).lastAutoTable.finalY + 10;
  const totalsX = pageWidth - 70;

  // Sous-total
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Sous-total HT:", totalsX, currentY);
  doc.text(formatCurrency(data.subtotal, currency), pageWidth - 14, currentY, { align: 'right' });

  // Remise
  if (data.discount && data.discount > 0) {
    currentY += 7;
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.text("Remise:", totalsX, currentY);
    doc.text(`-${formatCurrency(data.discount, currency)}`, pageWidth - 14, currentY, { align: 'right' });
  }

  // TVA
  if (data.taxRate > 0) {
    currentY += 7;
    doc.text(`TVA (${data.taxRate}%):`, totalsX, currentY);
    doc.text(formatCurrency(data.taxAmount, currency), pageWidth - 14, currentY, { align: 'right' });
  }

  // Ligne de séparation
  currentY += 4;
  doc.setDrawColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.line(totalsX, currentY, pageWidth - 14, currentY);

  // Total
  currentY += 7;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL TTC:", totalsX, currentY);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(formatCurrency(data.total, currency), pageWidth - 14, currentY, { align: 'right' });

  // === MONTANT EN LETTRES ===
  currentY += 15;
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  const amountInWords = numberToWords(Math.floor(data.total)).toUpperCase();
  doc.text(`ARRÊTÉ LA PRÉSENTE ${docType === 'quote' ? 'OFFRE' : 'FACTURE'} À LA SOMME DE :`, 14, currentY);
  currentY += 6;
  doc.setFont("helvetica", "normal");
  const currencyMeta = CURRENCY_META[currency] || CURRENCY_META['XOF'];
  const wrappedWords = doc.splitTextToSize(`${amountInWords} ${currencyMeta.symbol}`, pageWidth - 28);
  doc.text(wrappedWords, 14, currentY);
  currentY += wrappedWords.length * 5;

  // === COORDONNÉES BANCAIRES ===
  if (branding.bankDetails) {
    currentY += 5;
    doc.setFont("helvetica", "bold");
    doc.text("COORDONNÉES BANCAIRES", 14, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const wrappedBank = doc.splitTextToSize(branding.bankDetails, pageWidth - 28);
    doc.text(wrappedBank, 14, currentY);
    currentY += wrappedBank.length * 4;
  }

  // === NOTES & CONDITIONS ===
  if (data.notes || data.paymentTerms || data.generalConditions) {
    currentY += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("NOTES ET CONDITIONS", 14, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    let noteLines = [];
    if (data.paymentTerms) noteLines.push(`Conditions de paiement: ${data.paymentTerms}`);
    if (data.notes) noteLines.push(data.notes);
    if (data.generalConditions) noteLines.push(data.generalConditions);

    const wrappedNotes = doc.splitTextToSize(noteLines.join('\n'), pageWidth - 28);
    doc.text(wrappedNotes, 14, currentY);
    currentY += wrappedNotes.length * 4;
  }

  // === ZONE DE SIGNATURE ===
  const signatureY = pageHeight - 50;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  // Signature Entreprise
  doc.text("L'ENTREPRISE (CACHET ET SIGNATURE)", 14, signatureY);
  doc.setDrawColor(200, 200, 200);
  doc.line(14, signatureY + 2, 80, signatureY + 2);

  // Signature Client
  doc.text("LE CLIENT (BON POUR ACCORD)", pageWidth - 14, signatureY, { align: 'right' });
  doc.line(pageWidth - 80, signatureY + 2, pageWidth - 14, signatureY + 2);

  // Footer et sauvegarde
  addDocumentFooter(doc, branding);
  doc.save(`${docType === 'quote' ? 'Devis' : 'Facture'}_${data.number}.pdf`);
};


// ============================================
// GÉNÉRATION BON / RAPPORT D'INTERVENTION
// ============================================

export const generateInterventionPDF = async (
  data: InterventionData,
  options: PDFDocumentOptions = {}
): Promise<void> => {
  const { autoTable } = await loadPDFLibraries();
  const branding = options.branding || DEFAULT_BRANDING;
  const isRapport = data.documentType === 'RAPPORT';
  const docTitle = isRapport ? 'RAPPORT D\'INTERVENTION' : 'BON D\'INTERVENTION';
  
  const doc = await createPDFDocument(data.id, 'intervention', options);
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  let currentY = 65;

  // Titre du document
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]); // Neutral dark
  doc.rect(14, 50, pageWidth - 28, 10, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(docTitle, pageWidth / 2, 57, { align: 'center' });
  
  currentY = 70;

  // === INFORMATIONS TECHNICIEN ET CLIENT ===
  doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
  doc.roundedRect(14, currentY, (pageWidth - 38) / 2, 40, 3, 3, 'F');
  doc.roundedRect(pageWidth / 2 + 5, currentY, (pageWidth - 38) / 2, 40, 3, 3, 'F');

  doc.setFontSize(10);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFont("helvetica", "bold");
  doc.text("TECHNICIEN", 19, currentY + 8);
  doc.text("CLIENT", pageWidth / 2 + 10, currentY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Nom: ${data.technician.name}`, 19, currentY + 16);
  if (data.technician.phone) doc.text(`Tél: ${data.technician.phone}`, 19, currentY + 22);
  doc.text(`Date: ${formatDate(data.date)}`, 19, currentY + 28);
  if (data.duration) doc.text(`Durée: ${data.duration}`, 19, currentY + 34);

  const clientName = data.client?.name || data.vehicle.client || 'N/A';
  doc.text(`Nom: ${clientName}`, pageWidth / 2 + 10, currentY + 16);
  if (data.client?.phone) doc.text(`Tél: ${data.client.phone}`, pageWidth / 2 + 10, currentY + 22);
  if (data.client?.location) {
    const splitLoc = doc.splitTextToSize(data.client.location, (pageWidth - 38) / 2 - 10);
    doc.text(splitLoc, pageWidth / 2 + 10, currentY + 28);
  }

  currentY += 50;

  // === DÉTAILS VÉHICULE ===
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(14, currentY, pageWidth - 28, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("VÉHICULE CONCERNÉ", 19, currentY + 5.5);

  currentY += 12;
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Plaque: ${data.vehicle.plate}`, 19, currentY);
  doc.setFont("helvetica", "normal");
  doc.text(`Modèle: ${data.vehicle.brand || ''} ${data.vehicle.model || ''}`, 70, currentY);
  doc.text(`Type: ${data.vehicle.type || 'N/A'}`, 140, currentY);

  if (data.vehicle.mileage) {
    currentY += 6;
    doc.text(`Kilométrage: ${data.vehicle.mileage} km`, 19, currentY);
  }

  currentY += 12;

  // === TRAVAUX EFFECTUÉS ===
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(14, currentY, pageWidth - 28, 8, 'F');
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("DÉTAILS DES TRAVAUX", 19, currentY + 5.5);

  currentY += 12;
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFontSize(9);
  doc.text(`Type: ${data.type}`, 19, currentY);
  if (data.nature) doc.text(`Nature: ${data.nature}`, 80, currentY);
  if (data.ticketId) doc.text(`Ticket lié: ${data.ticketId}`, 140, currentY);

  currentY += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Description:", 19, currentY);
  currentY += 5;
  doc.setFont("helvetica", "normal");
  const splitDesc = doc.splitTextToSize(data.description, pageWidth - 28);
  doc.text(splitDesc, 19, currentY);
  currentY += splitDesc.length * 5 + 5;

  // Actions réalisées (si existantes)
  if (data.actions && data.actions.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text("Actions réalisées:", 19, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    data.actions.forEach(action => {
      doc.text(`• ${action}`, 22, currentY);
      currentY += 5;
    });
    currentY += 2;
  }

  // === MATÉRIEL UTILISÉ ===
  if (data.partsUsed && data.partsUsed.length > 0) {
    autoTable(doc, {
      startY: currentY,
      head: [['Désignation', 'Quantité']],
      body: data.partsUsed.map(p => [p.name, p.quantity.toString()]),
      theme: 'grid',
      headStyles: { fillColor: COLORS.secondary, textColor: 255 },
      styles: { fontSize: 8 },
      margin: { left: 14, right: 14 }
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // === REMARQUES ===
  if (data.notes) {
    doc.setFont("helvetica", "bold");
    doc.text("Remarques:", 19, currentY);
    currentY += 5;
    doc.setFont("helvetica", "normal");
    const splitNotes = doc.splitTextToSize(data.notes, pageWidth - 28);
    doc.text(splitNotes, 19, currentY);
    currentY += splitNotes.length * 5 + 10;
  }

  // === SECTIONS SPÉCIFIQUES AU RAPPORT ===
  if (isRapport) {
    // Informations techniques (IMEI, SIM)
    if (data.imei || data.simCard) {
      doc.setFillColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
      doc.roundedRect(14, currentY, pageWidth - 28, 20, 2, 2, 'F');
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      doc.text("DONNÉES TECHNIQUES", 19, currentY + 6);
      doc.setFont("helvetica", "normal");
      if (data.imei) doc.text(`IMEI: ${data.imei}`, 19, currentY + 13);
      if (data.simCard) doc.text(`SIM: ${data.simCard}`, 100, currentY + 13);
      currentY += 25;
    }

    // Résultats des tests
    if (data.testResults) {
      doc.setFont("helvetica", "bold");
      doc.text("Résultat des tests:", 19, currentY);
      currentY += 5;
      doc.setFont("helvetica", "normal");
      const splitTest = doc.splitTextToSize(data.testResults, pageWidth - 28);
      doc.text(splitTest, 19, currentY);
      currentY += splitTest.length * 5 + 5;
    }

    // Observations du technicien
    if (data.observations) {
      doc.setFont("helvetica", "bold");
      doc.text("Observations:", 19, currentY);
      currentY += 5;
      doc.setFont("helvetica", "normal");
      const splitObs = doc.splitTextToSize(data.observations, pageWidth - 28);
      doc.text(splitObs, 19, currentY);
      currentY += splitObs.length * 5 + 5;
    }
  }

  // === CHECKLIST POUR LE BON (vierge à cocher sur site) ===
  if (!isRapport && data.checklist && data.checklist.length > 0) {
    doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
    doc.rect(14, currentY, pageWidth - 28, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("CHECKLIST À VÉRIFIER", 19, currentY + 5.5);
    currentY += 12;
    
    doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
    doc.setFontSize(9);
    data.checklist.forEach((item, idx) => {
      // Case à cocher vide
      doc.rect(19, currentY - 3, 4, 4);
      doc.setFont("helvetica", "normal");
      doc.text(item.label, 26, currentY);
      currentY += 7;
    });
    currentY += 5;
  }

  // === ZONE DE SIGNATURE ===
  const signatureY = pageHeight - 60;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);

  // Cadre Signature Tech (toujours présent)
  doc.setDrawColor(200, 200, 200);
  doc.rect(14, signatureY, 80, 40);
  doc.text("TECHNICIEN", 14 + 40, signatureY - 3, { align: 'center' });
  if (data.signatureTech) {
    try {
      doc.addImage(data.signatureTech, 'PNG', 16, signatureY + 2, 76, 30);
    } catch (e) { logger.warn('Tech signature error'); }
  }

  // Cadre Signature Client (uniquement pour RAPPORT)
  if (isRapport) {
    doc.rect(pageWidth - 94, signatureY, 80, 40);
    doc.text("CLIENT", pageWidth - 94 + 40, signatureY - 3, { align: 'center' });
    if (data.signatureClient) {
      try {
        doc.addImage(data.signatureClient, 'PNG', pageWidth - 92, signatureY + 2, 76, 30);
      } catch (e) { logger.warn('Client signature error'); }
    }
  } else {
    // Pour le BON: espace pour date et heure d'arrivée
    doc.rect(pageWidth - 94, signatureY, 80, 40);
    doc.text("DATE / HEURE ARRIVÉE", pageWidth - 94 + 40, signatureY - 3, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("____/____/______  à ____:____", pageWidth - 90, signatureY + 20);
  }

  addDocumentFooter(doc, branding);
  const filename = isRapport ? `Rapport_${data.id}.pdf` : `Bon_${data.id}.pdf`;
  doc.save(filename);
};

// Fonctions wrapper pour faciliter l'utilisation
export const generateBonInterventionPDF = async (
  data: Omit<InterventionData, 'documentType'>,
  options: PDFDocumentOptions = {}
): Promise<void> => {
  return generateInterventionPDF({ ...data, documentType: 'BON' }, options);
};

export const generateRapportInterventionPDF = async (
  data: Omit<InterventionData, 'documentType'>,
  options: PDFDocumentOptions = {}
): Promise<void> => {
  return generateInterventionPDF({ ...data, documentType: 'RAPPORT' }, options);
};


// ============================================
// GÉNÉRATION TABLEAU GÉNÉRIQUE
// ============================================

export interface TableExportOptions {
  title: string;
  headers: string[];
  rows: string[][];
  filename: string;
  orientation?: 'portrait' | 'landscape';
  branding?: TenantBranding;
}

export const generateTablePDF = async (options: TableExportOptions): Promise<void> => {
  const { autoTable } = await loadPDFLibraries();
  const branding = options.branding || DEFAULT_BRANDING;
  const doc = await createPDFDocument(options.title, 'report', {
    orientation: options.orientation,
    branding,
  });

  autoTable(doc, {
    startY: 60,
    head: [options.headers],
    body: options.rows,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: COLORS.light,
    },
    margin: { left: 14, right: 14 },
  });

  addDocumentFooter(doc, branding);
  doc.save(`${options.filename}.pdf`);
};

// ============================================
// GÉNÉRATION ARRÊTÉ DE CAISSE
// ============================================

export interface CashClosingData {
  date: string;
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  theoreticalClosing: number;
  actualClosing: number;
  gap: number;
  entries: { ref: string; label: string; debit: number; credit: number }[];
  notes?: string;
  formatPrice: (amount: number) => string;
}

export const generateCashClosingPDF = async (
  data: CashClosingData,
  options: PDFDocumentOptions = {}
): Promise<void> => {
  const { autoTable } = await loadPDFLibraries();
  const branding = options.branding || DEFAULT_BRANDING;
  const doc = await createPDFDocument('ARRÊTÉ DE CAISSE', 'generic', options);
  const pageWidth = doc.internal.pageSize.width;

  let currentY = 55;

  // Date et responsable
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text(`Date: ${new Date(data.date).toLocaleDateString('fr-FR')}`, 14, currentY);
  doc.text(`Responsable: ____________________`, pageWidth / 2, currentY);
  currentY += 10;

  // Tableau récapitulatif
  autoTable(doc, {
    startY: currentY,
    head: [['Désignation', 'Montant']],
    body: [
      ['Solde à l\'ouverture', data.formatPrice(data.openingBalance)],
      ['Total Entrées (Recettes)', data.formatPrice(data.totalIn)],
      ['Total Sorties (Dépenses)', data.formatPrice(data.totalOut)],
      ['Solde Théorique à la fermeture', data.formatPrice(data.theoreticalClosing)],
      ['Solde Réel Constaté (Espèces)', data.formatPrice(data.actualClosing)],
      ['Écart de Caisse', data.formatPrice(data.gap)],
    ],
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: 255 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });

  // Tableau des opérations
  currentY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Détail des Opérations", 14, currentY);
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    head: [['Heure', 'Réf', 'Libellé', 'Entrée', 'Sortie']],
    body: data.entries.map(e => [
      '-',
      e.ref,
      e.label,
      e.debit > 0 ? data.formatPrice(e.debit) : '',
      e.credit > 0 ? data.formatPrice(e.credit) : '',
    ]),
    theme: 'striped',
    headStyles: { fillColor: COLORS.secondary, textColor: 255 },
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  // Signatures
  const sigY = (doc as any).lastAutoTable.finalY + 30;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.text("Signature du Caissier", 30, sigY);
  doc.text("Signature du Responsable", 130, sigY);
  doc.setDrawColor(200, 200, 200);
  doc.rect(20, sigY + 5, 60, 30);
  doc.rect(120, sigY + 5, 60, 30);

  if (data.notes) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Notes / Observations:", 20, sigY + 50);
    doc.setFont("helvetica", "normal");
    doc.text(data.notes, 20, sigY + 60);
  }

  addDocumentFooter(doc, branding);
  doc.save(`Arrete_Caisse_${data.date}.pdf`);
};


// ============================================
// EXPORTS PAR DÉFAUT
// ============================================

export default {
  createPDFDocument,
  addDocumentFooter,
  generateInvoicePDF,
  generateInterventionPDF,
  generateBonInterventionPDF,
  generateRapportInterventionPDF,
  generateTablePDF,
  generateCashClosingPDF,
};
