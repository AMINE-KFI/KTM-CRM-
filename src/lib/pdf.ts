import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Company, Product } from '../types';

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
