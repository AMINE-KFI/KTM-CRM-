import * as XLSX from 'xlsx';
import type { Company, Product } from '../types';

// ==========================================
// CLIENTS (COMPANIES)
// ==========================================

const COMPANY_COLUMNS = [
  'Nom',
  'Forme Juridique',
  'NIF',
  'NIS',
  'RC',
  'Adresse',
  'Ville',
  'Code Postal',
  'Pays',
  'Email',
  'Téléphone',
  'Site Web'
];

export function downloadCompanyTemplate() {
  const ws = XLSX.utils.json_to_sheet([{
    'Nom': 'Exemple SARL',
    'Forme Juridique': 'SARL',
    'NIF': '000000000000000',
    'NIS': '000000000000000',
    'RC': '00/00-0000000',
    'Adresse': '123 Rue de Exemple',
    'Ville': 'Alger',
    'Code Postal': '16000',
    'Pays': 'Algérie',
    'Email': 'contact@exemple.dz',
    'Téléphone': '0555000000',
    'Site Web': 'www.exemple.dz'
  }], { header: COMPANY_COLUMNS });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modèle Clients');
  XLSX.writeFile(wb, 'modele_import_clients.xlsx');
}

export function exportCompaniesToExcel(companies: Company[]) {
  const data = companies.map(c => ({
    'Nom': c.name,
    'Forme Juridique': c.legalForm || '',
    'NIF': c.nif || '',
    'NIS': c.nis || '',
    'RC': c.rc || '',
    'Adresse': c.address || '',
    'Ville': c.city || '',
    'Code Postal': c.postalCode || '',
    'Pays': c.country || '',
    'Email': c.email || '',
    'Téléphone': c.phone || '',
    'Site Web': c.website || '',
    'Contacts (Nombre)': c.contacts?.length || 0,
    'Date de création': new Date(c.createdAt).toLocaleDateString('fr-FR')
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Clients');
  XLSX.writeFile(wb, 'clients_export.xlsx');
}

export function parseCompaniesExcel(file: File): Promise<Partial<Company>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const companies = json.map((row: any) => ({
          name: row['Nom']?.toString() || 'Sans Nom',
          legalForm: row['Forme Juridique']?.toString() || '',
          nif: row['NIF']?.toString() || '',
          nis: row['NIS']?.toString() || '',
          rc: row['RC']?.toString() || '',
          address: row['Adresse']?.toString() || '',
          city: row['Ville']?.toString() || '',
          postalCode: row['Code Postal']?.toString() || '',
          country: row['Pays']?.toString() || 'Algérie',
          email: row['Email']?.toString() || '',
          phone: row['Téléphone']?.toString() || '',
          website: row['Site Web']?.toString() || '',
        }));
        resolve(companies);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

// ==========================================
// PRODUCTS (CATALOG)
// ==========================================

const PRODUCT_COLUMNS = [
  'Nom',
  'Description',
  'Prix HT',
  'TVA (%)'
];

export function downloadProductTemplate() {
  const ws = XLSX.utils.json_to_sheet([{
    'Nom': 'Produit A',
    'Description': 'Description du produit A',
    'Prix HT': 15000,
    'TVA (%)': 19
  }], { header: PRODUCT_COLUMNS });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Modèle Produits');
  XLSX.writeFile(wb, 'modele_import_produits.xlsx');
}

export function exportProductsToExcel(products: Product[]) {
  const data = products.map(p => ({
    'Nom': p.name,
    'Description': p.description || '',
    'Prix par défaut HT': p.price,
    'Prix Katamine HT': p.prices?.katamine || p.price,
    'Prix KL Tools HT': p.prices?.kltools || p.price,
    'TVA (%)': p.vatRate,
    'Date de création': new Date(p.createdAt).toLocaleDateString('fr-FR')
  }));

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Catalogue');
  XLSX.writeFile(wb, 'catalogue_export.xlsx');
}

export function parseProductsExcel(file: File): Promise<Partial<Product>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const products = json.map((row: any) => ({
          name: row['Nom']?.toString() || 'Sans Nom',
          description: row['Description']?.toString() || '',
          price: parseFloat(row['Prix HT'] || row['Prix par défaut HT'] || '0'),
          vatRate: parseFloat(row['TVA (%)'] || '19')
        }));
        resolve(products);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}
