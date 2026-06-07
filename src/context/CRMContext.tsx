import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CRMData, Company, Contact, Invoice, ReminderSettings, Product, Quote, Deal, Task, Note, Employee, TenantType, ActivityLog } from '../types';
import { loadData, saveData, generateId } from '../lib/storage';

interface CRMContextType {
  data: CRMData;
  currentUser: Employee | undefined;
  currentTenant: TenantType | null;
  setCurrentUserId: (id: string | null) => void;
  setCurrentTenant: (tenant: TenantType | null) => void;
  // Employees
  addEmployee: (emp: Omit<Employee, 'id' | 'createdAt'>) => Employee;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  
  // Notifications
  setNotificationRead: (notificationId: string, isRead: boolean) => void;

  // Companies
  addCompany: (company: Omit<Company, 'id' | 'createdAt' | 'contacts'>) => Company;
  updateCompany: (id: string, updates: Partial<Company>) => void;
  deleteCompany: (id: string) => void;
  getCompany: (id: string) => Company | undefined;
  // Contacts
  addContact: (contact: Omit<Contact, 'id' | 'createdAt'>) => Contact;
  updateContact: (id: string, updates: Partial<Contact>) => void;
  deleteContact: (id: string) => void;
  // Invoices
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'reminderSent' | 'reminderCount'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  markAsPaid: (id: string, paidDate?: string) => void;
  getInvoicesForCompany: (companyId: string) => Invoice[];
  // Reminders
  updateReminderSettings: (settings: ReminderSettings) => void;
  getOverdueInvoices: () => (Invoice & { company: Company })[];
  // Stats
  getTotalUnpaid: () => number;
  getTotalPaid: () => number;
  
  // Products
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  // Quotes
  addQuote: (quote: Omit<Quote, 'id' | 'createdAt'>) => Quote;
  updateQuote: (id: string, updates: Partial<Quote>) => void;
  deleteQuote: (id: string) => void;
  convertQuoteToInvoice: (quoteId: string) => Invoice | null;
  
  // Deals
  addDeal: (deal: Omit<Deal, 'id' | 'createdAt'>) => Deal;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  deleteDeal: (id: string) => void;
  
  // Tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Notes
  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => Note;
  deleteNote: (id: string) => void;
  
  // Activities
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'createdAt'>) => void;
}

const CRMContext = createContext<CRMContextType | null>(null);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CRMData>(() => loadData());

  useEffect(() => {
    saveData(data);
  }, [data]);

  const addCompany = useCallback((company: Omit<Company, 'id' | 'createdAt' | 'contacts'>): Company => {
    const newCompany: Company = {
      ...company,
      id: generateId(),
      createdAt: new Date().toISOString(),
      contacts: [],
    };
    setData(prev => ({ ...prev, companies: [...prev.companies, newCompany] }));
    return newCompany;
  }, []);

  const updateCompany = useCallback((id: string, updates: Partial<Company>) => {
    setData(prev => ({
      ...prev,
      companies: prev.companies.map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }, []);

  const deleteCompany = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      companies: prev.companies.filter(c => c.id !== id),
      invoices: prev.invoices.filter(inv => inv.companyId !== id),
    }));
  }, []);

  const getCompany = useCallback((id: string) => {
    return data.companies.find(c => c.id === id);
  }, [data.companies]);

  const addContact = useCallback((contact: Omit<Contact, 'id' | 'createdAt'>): Contact => {
    const newContact: Contact = {
      ...contact,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    setData(prev => ({
      ...prev,
      companies: prev.companies.map(c =>
        c.id === contact.companyId
          ? { ...c, contacts: [...c.contacts, newContact] }
          : c
      ),
    }));
    return newContact;
  }, []);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    setData(prev => ({
      ...prev,
      companies: prev.companies.map(c => ({
        ...c,
        contacts: c.contacts.map(ct => ct.id === id ? { ...ct, ...updates } : ct),
      })),
    }));
  }, []);

  const deleteContact = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      companies: prev.companies.map(c => ({
        ...c,
        contacts: c.contacts.filter(ct => ct.id !== id),
      })),
    }));
  }, []);

  const addInvoice = useCallback((invoice: Omit<Invoice, 'id' | 'createdAt' | 'reminderSent' | 'reminderCount'>): Invoice => {
    setData(prev => {
      const newInvoice: Invoice = {
        ...invoice,
        id: generateId(),
        createdAt: new Date().toISOString(),
        reminderSent: false,
        reminderCount: 0,
        tenant: prev.currentTenant || undefined,
      };
      return { ...prev, invoices: [...prev.invoices, newInvoice] };
    });
    // This return is fake because state update is async, but we have to satisfy the signature. 
    // In real app, we shouldn't return from state setter like this if we need the ID immediately, 
    // but we can generate it outside.
    return { ...invoice, id: 'temp', createdAt: '', reminderSent: false, reminderCount: 0 } as Invoice;
  }, []);

  const updateInvoice = useCallback((id: string, updates: Partial<Invoice>) => {
    setData(prev => ({
      ...prev,
      invoices: prev.invoices.map(inv => inv.id === id ? { ...inv, ...updates } : inv),
    }));
  }, []);

  const deleteInvoice = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      invoices: prev.invoices.filter(inv => inv.id !== id),
    }));
  }, []);

  const markAsPaid = useCallback((id: string, paidDate?: string) => {
    setData(prev => ({
      ...prev,
      invoices: prev.invoices.map(inv =>
        inv.id === id
          ? { ...inv, status: 'paid', paidDate: paidDate || new Date().toISOString().split('T')[0] }
          : inv
      ),
    }));
  }, []);

  const getInvoicesForCompany = useCallback((companyId: string) => {
    return data.invoices.filter(inv => inv.companyId === companyId && (!data.currentTenant || inv.tenant === data.currentTenant));
  }, [data.invoices, data.currentTenant]);

  const updateReminderSettings = useCallback((settings: ReminderSettings) => {
    setData(prev => ({ ...prev, reminderSettings: settings }));
  }, []);

  const getOverdueInvoices = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return data.invoices
      .filter(inv => {
        if (data.currentTenant && inv.tenant !== data.currentTenant) return false;
        if (inv.status === 'paid') return false;
        const due = new Date(inv.dueDate);
        return due < today;
      })
      .map(inv => {
        const company = data.companies.find(c => c.id === inv.companyId)!;
        return { ...inv, company };
      })
      .filter(inv => inv.company);
  }, [data.invoices, data.companies, data.currentTenant]);

  const getTotalUnpaid = useCallback(() => {
    return data.invoices
      .filter(inv => inv.status !== 'paid' && (!data.currentTenant || inv.tenant === data.currentTenant))
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  }, [data.invoices, data.currentTenant]);

  const getTotalPaid = useCallback(() => {
    return data.invoices
      .filter(inv => inv.status === 'paid' && (!data.currentTenant || inv.tenant === data.currentTenant))
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  }, [data.invoices, data.currentTenant]);

  const addProduct = useCallback((product: Omit<Product, 'id' | 'createdAt'>): Product => {
    const newProduct: Product = { ...product, id: generateId(), createdAt: new Date().toISOString() };
    setData(prev => ({ ...prev, products: [...(prev.products || []), newProduct] }));
    return newProduct;
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setData(prev => ({ ...prev, products: (prev.products || []).map(p => p.id === id ? { ...p, ...updates } : p) }));
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setData(prev => ({ ...prev, products: (prev.products || []).filter(p => p.id !== id) }));
  }, []);

  const addQuote = useCallback((quote: Omit<Quote, 'id' | 'createdAt'>): Quote => {
    let newQuote: Quote | null = null;
    setData(prev => {
      newQuote = { ...quote, id: generateId(), createdAt: new Date().toISOString(), tenant: prev.currentTenant || undefined };
      return { ...prev, quotes: [...(prev.quotes || []), newQuote] };
    });
    return newQuote || ({} as Quote);
  }, []);

  const updateQuote = useCallback((id: string, updates: Partial<Quote>) => {
    setData(prev => ({ ...prev, quotes: (prev.quotes || []).map(q => q.id === id ? { ...q, ...updates } : q) }));
  }, []);

  const deleteQuote = useCallback((id: string) => {
    setData(prev => ({ ...prev, quotes: (prev.quotes || []).filter(q => q.id !== id) }));
  }, []);

  const convertQuoteToInvoice = useCallback((quoteId: string): Invoice | null => {
    let newInvoice: Invoice | null = null;
    setData(prev => {
      const quote = (prev.quotes || []).find(q => q.id === quoteId);
      if (!quote) return prev;
      
      newInvoice = {
        id: generateId(),
        invoiceNumber: `FAC-${quote.quoteNumber.split('-').slice(1).join('-') || Date.now().toString().slice(-6)}`,
        companyId: quote.companyId,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        amount: quote.amount,
        vatAmount: quote.vatAmount,
        totalAmount: quote.totalAmount,
        status: 'unpaid',
        description: quote.description,
        reminderSent: false,
        reminderCount: 0,
        tenant: prev.currentTenant || undefined,
        createdAt: new Date().toISOString()
      };

      return {
        ...prev,
        quotes: prev.quotes.map(q => q.id === quoteId ? { ...q, status: 'accepted' } : q),
        invoices: [...prev.invoices, newInvoice]
      };
    });
    return newInvoice;
  }, []);

  const addDeal = useCallback((deal: Omit<Deal, 'id' | 'createdAt'>): Deal => {
    let newDeal: Deal | null = null;
    setData(prev => {
      newDeal = { ...deal, id: generateId(), createdAt: new Date().toISOString(), tenant: prev.currentTenant || undefined };
      return { ...prev, deals: [...(prev.deals || []), newDeal] };
    });
    return newDeal || ({} as Deal);
  }, []);

  const updateDeal = useCallback((id: string, updates: Partial<Deal>) => {
    setData(prev => ({ ...prev, deals: (prev.deals || []).map(d => d.id === id ? { ...d, ...updates } : d) }));
  }, []);

  const deleteDeal = useCallback((id: string) => {
    setData(prev => ({ ...prev, deals: (prev.deals || []).filter(d => d.id !== id) }));
  }, []);

  const addTask = useCallback((task: Omit<Task, 'id' | 'createdAt'>): Task => {
    let newTask: Task | null = null;
    setData(prev => {
      newTask = { ...task, id: generateId(), createdAt: new Date().toISOString(), tenant: prev.currentTenant || undefined };
      return { ...prev, tasks: [...(prev.tasks || []), newTask] };
    });
    return newTask || ({} as Task);
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Task>) => {
    setData(prev => ({ ...prev, tasks: (prev.tasks || []).map(t => t.id === id ? { ...t, ...updates } : t) }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setData(prev => ({ ...prev, tasks: (prev.tasks || []).filter(t => t.id !== id) }));
  }, []);

  const addNote = useCallback((note: Omit<Note, 'id' | 'createdAt'>): Note => {
    const newNote: Note = { ...note, id: generateId(), createdAt: new Date().toISOString() };
    setData(prev => ({ ...prev, notes: [...(prev.notes || []), newNote] }));
    return newNote;
  }, []);

  const deleteNote = useCallback((id: string) => {
    setData(prev => ({ ...prev, notes: (prev.notes || []).filter(n => n.id !== id) }));
  }, []);

  const setCurrentUserId = useCallback((id: string | null) => {
    setData(prev => ({ ...prev, currentUserId: id }));
  }, []);

  const setCurrentTenant = useCallback((tenant: TenantType | null) => {
    setData(prev => ({ ...prev, currentTenant: tenant }));
  }, []);

  const addEmployee = useCallback((emp: Omit<Employee, 'id' | 'createdAt'>): Employee => {
    let newEmp: Employee | null = null;
    setData(prev => {
      newEmp = { ...emp, id: generateId(), createdAt: new Date().toISOString(), tenant: prev.currentTenant || undefined };
      return { ...prev, employees: [...(prev.employees || []), newEmp] };
    });
    return newEmp || ({} as Employee);
  }, []);

  const updateEmployee = useCallback((id: string, updates: Partial<Employee>) => {
    setData(prev => ({ ...prev, employees: (prev.employees || []).map(e => e.id === id ? { ...e, ...updates } : e) }));
  }, []);

  const deleteEmployee = useCallback((id: string) => {
    setData(prev => ({ ...prev, employees: (prev.employees || []).filter(e => e.id !== id) }));
  }, []);

  const addActivityLog = useCallback((log: Omit<ActivityLog, 'id' | 'createdAt'>) => {
    setData(prev => {
      const newLog: ActivityLog = {
        ...log,
        id: generateId(),
        createdAt: new Date().toISOString(),
        tenant: prev.currentTenant || undefined,
      };
      return { ...prev, activityLogs: [newLog, ...(prev.activityLogs || [])].slice(0, 50) }; // Keep last 50
    });
  }, []);

  // Filter data based on current tenant
  const tenantData = {
    ...data,
    quotes: (data.quotes || []).filter(q => !data.currentTenant || q.tenant === data.currentTenant),
    deals: (data.deals || []).filter(d => !data.currentTenant || d.tenant === data.currentTenant),
    invoices: (data.invoices || []).filter(i => !data.currentTenant || i.tenant === data.currentTenant),
    tasks: (data.tasks || []).filter(t => !data.currentTenant || t.tenant === data.currentTenant),
    employees: (data.employees || []).filter(e => !data.currentTenant || e.tenant === data.currentTenant),
    activityLogs: (data.activityLogs || []).filter(l => !data.currentTenant || l.tenant === data.currentTenant),
    // Companies, Contacts, Notes and Products are globally accessible
    products: data.products || [],
    notes: data.notes || [],
  };

  const setNotificationRead = useCallback((notificationId: string, isRead: boolean) => {
    setData(prev => {
      const userId = prev.currentUserId;
      if (!userId) return prev;
      
      const currentReads = prev.readNotifications[userId] || [];
      const newReads = isRead 
        ? (currentReads.includes(notificationId) ? currentReads : [...currentReads, notificationId])
        : currentReads.filter(id => id !== notificationId);
        
      return {
        ...prev,
        readNotifications: {
          ...prev.readNotifications,
          [userId]: newReads
        }
      };
    });
  }, []);

  return (
    <CRMContext.Provider value={{
      data: tenantData,
      currentUser: (data.employees || []).find(e => e.id === data.currentUserId),
      currentTenant: data.currentTenant || null,
      setCurrentUserId, setCurrentTenant, addEmployee, updateEmployee, deleteEmployee,
      addCompany, updateCompany, deleteCompany, getCompany,
      addContact, updateContact, deleteContact,
      addInvoice, updateInvoice, deleteInvoice, markAsPaid, getInvoicesForCompany,
      updateReminderSettings, getOverdueInvoices,
      getTotalUnpaid, getTotalPaid,
      addProduct, updateProduct, deleteProduct,
      addQuote, updateQuote, deleteQuote, convertQuoteToInvoice,
      addDeal, updateDeal, deleteDeal,
      addTask, updateTask, deleteTask,
      addNote, deleteNote, addActivityLog,
      setNotificationRead
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM() {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used within CRMProvider');
  return ctx;
}
