// Conditions de paiement
export const PAYMENT_TERMS = [
    { id: 'IMMEDIATE', label: 'Comptant', days: 0 },
    { id: 'NET_15', label: 'Net 15 jours', days: 15 },
    { id: 'NET_30', label: 'Net 30 jours', days: 30 },
    { id: 'NET_45', label: 'Net 45 jours', days: 45 },
    { id: 'NET_60', label: 'Net 60 jours', days: 60 },
    { id: 'END_OF_MONTH', label: 'Fin de mois', days: 0, special: 'EOM' as const },
    { id: 'NET_30_EOM', label: '30 jours fin de mois', days: 30, special: 'EOM' as const },
] as const;

export type PaymentTermId = typeof PAYMENT_TERMS[number]['id'];

export const PLAN_COMPTABLE = [
    { code: '101000', label: 'Capital social', suggestions: ['Souscription capital', 'Augmentation capital'] },
    { code: '162000', label: 'Emprunts et dettes', suggestions: ['Remboursement emprunt', 'Intérêts emprunt'] },
    { code: '401100', label: 'Fournisseurs', suggestions: ['Facture fournisseur', 'Règlement fournisseur', 'Acompte fournisseur'] },
    { code: '411100', label: 'Clients', suggestions: ['Facture client', 'Encaissement client', 'Acompte client'] },
    { code: '445200', label: 'TVA due', suggestions: ['TVA sur facture', 'Déclaration TVA'] },
    { code: '445400', label: 'TVA récupérable', suggestions: ['TVA sur achat'] },
    { code: '512000', label: 'Banque', suggestions: ['Virement', 'Frais bancaires', 'Encaissement', 'Prélèvement'] },
    { code: '517000', label: 'Mobile Money / Autres', suggestions: ['Orange Money', 'MTN Money', 'Wave'] },
    { code: '530000', label: 'Caisse', suggestions: ['Retrait espèces', 'Dépôt espèces', 'Règlement espèces'] },
    { code: '601000', label: 'Achats de marchandises', suggestions: ['Achat stock', 'Approvisionnement'] },
    { code: '606000', label: 'Achats non stockés', suggestions: ['Fournitures bureau', 'Carburant', 'Eau et électricité', 'Entretien'] },
    { code: '610000', label: 'Services extérieurs', suggestions: ['Sous-traitance', 'Location', 'Assurance'] },
    { code: '620000', label: 'Autres services extérieurs', suggestions: ['Honoraires', 'Publicité', 'Frais de déplacement', 'Mission'] },
    { code: '630000', label: 'Impôts et taxes', suggestions: ['Patente', 'Taxe foncière', 'Vignette'] },
    { code: '640000', label: 'Charges de personnel', suggestions: ['Salaires', 'Charges sociales', 'Primes'] },
    { code: '660000', label: 'Charges financières', suggestions: ['Intérêts bancaires', 'Agios', 'Commissions'] },
    { code: '681000', label: 'Dotations aux amortissements', suggestions: ['Amortissement annuel', 'Dotation provision'] },
    { code: '701000', label: 'Ventes de marchandises', suggestions: ['Vente comptoir', 'Facture client'] },
    { code: '706000', label: 'Prestations de services', suggestions: ['Abonnement GPS', 'Installation', 'Maintenance', 'Formation'] },
];

export const JOURNAL_COLUMNS = [
    { id: 'date', label: 'Date' },
    { id: 'ref', label: 'N° Pièce' },
    { id: 'account', label: 'Compte' },
    { id: 'label', label: 'Libellé' },
    { id: 'debit', label: 'Débit' },
    { id: 'credit', label: 'Crédit' },
];

export const PAYMENT_COLUMNS = [
    { id: 'date', label: 'Date' },
    { id: 'ref', label: 'Référence' },
    { id: 'client', label: 'Client' },
    { id: 'contract', label: 'Contrat' },
    { id: 'invoices', label: 'Factures' },
    { id: 'type', label: 'Type' },
    { id: 'method', label: 'Méthode' },
    { id: 'amount', label: 'Montant' },
    { id: 'excess', label: 'Excédent' },
    { id: 'status', label: 'Statut' },
    { id: 'actions', label: 'Actions' },
];

export const SUPPLIER_INVOICE_COLUMNS = [
    { id: 'date', label: 'Date' },
    { id: 'reference', label: 'Référence' },
    { id: 'label', label: 'Libellé' }, // Added
    { id: 'supplierName', label: 'Fournisseur' },
    { id: 'reseller', label: 'Revendeur' },
    { id: 'dueDate', label: 'Échéance' },
    { id: 'amount', label: 'Montant' },
    { id: 'status', label: 'Statut' },
    { id: 'actions', label: 'Actions' },
];

export const BANK_TRANSACTION_COLUMNS = [
    { id: 'date', label: 'Date' },
    { id: 'description', label: 'Description' },
    { id: 'amount', label: 'Montant' },
    { id: 'reseller', label: 'Revendeur' },
    { id: 'type', label: 'Type' },
    { id: 'status', label: 'Statut' },
    { id: 'actions', label: 'Actions' },
];
