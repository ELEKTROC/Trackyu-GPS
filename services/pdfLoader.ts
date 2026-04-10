/**
 * Dynamic PDF Library Loader
 * Loads jsPDF and related libraries only when needed to reduce initial bundle size
 */

import type jsPDF from 'jspdf';

// Type for autoTable function
type AutoTableFn = (doc: jsPDF, options: any) => void;

// Cache the loaded modules to avoid re-importing
let jsPDFModule: typeof import('jspdf') | null = null;
let autoTableModule: { default: AutoTableFn } | null = null;

/**
 * Dynamically loads jsPDF library
 * @returns Promise resolving to jsPDF class
 */
export async function loadJsPDF(): Promise<typeof jsPDF> {
  if (!jsPDFModule) {
    jsPDFModule = await import('jspdf');
  }
  return jsPDFModule.default;
}

/**
 * Dynamically loads jspdf-autotable plugin
 * @returns Promise resolving to autoTable function
 */
export async function loadAutoTable(): Promise<AutoTableFn> {
  if (!autoTableModule) {
    autoTableModule = await import('jspdf-autotable') as unknown as { default: AutoTableFn };
  }
  return autoTableModule.default;
}

/**
 * Loads both jsPDF and autoTable together (common use case)
 * @returns Promise resolving to both libraries
 */
export async function loadPDFLibraries(): Promise<{
  jsPDF: typeof jsPDF;
  autoTable: AutoTableFn;
}> {
  const [jsPDFClass, autoTableFn] = await Promise.all([
    loadJsPDF(),
    loadAutoTable()
  ]);
  
  return {
    jsPDF: jsPDFClass,
    autoTable: autoTableFn
  };
}

/**
 * Dynamically loads html2canvas for screenshot/canvas generation
 * @returns Promise resolving to html2canvas function
 */
let html2canvasModule: typeof import('html2canvas') | null = null;

export async function loadHtml2Canvas(): Promise<typeof import('html2canvas').default> {
  if (!html2canvasModule) {
    html2canvasModule = await import('html2canvas');
  }
  return html2canvasModule.default;
}
