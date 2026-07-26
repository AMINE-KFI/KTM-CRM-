// src/lib/api.ts
import type { Company, Product, BusinessDocument, Expense, Payment, Employee, StockMovement } from '../types';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getHeaders = () => {
  const token = localStorage.getItem('token'); // On stockera le JWT ici
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

// Le backend pagine à 50 par défaut. Sans ça, tout ce qui dépasse 50 clients/produits/documents/...
// devenait invisible dans l'app car on ne récupérait jamais que la première page. On boucle ici
// jusqu'à avoir tout récupéré, une fois pour toutes, pour que le reste de l'app continue de
// travailler sur la liste complète comme avant (aucun composant ne gère la pagination serveur).
const PAGE_SIZE = 200;

async function fetchAllPages(endpoint: string, extraQuery = ''): Promise<any[]> {
  let page = 1;
  let all: any[] = [];
  while (true) {
    const sep = extraQuery ? '&' : '';
    const res = await fetch(`${API_URL}/${endpoint}?page=${page}&limit=${PAGE_SIZE}${sep}${extraQuery}`, { headers: getHeaders() });
    if (!res.ok) throw new Error(`Erreur récupération ${endpoint}`);
    const json = await res.json();
    const isArray = Array.isArray(json);
    const pageData: any[] = isArray ? json : (json.data || []);
    all = all.concat(pageData);

    if (isArray) break; // API n'ayant pas de pagination (réponse en tableau brut) : tout est déjà là
    const total = json.total ?? all.length;
    if (pageData.length === 0 || all.length >= total) break;
    page++;
  }
  return all;
}

export const api = {
  // Stats
  getStats: async (tenant?: string) => {
    const tenantParam = tenant ? `?tenant=${tenant}` : '';
    const res = await fetch(`${API_URL}/stats${tenantParam}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur récupération statistiques');
    return res.json();
  },

  // Companies
  getCompanies: async (): Promise<{ data: Company[], total: number }> => {
    const raw = await fetchAllPages('companies');
    const data = raw.map((c: any) => ({
      ...c,
      legalForm: c.legal_form || c.legalForm || '',
      postalCode: c.postal_code || c.postalCode || '',
      fiscalYear: c.fiscal_year || c.fiscalYear || '',
      contacts: typeof c.contacts === 'string' ? JSON.parse(c.contacts) : (c.contacts || [])
    }));
    return { data, total: data.length };
  },
  addCompany: async (company: any) => {
    const res = await fetch(`${API_URL}/companies`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(company)
    });
    return res.json();
  },
  updateCompany: async (id: string, updates: any) => {
    const res = await fetch(`${API_URL}/companies/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    return res.json();
  },
  deleteCompany: async (id: string) => {
    await fetch(`${API_URL}/companies/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  // Products
  getProducts: async (): Promise<{ data: Product[], total: number }> => {
    const raw = await fetchAllPages('products');
    const data = raw.map((p: any) => ({
      ...p,
      prices: typeof p.prices === 'string' ? JSON.parse(p.prices) : (p.prices || [])
    }));
    return { data, total: data.length };
  },
  addProduct: async (product: any) => {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(product)
    });
    return res.json();
  },
  updateProduct: async (id: string, updates: any) => {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    return res.json();
  },
  deleteProduct: async (id: string) => {
    await fetch(`${API_URL}/products/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  // Documents
  getDocuments: async (tenant?: string): Promise<{ data: BusinessDocument[], total: number }> => {
    const tenantParam = tenant ? `tenant=${tenant}` : '';
    const raw = await fetchAllPages('documents', tenantParam);
    const data = raw.map((d: any) => ({
      ...d,
      companyId: d.company_id || d.companyId,
      dueDate: d.due_date || d.dueDate,
      subtotal: Number(d.sub_total || d.subtotal || 0),
      vatAmount: Number(d.tax_total || d.vatAmount || 0),
      totalAmount: Number(d.total_amount || d.totalAmount || 0),
      stampAmount: Number(d.stamp_amount || d.stampAmount || 0),
      paymentMethod: d.payment_method || d.paymentMethod || 'À échéance',
      fiscalYear: d.fiscal_year || d.fiscalYear,
      reminderCount: Number(d.reminder_count ?? d.reminderCount ?? 0),
      lastReminderDate: d.last_reminder_date || d.lastReminderDate || undefined,
      createdAt: d.created_at || d.createdAt,
      items: (d.items || []).map((i: any) => ({
        ...i,
        productId: i.product_id || i.productId,
        quantity: Number(i.quantity || 0),
        unitPrice: Number(i.unit_price || i.unitPrice || 0),
        vatRate: Number(i.vat_rate || i.vatRate || 0),
        discount: Number(i.discount || 0),
        total: Number(i.quantity || 0) * Number(i.unit_price || i.unitPrice || 0)
      }))
    }));
    return { data, total: data.length };
  },
  addDocument: async (doc: any) => {
    const res = await fetch(`${API_URL}/documents`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(doc)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur API inconnue');
    }
    return res.json();
  },
  updateDocument: async (id: string, updates: any) => {
    const res = await fetch(`${API_URL}/documents/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur API inconnue');
    }
    return res.json();
  },
  deleteDocument: async (id: string) => {
    await fetch(`${API_URL}/documents/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  // Expenses
  getExpenses: async (): Promise<{ data: Expense[], total: number }> => {
    const raw = await fetchAllPages('expenses');
    const data = raw.map((e: any) => ({
      ...e,
      amount: Number(e.amount || 0),
      paymentMethod: e.payment_method || e.paymentMethod,
      fiscalYear: e.fiscal_year || e.fiscalYear,
      createdAt: e.created_at || e.createdAt
    }));
    return { data, total: data.length };
  },
  addExpense: async (expense: any) => {
    const res = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(expense)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur API inconnue');
    }
    return res.json();
  },
  updateExpense: async (id: string, updates: any) => {
    const res = await fetch(`${API_URL}/expenses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur API inconnue');
    }
    return res.json();
  },
  deleteExpense: async (id: string) => {
    await fetch(`${API_URL}/expenses/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  // Payments
  getPayments: async (): Promise<{ data: Payment[], total: number }> => {
    const raw = await fetchAllPages('payments');
    const data = raw.map((p: any) => ({
      ...p,
      amount: Number(p.amount || 0),
      documentId: p.document_id || p.documentId,
      companyId: p.company_id || p.companyId,
      fiscalYear: p.fiscal_year || p.fiscalYear,
      createdAt: p.created_at || p.createdAt,
      mode: p.method || p.mode
    }));
    return { data, total: data.length };
  },
  addPayment: async (payment: any) => {
    const res = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ ...payment, method: payment.mode })
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Erreur API inconnue');
    }
    return res.json();
  },
  deletePayment: async (id: string) => {
    await fetch(`${API_URL}/payments/${id}`, { method: 'DELETE', headers: getHeaders() });
  },

  // Database Reset
  resetDatabase: async () => {
    const res = await fetch(`${API_URL}/reset`, {
      method: 'POST',
      headers: getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Erreur ${res.status}`);
    }
  },

  // Stock
  getStockLevels: async (tenant?: string): Promise<Record<string, number>> => {
    const tenantParam = tenant ? `?tenant=${tenant}` : '';
    const res = await fetch(`${API_URL}/stock${tenantParam}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur récupération du stock');
    const json = await res.json();
    const levels: Record<string, number> = {};
    (json.data || []).forEach((row: any) => { levels[row.product_id] = Number(row.quantity); });
    return levels;
  },
  addStockMovement: async (movement: Omit<StockMovement, 'id' | 'createdAt'>) => {
    const res = await fetch(`${API_URL}/stock/movements`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        productId: movement.productId,
        tenant: movement.tenant,
        type: movement.type,
        quantity: movement.quantity,
        referenceId: movement.referenceId
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erreur lors du mouvement de stock');
    }
    return res.json();
  },

  // Users / Équipe (comptes réels côté serveur, remplace la gestion locale)
  getUsers: async (): Promise<Employee[]> => {
    const res = await fetch(`${API_URL}/users`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur récupération des utilisateurs');
    const json = await res.json();
    return (json.data || []).map((u: any) => ({
      id: u.id,
      firstName: u.name?.split(' ')[0] || u.name,
      lastName: u.name?.split(' ').slice(1).join(' ') || '',
      email: u.email,
      role: u.role === 'admin' ? 'admin' : 'employee',
      permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || []),
      tenant: u.tenant || undefined,
      createdAt: u.createdAt
    }));
  },
  addUser: async (user: any) => {
    const res = await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(user)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Erreur lors de la création de l'utilisateur");
    }
    return res.json();
  },
  updateUser: async (id: string, updates: any) => {
    const res = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Erreur lors de la modification de l'utilisateur");
    }
    return res.json();
  },
  deleteUser: async (id: string) => {
    const res = await fetch(`${API_URL}/users/${id}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Erreur lors de la suppression de l'utilisateur");
    }
  }
};
