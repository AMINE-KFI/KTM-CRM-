// src/lib/api.ts
import type { Company, Product, BusinessDocument, Expense, Payment } from '../types';

// Temporairement forcé vers le serveur de production pour faciliter vos tests
export const API_URL = 'https://api.katamine.dz/api';

const getHeaders = () => {
  const token = localStorage.getItem('token'); // On stockera le JWT ici
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
};

export const api = {
  // Stats
  getStats: async (tenant?: string) => {
    const tenantParam = tenant ? `?tenant=${tenant}` : '';
    const res = await fetch(`${API_URL}/stats${tenantParam}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur récupération statistiques');
    return res.json();
  },

  // Companies
  getCompanies: async (page = 1, limit = 50): Promise<{ data: Company[], total: number, page: number, limit: number }> => {
    const res = await fetch(`${API_URL}/companies?page=${page}&limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur récupération clients');
    const json = await res.json();
    const isArray = Array.isArray(json);
    const data = isArray ? json : (json.data || []);
    return {
      data: data.map((c: any) => ({
        ...c,
        contacts: typeof c.contacts === 'string' ? JSON.parse(c.contacts) : (c.contacts || [])
      })),
      total: isArray ? data.length : (json.total || 0),
      page,
      limit
    };
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
  getProducts: async (page = 1, limit = 50): Promise<{ data: Product[], total: number, page: number, limit: number }> => {
    const res = await fetch(`${API_URL}/products?page=${page}&limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur récupération produits');
    const json = await res.json();
    const isArray = Array.isArray(json);
    const data = isArray ? json : (json.data || []);
    return {
      data: data.map((p: any) => ({
        ...p,
        prices: typeof p.prices === 'string' ? JSON.parse(p.prices) : (p.prices || [])
      })),
      total: isArray ? data.length : (json.total || 0),
      page,
      limit
    };
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
  getDocuments: async (page = 1, limit = 50, tenant?: string): Promise<{ data: BusinessDocument[], total: number, page: number, limit: number }> => {
    const tenantParam = tenant ? `&tenant=${tenant}` : '';
    const res = await fetch(`${API_URL}/documents?page=${page}&limit=${limit}${tenantParam}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur récupération documents');
    const json = await res.json();
    const isArray = Array.isArray(json);
    const data = isArray ? json : (json.data || []);
    return {
      data: data.map((d: any) => ({
        ...d,
        companyId: d.company_id || d.companyId,
        dueDate: d.due_date || d.dueDate,
        subtotal: Number(d.sub_total || d.subtotal || 0),
        vatAmount: Number(d.tax_total || d.vatAmount || 0),
        totalAmount: Number(d.total_amount || d.totalAmount || 0),
        stampAmount: Number(d.stamp_amount || d.stampAmount || 0),
        paymentMethod: d.payment_method || d.paymentMethod || 'À échéance',
        fiscalYear: d.fiscal_year || d.fiscalYear,
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
      })),
      total: isArray ? data.length : (json.total || 0),
      page,
      limit
    };
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
  getExpenses: async (page = 1, limit = 50): Promise<{ data: Expense[], total: number, page: number, limit: number }> => {
    const res = await fetch(`${API_URL}/expenses?page=${page}&limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur récupération dépenses');
    const json = await res.json();
    const isArray = Array.isArray(json);
    const data = isArray ? json : (json.data || []);
    return {
      data: data.map((e: any) => ({
        ...e,
        amount: Number(e.amount || 0),
        paymentMethod: e.payment_method || e.paymentMethod,
        fiscalYear: e.fiscal_year || e.fiscalYear,
        createdAt: e.created_at || e.createdAt
      })),
      total: isArray ? data.length : (json.total || 0),
      page,
      limit
    };
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
  getPayments: async (page = 1, limit = 50): Promise<{ data: Payment[], total: number, page: number, limit: number }> => {
    const res = await fetch(`${API_URL}/payments?page=${page}&limit=${limit}`, { headers: getHeaders() });
    if (!res.ok) throw new Error('Erreur récupération paiements');
    const json = await res.json();
    const isArray = Array.isArray(json);
    const data = isArray ? json : (json.data || []);
    return {
      data: data.map((p: any) => ({
        ...p,
        amount: Number(p.amount || 0),
        documentId: p.document_id || p.documentId,
        companyId: p.company_id || p.companyId,
        fiscalYear: p.fiscal_year || p.fiscalYear,
        createdAt: p.created_at || p.createdAt,
        mode: p.method || p.mode
      })),
      total: isArray ? data.length : (json.total || 0),
      page,
      limit
    };
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
  }
};
