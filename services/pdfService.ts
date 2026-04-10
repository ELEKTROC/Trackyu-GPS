import type jsPDF from 'jspdf';
import { loadPDFLibraries } from './pdfLoader';
import { Payment, Client, Invoice } from '../types';
import type { TenantBranding } from './pdfServiceV2';

interface PDFOptions {
  orientation?: 'portrait' | 'landscape';
  branding?: TenantBranding;
}

const COMPANY_INFO = {
  name: "TrackYu GPS",
  address: "",
  city: "Abidjan, Côte d'Ivoire",
  phone: "",
  email: "",
  website: ""
};

const COLORS = {
  primary: [51, 51, 51], // Dark charcoal (neutral)
  secondary: [100, 116, 139], // Slate-500
  text: [30, 41, 59], // Slate-800
  light: [241, 245, 249] // Slate-100
};

/**
 * Initializes a PDF document with a professional header and footer configuration.
 * Accepts optional branding to replace hardcoded COMPANY_INFO.
 */
export const createStyledPDF = async (title: string, options: PDFOptions = {}): Promise<jsPDF> => {
  const { jsPDF } = await loadPDFLibraries();
  const doc = new jsPDF({
    orientation: options.orientation || 'portrait'
  });

  const pageWidth = doc.internal.pageSize.width;

  // Utiliser le branding fourni ou les valeurs par défaut
  const info = options.branding ? {
    name: options.branding.name || COMPANY_INFO.name,
    address: options.branding.address || COMPANY_INFO.address,
    city: options.branding.city || COMPANY_INFO.city,
    phone: options.branding.phone || COMPANY_INFO.phone,
    email: options.branding.email || COMPANY_INFO.email,
  } : COMPANY_INFO;

  const primaryColor = options.branding?.primaryColor || COLORS.primary;

  // --- HEADER ---
  // Logo (si disponible en Base64)
  let logoLoaded = false;
  let companyNameX = 14;

  if (options.branding?.logo) {
    try {
      doc.addImage(options.branding.logo, 'PNG', 14, 8, 24, 24);
      logoLoaded = true;
      companyNameX = 42;
    } catch {
      // Logo invalide — on continue sans
    }
  }

  // Company Name
  doc.setFontSize(24);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFont("helvetica", "bold");
  doc.text(info.name, companyNameX, 20);

  // Company Details
  const detailX = logoLoaded ? companyNameX : 14;
  doc.setFontSize(8);
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.setFont("helvetica", "normal");
  doc.text(info.address, detailX, 25);
  doc.text(info.city, detailX, 29);
  doc.text(info.email, detailX, 33);

  // Document Title (Right aligned)
  doc.setFontSize(16);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFont("helvetica", "bold");
  doc.text(title.toUpperCase(), pageWidth - 14, 20, { align: 'right' });

  // Date (Right aligned)
  doc.setFontSize(10);
  doc.setTextColor(COLORS.secondary[0], COLORS.secondary[1], COLORS.secondary[2]);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 14, 26, { align: 'right' });

  // Divider Line
  doc.setDrawColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
  doc.setLineWidth(0.5);
  const headerEndY = logoLoaded ? 38 : 38;
  doc.line(14, headerEndY, pageWidth - 14, headerEndY);

  return doc;
};

/**
 * Adds a footer to all pages of the document.
 * Should be called just before saving.
 */
export const addPageNumbers = (doc: jsPDF, companyName?: string) => {
  const pageCount = (doc as any).internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const name = companyName || COMPANY_INFO.name;

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} / ${pageCount} - ${name} © ${new Date().getFullYear()}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }
};

export const generatePDF = async (
  title: string,
  columns: string[],
  data: any[],
  filename: string,
  options: PDFOptions = {}
) => {
  const { autoTable } = await loadPDFLibraries();
  const doc = await createStyledPDF(title, options);

  // Table
  const tableColumn = columns;
  const tableRows = data.map(item => columns.map(col => item[col]));
  const primaryColor = options.branding?.primaryColor || COLORS.primary;

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    styles: { 
      fontSize: 9,
      cellPadding: 3,
      textColor: COLORS.text as any
    },
    headStyles: { 
      fillColor: COLORS.primary as any,
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: COLORS.light as any
    },
    margin: { top: 45 }
  });

  addPageNumbers(doc, options.branding?.name);
  doc.save(filename);
};

export const generatePaymentReceipt = async (payment: Payment, client: Client, invoices: Invoice[], branding?: TenantBranding) => {
  const { autoTable } = await loadPDFLibraries();
  const doc = await createStyledPDF("REÇU DE PAIEMENT", { branding });
  const pageWidth = doc.internal.pageSize.width;
  const primaryColor = branding?.primaryColor || COLORS.primary;

  // --- PAYMENT DETAILS ---
  doc.setFontSize(12);
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  doc.setFont("helvetica", "bold");
  doc.text("DÉTAILS DU PAIEMENT", 14, 50);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  // Left Column: Payment Info
  doc.text(`Référence: ${payment.reference}`, 14, 60);
  doc.text(`Date: ${new Date(payment.date).toLocaleDateString('fr-FR')}`, 14, 66);
  doc.text(`Méthode: ${payment.method}`, 14, 72);
  doc.text(`Statut: ${payment.status}`, 14, 78);

  // Right Column: Client Info
  const rightColX = pageWidth / 2 + 10;
  doc.setFont("helvetica", "bold");
  doc.text("CLIENT", rightColX, 50);
  doc.setFont("helvetica", "normal");
  doc.text(client.name, rightColX, 60);
  doc.text(client.contactName, rightColX, 66);
  doc.text(client.email, rightColX, 72);
  if (client.address) doc.text(client.address, rightColX, 78);

  // --- ALLOCATIONS TABLE ---
  const tableData = (payment.allocations || []).map(alloc => {
      const inv = invoices.find(i => i.id === alloc.invoiceId);
      return [
          inv ? inv.number : alloc.invoiceId,
          inv ? new Date(inv.date).toLocaleDateString('fr-FR') : '-',
          inv ? `${inv.amount.toLocaleString()}` : '-',
          `${alloc.amount.toLocaleString()}`
      ];
  });

  // If legacy single invoice
  if (tableData.length === 0 && payment.invoiceId) {
      const inv = invoices.find(i => i.id === payment.invoiceId);
      tableData.push([
          inv ? inv.number : payment.invoiceId,
          inv ? new Date(inv.date).toLocaleDateString('fr-FR') : '-',
          inv ? `${inv.amount.toLocaleString()}` : '-',
          `${payment.amount.toLocaleString()}`
      ]);
  }

  autoTable(doc, {
      startY: 90,
      head: [['Facture N°', 'Date Facture', 'Montant Facture', 'Montant Payé']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [51, 51, 51] },
      styles: { fontSize: 9 },
  });

  // --- TOTAL ---
  let finalY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`TOTAL PAYÉ: ${payment.amount.toLocaleString()} XOF`, pageWidth - 14, finalY, { align: 'right' });

  // --- FOOTER / NOTES ---
  doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
  if (payment.notes) {
      finalY += 15;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Détails & Remarques:", 14, finalY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      const splitNotes = doc.splitTextToSize(payment.notes, pageWidth - 28);
      doc.text(splitNotes, 14, finalY + 6);
  }

  addPageNumbers(doc, branding?.name);
  doc.save(`Recu_Paiement_${payment.reference}.pdf`);
};

