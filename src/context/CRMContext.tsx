import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CRMData, Company, Contact, ReminderSettings, Product, Deal, Task, Note, Employee, TenantType, ActivityLog, FiscalSettings } from '../types';
import { loadData, saveData, generateId } from '../lib/storage';
import type { BusinessDocument, Payment, StockMovement } from '../types';

interface CRMContextType {
  data: CRMData;
  currentUser: Employee | undefined;
  currentTenant: TenantType | null;
  setCurrentUserId: (id: string | null) => void;
  setCurrentTenant: (tenant: TenantType | null) => void;
  setCurrentYearId: (yearId: string) => void;
  startNewYear: (newYearId: string, label: string) => void;
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
  getInvoicesForCompany: (companyId: string) => BusinessDocument[];
  // Reminders
  updateReminderSettings: (settings: ReminderSettings) => void;
  getOverdueInvoices: () => (BusinessDocument & { company: Company })[];
  // Stats
  getTotalUnpaid: () => number;
  getTotalPaid: () => number;
  
  // Products
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  

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
  // Stock
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'createdAt'>) => StockMovement;
  // Settings
  updateFiscalSettings: (tenant: string, settings: FiscalSettings) => void;
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'createdAt'>) => StockMovement;
  
  // ERP Documents
  addDocument: (doc: Omit<BusinessDocument, 'id' | 'createdAt' | 'reference'>) => BusinessDocument;
  updateDocument: (id: string, updates: Partial<BusinessDocument>) => void;
  deleteDocument: (id: string) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => Payment;
  getClientSituation: (companyId: string) => { totalInvoiced: number; totalPaid: number; balanceDue: number };
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
      documents: (prev.documents || []).filter(d => d.companyId !== id),
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
          ? { ...c, contacts: [...(c.contacts || []), newContact] }
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
        contacts: (c.contacts || []).map(ct => ct.id === id ? { ...ct, ...updates } : ct),
      })),
    }));
  }, []);

  const deleteContact = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      companies: prev.companies.map(c => ({
        ...c,
        contacts: (c.contacts || []).filter(ct => ct.id !== id),
      })),
    }));
  }, []);

  const getInvoicesForCompany = useCallback((companyId: string) => {
    const erpInvoices = (data.documents || []).filter(d => d.type === 'invoice');
    return erpInvoices.filter(inv => inv.companyId === companyId && (!data.currentTenant || inv.tenant === data.currentTenant));
  }, [data.documents, data.currentTenant]);

  const updateReminderSettings = useCallback((settings: ReminderSettings) => {
    setData(prev => ({ ...prev, reminderSettings: settings }));
  }, []);

  const getOverdueInvoices = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const erpInvoices = (data.documents || []).filter(d => d.type === 'invoice');
    
    return erpInvoices
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
  }, [data.documents, data.companies, data.currentTenant]);

  const getTotalUnpaid = useCallback(() => {
    const erpInvoices = (data.documents || []).filter(d => d.type === 'invoice');
    return erpInvoices
      .filter(inv => inv.status !== 'paid' && (!data.currentTenant || inv.tenant === data.currentTenant))
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  }, [data.documents, data.currentTenant]);

  const getTotalPaid = useCallback(() => {
    const erpInvoices = (data.documents || []).filter(d => d.type === 'invoice');
    return erpInvoices
      .filter(inv => inv.status === 'paid' && (!data.currentTenant || inv.tenant === data.currentTenant))
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  }, [data.documents, data.currentTenant]);

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

  const addDeal = useCallback((deal: Omit<Deal, 'id' | 'createdAt'>): Deal => {
    let newDeal: Deal | null = null;
    setData(prev => {
      newDeal = { ...deal, id: generateId(), createdAt: new Date().toISOString(), tenant: prev.currentTenant || undefined, fiscalYear: prev.currentYearId || new Date().getFullYear().toString() };
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
      newTask = { ...task, id: generateId(), createdAt: new Date().toISOString(), tenant: prev.currentTenant || undefined, fiscalYear: prev.currentYearId || new Date().getFullYear().toString() };
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

  const setCurrentYearId = useCallback((yearId: string) => {
    setData(prev => ({ ...prev, currentYearId: yearId }));
  }, []);

  const startNewYear = useCallback((newYearId: string, label: string) => {
    setData(prev => {
      if (prev.fiscalYears?.find(y => y.id === newYearId)) {
        alert("Cette année existe déjà.");
        return prev;
      }

      const currentYearId = prev.currentYearId || new Date().getFullYear().toString();
      
      const newFiscalYear = { id: newYearId, label, isClosed: false };
      const newYearsList = [...(prev.fiscalYears || [{ id: currentYearId, label: currentYearId, isClosed: false }]), newFiscalYear];

      // Option B : Duplication
      // 1. Documents (Factures impayées/partielles, Devis/BL en brouillon ou validés non facturés)
      const docsToDuplicate = (prev.documents || []).filter(d => 
        (d.fiscalYear || currentYearId) === currentYearId &&
        (
          (d.type === 'invoice' && d.status !== 'paid' && d.status !== 'cancelled') ||
          (d.type === 'proforma' && d.status !== 'cancelled') ||
          (d.type === 'delivery_note' && d.status !== 'cancelled')
        )
      );

      const duplicatedDocs = docsToDuplicate.map(d => ({
        ...d,
        id: generateId(), // New ID
        fiscalYear: newYearId,
        createdAt: new Date().toISOString()
      }));

      // Map old document IDs to new document IDs to duplicate payments
      const docIdMap = new Map(docsToDuplicate.map((d, i) => [d.id, duplicatedDocs[i].id]));

      // 2. Payments (only for the duplicated invoices to preserve the "reste à payer")
      const paymentsToDuplicate = (prev.payments || []).filter(p => 
        (p.fiscalYear || currentYearId) === currentYearId && docIdMap.has(p.documentId)
      );

      const duplicatedPayments = paymentsToDuplicate.map(p => ({
        ...p,
        id: generateId(),
        documentId: docIdMap.get(p.documentId)!,
        fiscalYear: newYearId
      }));

      // 3. Deals (Pipeline en cours : lead, proposal, negotiation)
      const dealsToDuplicate = (prev.deals || []).filter(d => 
        (d.fiscalYear || currentYearId) === currentYearId &&
        ['lead', 'proposal', 'negotiation'].includes(d.stage)
      );

      const duplicatedDeals = dealsToDuplicate.map(d => ({
        ...d,
        id: generateId(),
        fiscalYear: newYearId,
        createdAt: new Date().toISOString()
      }));

      // 4. Tasks (Non terminées)
      const tasksToDuplicate = (prev.tasks || []).filter(t => 
        (t.fiscalYear || currentYearId) === currentYearId && !t.completed
      );

      const duplicatedTasks = tasksToDuplicate.map(t => ({
        ...t,
        id: generateId(),
        fiscalYear: newYearId,
        createdAt: new Date().toISOString()
      }));

      return {
        ...prev,
        fiscalYears: newYearsList,
        currentYearId: newYearId,
        documents: [...(prev.documents || []), ...duplicatedDocs],
        payments: [...(prev.payments || []), ...duplicatedPayments],
        deals: [...(prev.deals || []), ...duplicatedDeals],
        tasks: [...(prev.tasks || []), ...duplicatedTasks]
      };
    });
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
        fiscalYear: prev.currentYearId || new Date().getFullYear().toString(),
      };
      return { ...prev, activityLogs: [newLog, ...(prev.activityLogs || [])].slice(0, 50) }; // Keep last 50
    });
  }, []);

  const addStockMovement = useCallback((movement: Omit<StockMovement, 'id' | 'createdAt'>): StockMovement => {
    let newMov: StockMovement | null = null;
    setData(prev => {
      newMov = { ...movement, id: generateId(), createdAt: new Date().toISOString() };
      
      // Update product stock directly
      const updatedProducts = (prev.products || []).map(p => {
        if (p.id === movement.productId) {
          const t = movement.tenant;
          const currentStock = p.stock?.[t] || 0;
          const diff = movement.type === 'in' ? movement.quantity : -movement.quantity;
          return {
            ...p,
            stock: {
              ...(p.stock || {}),
              [t]: Math.max(0, currentStock + diff) // Prevent negative stock for simplicity
            }
          };
        }
        return p;
      });

      return { 
        ...prev, 
        stockMovements: [...(prev.stockMovements || []), newMov],
        products: updatedProducts
      };
    });
    return newMov || ({} as StockMovement);
  }, []);

  const addDocument = useCallback((doc: Omit<BusinessDocument, 'id' | 'createdAt' | 'reference'>): BusinessDocument => {
    let newDoc: BusinessDocument | null = null;
    setData(prev => {
      const tenant = prev.currentTenant || doc.tenant;
      const t = tenant === 'katamine' ? 'KTM' : 'KLT';
      const year = new Date().getFullYear();
      
      let reference = `BROUILLON-${generateId().slice(0, 5)}`;
      let nextCounter = null;
      let counterKey = '';

      if (doc.status === 'validated') {
        const typePrefix = doc.type === 'invoice' ? 'FAC' : doc.type === 'proforma' ? 'PRO' : doc.type === 'delivery_note' ? 'BL' : 'BC';
        counterKey = `${typePrefix}_${t}_${year}`;
        const currentCounter = (prev.documentCounters || {})[counterKey] || 0;
        nextCounter = currentCounter + 1;
        reference = `${typePrefix}-${t}-${year}-${nextCounter.toString().padStart(4, '0')}`;
      }
      
      newDoc = { 
        ...doc, 
        id: generateId(), 
        reference,
        createdAt: new Date().toISOString(), 
        tenant,
        fiscalYear: prev.currentYearId || new Date().getFullYear().toString()
      };

      let newMovements = [...(prev.stockMovements || [])];
      let updatedProducts = [...(prev.products || [])];

      if (newDoc.status === 'validated' && (newDoc.type === 'invoice' || newDoc.type === 'delivery_note')) {
        newDoc.items.forEach(item => {
          if (item.productId) {
            newMovements.push({
              id: generateId(),
              productId: item.productId,
              type: 'out',
              quantity: item.quantity,
              referenceId: newDoc!.id,
              tenant,
              createdAt: new Date().toISOString()
            });

            updatedProducts = updatedProducts.map(p => {
              if (p.id === item.productId) {
                const currentStock = p.stock?.[tenant] || 0;
                return { ...p, stock: { ...(p.stock || {}), [tenant]: Math.max(0, currentStock - item.quantity) } };
              }
              return p;
            });
          }
        });
      }

      const countersUpdate = nextCounter !== null ? { [counterKey]: nextCounter } : {};

      return { 
        ...prev, 
        documents: [...(prev.documents || []), newDoc],
        documentCounters: { ...(prev.documentCounters || {}), ...countersUpdate },
        stockMovements: newMovements,
        products: updatedProducts
      };
    });
    return newDoc || ({} as BusinessDocument);
  }, []);

  const updateDocument = useCallback((id: string, updates: Partial<BusinessDocument>) => {
    setData(prev => {
      const docs = prev.documents || [];
      const oldDoc = docs.find(d => d.id === id);
      if (!oldDoc) return prev;

      // Business Rule: Can only modify drafts. If not draft, can only change status (e.g. to cancelled or paid)
      const updatedKeys = Object.keys(updates);
      const isStatusOnlyChange = updatedKeys.every(k => k === 'status');
      if (oldDoc.status !== 'draft' && !isStatusOnlyChange) {
        console.warn("Modification refusée : La facture n'est plus à l'état de brouillon.");
        return prev;
      }

      const newDoc = { ...oldDoc, ...updates };
      let newMovements = [...(prev.stockMovements || [])];
      let updatedProducts = [...(prev.products || [])];
      let newCounters = { ...(prev.documentCounters || {}) };

      // Transition Draft -> Validated
      if (oldDoc.status === 'draft' && newDoc.status === 'validated') {
        const t = newDoc.tenant === 'katamine' ? 'KTM' : 'KLT';
        const year = new Date(newDoc.date || Date.now()).getFullYear();
        const typePrefix = newDoc.type === 'invoice' ? 'FAC' : newDoc.type === 'proforma' ? 'PRO' : newDoc.type === 'delivery_note' ? 'BL' : 'BC';
        const counterKey = `${typePrefix}_${t}_${year}`;
        const currentCounter = newCounters[counterKey] || 0;
        const nextCounter = currentCounter + 1;
        
        newDoc.reference = `${typePrefix}-${t}-${year}-${nextCounter.toString().padStart(4, '0')}`;
        newCounters[counterKey] = nextCounter;

        if (newDoc.type === 'invoice' || newDoc.type === 'delivery_note') {
          newDoc.items.forEach(item => {
            if (item.productId) {
              newMovements.push({
                id: generateId(),
                productId: item.productId,
                type: 'out',
                quantity: item.quantity,
                referenceId: newDoc.id,
                tenant: newDoc.tenant,
                createdAt: new Date().toISOString()
              });

              updatedProducts = updatedProducts.map(p => {
                if (p.id === item.productId) {
                  const currentStock = p.stock?.[newDoc.tenant] || 0;
                  return { ...p, stock: { ...(p.stock || {}), [newDoc.tenant]: Math.max(0, currentStock - item.quantity) } };
                }
                return p;
              });
            }
          });
        }
      }

      // If a purchase order becomes 'received', increase stock
      if (oldDoc.type === 'purchase_order' && oldDoc.status !== 'received' && newDoc.status === 'received') {
        newDoc.items.forEach(item => {
          if (item.productId) {
            newMovements.push({
              id: generateId(),
              productId: item.productId,
              type: 'in',
              quantity: item.quantity,
              referenceId: newDoc.id,
              tenant: newDoc.tenant,
              createdAt: new Date().toISOString()
            });

            updatedProducts = updatedProducts.map(p => {
              if (p.id === item.productId) {
                const currentStock = p.stock?.[newDoc.tenant] || 0;
                return { ...p, stock: { ...(p.stock || {}), [newDoc.tenant]: currentStock + item.quantity } };
              }
              return p;
            });
          }
        });
      }

      return { 
        ...prev, 
        documents: docs.map(d => d.id === id ? newDoc : d),
        documentCounters: newCounters,
        stockMovements: newMovements,
        products: updatedProducts
      };
    });
  }, []);

  const deleteDocument = useCallback((id: string) => {
    setData(prev => {
      const docs = prev.documents || [];
      const doc = docs.find(d => d.id === id);
      if (doc && doc.status !== 'draft') {
        alert("Interdit : Vous ne pouvez pas supprimer un document validé. Veuillez l'annuler à la place.");
        return prev;
      }
      return { ...prev, documents: docs.filter(d => d.id !== id) };
    });
  }, []);

  const addPayment = useCallback((payment: Omit<Payment, 'id'>): Payment => {
    let newPayment: Payment | null = null;
    setData(prev => {
      newPayment = { ...payment, id: generateId(), tenant: prev.currentTenant || payment.tenant, fiscalYear: prev.currentYearId || new Date().getFullYear().toString() };
      const newPaymentsList = [...(prev.payments || []), newPayment];
      let newDocs = [...(prev.documents || [])];

      // Auto update document status to paid or partially_paid if total paid >= total amount
      if (newPayment.documentId) {
        const doc = newDocs.find(d => d.id === newPayment!.documentId);
        if (doc && doc.status !== 'paid' && doc.status !== 'cancelled') {
          const totalPaidForDoc = newPaymentsList
            .filter(p => p.documentId === doc.id)
            .reduce((sum, p) => sum + p.amount, 0);
            
          let newStatus = doc.status;
          if (totalPaidForDoc >= doc.totalAmount) {
            newStatus = 'paid';
          } else if (totalPaidForDoc > 0) {
            newStatus = 'partially_paid';
          }
          
          if (newStatus !== doc.status) {
            newDocs = newDocs.map(d => d.id === doc.id ? { ...d, status: newStatus } : d);
          }
        }
      }

      return { 
        ...prev, 
        payments: newPaymentsList,
        documents: newDocs
      };
    });
    return newPayment || ({} as Payment);
  }, []);

  const getClientSituation = useCallback((companyId: string) => {
    const docs = data.documents || [];
    const pays = data.payments || [];
    
    const invoices = docs.filter(d => 
      d.companyId === companyId && 
      d.type === 'invoice' && 
      (d.status === 'validated' || d.status === 'partially_paid' || d.status === 'paid') &&
      (!data.currentTenant || d.tenant === data.currentTenant)
    );
    
    const clientPayments = pays.filter(p => 
      p.companyId === companyId &&
      (!data.currentTenant || p.tenant === data.currentTenant)
    );

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = totalInvoiced - totalPaid;

    return { totalInvoiced, totalPaid, balanceDue };
  }, [data.documents, data.payments, data.currentTenant]);

  const updateFiscalSettings = useCallback((tenant: string, settings: FiscalSettings) => {
    setData(prev => ({
      ...prev,
      fiscalSettings: {
        ...(prev.fiscalSettings || {}),
        [tenant]: settings
      }
    }));
  }, []);

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

  // Filter data based on current tenant and current year
  const defaultYearId = new Date().getFullYear().toString();
  const currentYearId = data.currentYearId || defaultYearId;
  const fiscalYears = data.fiscalYears && data.fiscalYears.length > 0 
    ? data.fiscalYears 
    : [{ id: defaultYearId, label: defaultYearId, isClosed: false }];

  const filterByTenantAndYear = <T extends { tenant?: TenantType, fiscalYear?: string }>(items: T[]) => {
    return items.filter(item => 
      (!data.currentTenant || item.tenant === data.currentTenant) &&
      (item.fiscalYear || defaultYearId) === currentYearId
    );
  };

  const tenantData = {
    ...data,
    currentYearId,
    fiscalYears,
    deals: filterByTenantAndYear(data.deals || []),
    tasks: filterByTenantAndYear(data.tasks || []),
    employees: (data.employees || []).filter(e => !data.currentTenant || e.tenant === data.currentTenant),
    activityLogs: filterByTenantAndYear(data.activityLogs || []),
    documents: filterByTenantAndYear(data.documents || []),
    payments: filterByTenantAndYear(data.payments || []),
    stockMovements: (data.stockMovements || []).filter(s => !data.currentTenant || s.tenant === data.currentTenant), // stock is global across years
    products: data.products || [],
    notes: data.notes || [],
  };

  return (
    <CRMContext.Provider value={{
      data: tenantData,
      currentUser: (data.employees || []).find(e => e.id === data.currentUserId),
      currentTenant: data.currentTenant || null,
      setCurrentUserId, setCurrentTenant, setCurrentYearId, startNewYear, addEmployee, updateEmployee, deleteEmployee,
      addCompany, updateCompany, deleteCompany, getCompany,
      addContact, updateContact, deleteContact,
      getInvoicesForCompany,
      updateReminderSettings, getOverdueInvoices,
      getTotalUnpaid, getTotalPaid,
      addProduct, updateProduct, deleteProduct,
      addDeal, updateDeal, deleteDeal,
      addTask, updateTask, deleteTask,
      addNote, deleteNote, addActivityLog,
      setNotificationRead,
      addDocument, updateDocument, deleteDocument, addPayment, getClientSituation,
      addStockMovement, updateFiscalSettings
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
