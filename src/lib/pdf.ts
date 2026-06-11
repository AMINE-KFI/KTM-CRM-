import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Company, Product, BusinessDocument, FiscalSettings } from '../types';
import { formatCurrency, formatDate } from './storage';
import { KATAMINE_LOGO } from './logoBase64';

const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

function convertLessThanOneThousand(n: number): string {
    if (n === 0) return '';
    let result = '';
    
    if (n >= 100) {
        const hundreds = Math.floor(n / 100);
        result += (hundreds === 1 ? 'cent' : units[hundreds] + ' cent');
        n %= 100;
        if (n === 0 && hundreds > 1) result += 's';
        if (n > 0) result += ' ';
    }
    
    if (n > 0) {
        if (n < 20) {
            result += units[n];
        } else {
            const ten = Math.floor(n / 10);
            const unit = n % 10;
            
            if (ten === 7 || ten === 9) {
                result += tens[ten - 1];
                if (unit === 1 && ten === 7) result += ' et onze';
                else if (unit === 1) result += '-onze'; 
                else result += '-' + units[10 + unit];
            } else {
                result += tens[ten];
                if (unit === 1 && ten !== 8) result += ' et un';
                else if (unit > 0) result += '-' + units[unit];
            }
        }
    }
    return result;
}

function numberToWordsFR(n: number): string {
    if (n === 0) return 'zéro dinar';
    
    const dinars = Math.floor(n);
    const centimes = Math.round((n - dinars) * 100);
    
    let result = '';
    
    if (dinars >= 1000000) {
        const millions = Math.floor(dinars / 1000000);
        result += convertLessThanOneThousand(millions) + ' million' + (millions > 1 ? 's ' : ' ');
    }
    
    if (dinars >= 1000) {
        const thousands = Math.floor((dinars % 1000000) / 1000);
        if (thousands > 0) {
            result += (thousands === 1 ? 'mille ' : convertLessThanOneThousand(thousands) + ' mille ');
        }
    }
    
    const remainder = dinars % 1000;
    if (remainder > 0) {
        result += convertLessThanOneThousand(remainder);
    }
    
    let finalStr = result.trim() + (dinars > 1 ? ' dinars' : ' dinar');
    if (centimes > 0) {
        finalStr += ' et ' + convertLessThanOneThousand(centimes) + (centimes > 1 ? ' centimes' : ' centime');
    }
    
    return finalStr.charAt(0).toUpperCase() + finalStr.slice(1);
}

export function exportCompaniesToPDF(companies: Company[]) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Liste des Clients', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - Total : ${companies.length} clients`, 14, 30);

  const tableColumn = ["Nom", "Forme", "Ville", "Téléphone", "Email", "NIF", "RC"];
  const tableRows: any[] = [];

  companies.forEach(company => {
    const companyData = [
      company.name,
      company.legalForm || '-',
      company.city || '-',
      company.phone || '-',
      company.email || '-',
      company.nif || '-',
      company.rc || '-'
    ];
    tableRows.push(companyData);
  });

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 35,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });

  doc.save('clients_export.pdf');
}

export function exportProductsToPDF(products: Product[], tenant?: string | null) {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text('Catalogue de Produits', 14, 22);
  
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} - Total : ${products.length} produits`, 14, 30);

  const tableColumn = ["Nom", "Description", "Prix HT", "TVA (%)", "Prix TTC"];
  const tableRows: any[] = [];

  products.forEach(product => {
    let price = product.price;
    if (tenant && product.prices && (product.prices as any)[tenant] !== undefined) {
      price = (product.prices as any)[tenant];
    }
    
    const ttc = price * (1 + product.vatRate / 100);

    const productData = [
      product.name,
      product.description || '-',
      new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(price),
      product.vatRate,
      new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2 }).format(ttc)
    ];
    tableRows.push(productData);
  });

  (doc as any).autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 35,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [39, 174, 96] },
  });

  doc.save('catalogue_export.pdf');
}

export function generateDocumentPDF(docData: BusinessDocument, company: Company, fiscalSettings?: FiscalSettings, totalPaid: number = 0, returnBlob: boolean = false): Blob | void {
  const doc = new jsPDF();
  const isKLTools = docData.tenant === 'kltools';

  // 1. En-tête (Tenant)
  if (isKLTools) {
    doc.setFontSize(22);
    doc.setTextColor('#e74c3c');
    doc.setFont('helvetica', 'bold');
    doc.text('KL TOOLS', 14, 25);
  } else {
    // Add Katamine Logo
    doc.addImage(KATAMINE_LOGO, 'PNG', 14, 15, 47.4, 10); // x, y, width, height
  }
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  
  let tenantInfo = '';
  if (fiscalSettings) {
    tenantInfo = `${fiscalSettings.address || ''}\nNIF: ${fiscalSettings.nif || '-'} | RC: ${fiscalSettings.rc || '-'}\nNIS: ${fiscalSettings.nis || '-'} | ART: ${fiscalSettings.art || '-'}\nEmail: ${fiscalSettings.email || '-'} | Tél: ${fiscalSettings.phone || '-'}`;
  } else {
    tenantInfo = isKLTools 
      ? 'Equipements et Outillages\nNIF: 1234567890 | RC: KL-2023\nContact: kltools@example.com' 
      : 'Solutions Industrielles\nNIF: 0987654321 | RC: KT-1998\nContact: contact@katamine.com';
  }
  doc.text(tenantInfo, 14, 32);

  // 2. Info Client
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text('Client :', 120, 25);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(company.name, 120, 32);
  doc.text(company.address || '', 120, 37);
  doc.text(`${company.postalCode || ''} ${company.city || ''}`, 120, 42);
  if (company.nif) doc.text(`NIF: ${company.nif}`, 120, 47);

  // 3. Info Document
  const docTypeLabels: Record<string, string> = {
    invoice: 'FACTURE',
    proforma: 'FACTURE PROFORMA',
    delivery_note: 'BON DE LIVRAISON',
    purchase_order: 'BON DE COMMANDE'
  };

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  const docTitle = `${docTypeLabels[docData.type] || 'DOCUMENT'} N° ${docData.reference}`;
  doc.text(docTitle, 14, 60);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  let yPos = 68;
  doc.text(`Date d'émission : ${formatDate(docData.createdAt)}`, 14, yPos);
  yPos += 5;
  
  if (docData.dueDate) {
    doc.text(`Échéance : ${formatDate(docData.dueDate)}`, 14, yPos);
    yPos += 5;
  }
  if (docData.poReference) {
    doc.setFont('helvetica', 'bold');
    doc.text(`Réf. BC : ${docData.poReference}`, 14, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 5;
  }
  if (docData.linkedDocumentRef) {
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);
    doc.text(`Suite au : ${docData.linkedDocumentRef}`, 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0);
  }

  // 4. Tableau des articles
  const tableColumn = ["Description", "Quantité", "Prix Unitaire HT", "Total HT"];
  const tableRows = docData.items.map(item => [
    item.name,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.total)
  ]);

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 85,
    styles: { fontSize: 10 },
    headStyles: { fillColor: isKLTools ? [231, 76, 60] : [52, 152, 219] },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    },
    margin: { bottom: 80 }
  });

  // 5. Totaux et Pied de page
  let finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Calculer la hauteur approximative requise pour le pied de page
  let footerHeight = 35; // Base pour les totaux HT, TVA, TTC
  if (totalPaid > 0) footerHeight += 25; // Lignes supplémentaires pour Payé, Reste, Soldé
  
  const amountInWords = numberToWordsFR(docData.totalAmount);
  const amountLines = doc.splitTextToSize(amountInWords, 120);
  const leftColHeight = 10 + (amountLines.length * 5); // Titre + texte
  
  let notesLines: string[] = [];
  let notesHeight = 0;
  if (docData.notes) {
    notesLines = doc.splitTextToSize(docData.notes, 120);
    notesHeight = 5 + (notesLines.length * 4);
  }
  
  // Le bloc texte à gauche ou les totaux à droite, prendre le plus grand
  const maxContentHeight = Math.max(footerHeight, leftColHeight + notesHeight);
  // +15 pour les coordonnées bancaires en bas
  const totalRequiredHeight = maxContentHeight + 15;

  // Si ça risque de déborder de la page (hauteur A4 = ~297), on crée une nouvelle page
  if (finalY + totalRequiredHeight > 285) {
    doc.addPage();
    finalY = 20;
  }

  // --- Colonne Droite: Totaux ---
  let rightColY = finalY;
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('Total HT :', 160, rightColY, { align: 'right' });
  doc.text(formatCurrency(docData.subtotal), 196, rightColY, { align: 'right' });
  rightColY += 7;

  const vatLabel = docData.vatAmount > 0 ? `TVA :` : 'TVA (Exonéré) :';
  doc.text(vatLabel, 160, rightColY, { align: 'right' });
  doc.text(formatCurrency(docData.vatAmount), 196, rightColY, { align: 'right' });
  rightColY += 9;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET A PAYER :', 160, rightColY, { align: 'right' });
  doc.text(formatCurrency(docData.totalAmount), 196, rightColY, { align: 'right' });
  rightColY += 8;

  if (totalPaid > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Payé :', 160, rightColY, { align: 'right' });
    doc.text(formatCurrency(totalPaid), 196, rightColY, { align: 'right' });
    rightColY += 6;
    
    const balance = docData.totalAmount - totalPaid;
    doc.setFont('helvetica', 'bold');
    doc.text('Reste à Payer :', 160, rightColY, { align: 'right' });
    doc.text(formatCurrency(balance > 0 ? balance : 0), 196, rightColY, { align: 'right' });
    rightColY += 10;

    if (balance <= 0) {
      doc.setTextColor(39, 174, 96);
      doc.setFontSize(14);
      doc.text('FACTURE SOLDÉE', 196, rightColY, { align: 'right' });
      doc.setTextColor(0);
      rightColY += 10;
    }
  }

  // --- Colonne Gauche: Textes ---
  let leftColY = finalY;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(0);
  doc.text('Arrêté la présente facture à la somme de :', 14, leftColY);
  leftColY += 5;
  
  doc.setFont('helvetica', 'bolditalic');
  doc.text(amountLines, 14, leftColY);
  leftColY += (amountLines.length * 5) + 5;

  if (docData.notes) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Notes / Conditions :', 14, leftColY);
    leftColY += 5;
    doc.text(notesLines, 14, leftColY);
    leftColY += (notesLines.length * 4) + 5;
  }

  // --- Pied de page: Coordonnées Bancaires ---
  // On place les coordonnées bancaires sous la colonne la plus longue
  let bankY = Math.max(rightColY, leftColY) + 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(50);
  let bankDetails = '';
  if (fiscalSettings && (fiscalSettings.bankName || fiscalSettings.rib)) {
    bankDetails = `Coordonnées Bancaires:\nBanque: ${fiscalSettings.bankName || '-'}\nRIB: ${fiscalSettings.rib || '-'}`;
  } else {
    bankDetails = isKLTools 
      ? 'Coordonnées Bancaires:\nBanque: BNA\nRIB: 001 00123 4567891234 56'
      : 'Coordonnées Bancaires:\nBanque: CPA\nRIB: 004 00456 1234567890 12';
  }
  doc.text(bankDetails, 14, bankY);

  const pdfBlob = doc.output('blob');
  if (returnBlob) {
    return pdfBlob;
  }
  const pdfUrl = URL.createObjectURL(pdfBlob);
  window.open(pdfUrl, '_blank');
}
