import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CRMData, Company, Contact, ReminderSettings, Product, Deal, Task, Note, Employee, TenantType, ActivityLog, FiscalSettings, Expense } from '../types';
import { loadData, saveData, generateId } from '../lib/storage';
import { api } from '../lib/api';
import type { BusinessDocument, Payment, StockMovement } from '../types';

interface CRMContextType {
  data: CRMData;
  currentUser: Employee | undefined;
  currentTenant: TenantType | null;
  setCurrentUserId: (id: string | null, userObj?: any) => void;
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
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'createdAt'>) => void;
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
  getSupplierSituation: (companyId: string) => { totalInvoiced: number; totalPaid: number; balanceDue: number };

  // Expenses
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Expense;
  updateExpense: (id: string, updates: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
}

const CRMContext = createContext<CRMContextType | null>(null);

export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CRMData>(() => loadData());
  const [isInitializing, setIsInitializing] = useState(true);

  // Synchronisation avec l'API au démarrage
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const [companiesRes, productsRes, documentsRes, expensesRes, paymentsRes] = await Promise.allSettled([
          api.getCompanies(),
          api.getProducts(),
          api.getDocuments(),
          api.getExpenses(),
          api.getPayments()
        ]);

        let companies: Company[] = [];
        let products: Product[] = [];
        let documents: BusinessDocument[] = [];
        let expenses: Expense[] = [];
        let payments: Payment[] = [];

        if (companiesRes.status === 'fulfilled') companies = companiesRes.value.data || [];
        if (productsRes.status === 'fulfilled') products = productsRes.value.data || [];
        if (documentsRes.status === 'fulfilled') documents = documentsRes.value.data || [];
        if (expensesRes.status === 'fulfilled') expenses = expensesRes.value.data || [];
        if (paymentsRes.status === 'fulfilled') payments = paymentsRes.value.data || [];

        // Auto-heal document statuses based on payments (fixes legacy data)
        let healedDocuments = [...documents];
        let hasHealed = false;
        
        healedDocuments = healedDocuments.map(doc => {
          if (doc.status !== 'paid' && doc.status !== 'cancelled') {
            const totalPaidForDoc = payments
              .filter((p: any) => p.documentId === doc.id)
              .reduce((sum: number, p: any) => sum + p.amount, 0);
            
            let newStatus = doc.status;
            if (totalPaidForDoc >= doc.totalAmount && doc.totalAmount > 0) {
              newStatus = 'paid';
            } else if (totalPaidForDoc > 0) {
              newStatus = 'partially_paid';
            }
            
            if (newStatus !== doc.status) {
              hasHealed = true;
              const healedDoc = { ...doc, status: newStatus };
              // Fire-and-forget update to the DB
              api.updateDocument(doc.id, healedDoc).catch(() => {});
              return healedDoc;
            }
          }
          return doc;
        });

        setData(prev => ({
          ...prev,
          companies,
          products,
          documents: healedDocuments,
          expenses,
          payments
        }));
      } catch (err) {
        console.error('Erreur de synchronisation avec l\'API:', err);
      } finally {
        setIsInitializing(false);
      }
    };

    fetchData();
  }, [data.currentUser]); // Re-fetch quand l'utilisateur change

  // Sauvegarde dans le localStorage (pour les logs, employés, configs)
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
    
    // Mise à jour optimiste
    setData(prev => ({ ...prev, companies: [...prev.companies, newCompany] }));
    
    // Envoi à l'API
    api.addCompany(newCompany).catch(err => {
      alert("Erreur lors de la création de l'entreprise: " + err.message);
      // Rollback
      setData(prev => ({
        ...prev,
        companies: prev.companies.filter(c => c.id !== newCompany.id)
      }));
    });
    
    return newCompany;
  }, []);

  const updateCompany = useCallback((id: string, updates: Partial<Company>) => {
    setData(prev => {
      const newCompanies = prev.companies.map(c => c.id === id ? { ...c, ...updates } : c);
      const fullEntity = newCompanies.find(c => c.id === id);
      if (fullEntity) {
        api.updateCompany(id, fullEntity).catch(err => alert("Erreur lors de la modification de l'entreprise: " + err.message));
      }
      return { ...prev, companies: newCompanies };
    });
  }, []);

  const deleteCompany = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      companies: prev.companies.filter(c => c.id !== id),
      documents: (prev.documents || []).filter(d => d.companyId !== id),
    }));
    api.deleteCompany(id).catch(err => alert("Erreur Serveur: " + err.message));
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
    setData(prev => {
      const company = prev.companies.find(c => c.id === contact.companyId);
      if (company) {
        const updatedContacts = [...(company.contacts || []), newContact];
        api.updateCompany(company.id, { ...company, contacts: updatedContacts }).catch(err => alert("Erreur Serveur: " + err.message));
      }
      return {
        ...prev,
        companies: prev.companies.map(c =>
          c.id === contact.companyId
            ? { ...c, contacts: [...(c.contacts || []), newContact] }
            : c
        ),
      };
    });
    return newContact;
  }, []);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => {
    setData(prev => {
      let targetCompany: Company | null = null;
      let updatedContacts: Contact[] = [];
      const newCompanies = prev.companies.map(c => {
        if ((c.contacts || []).some(ct => ct.id === id)) {
          targetCompany = c;
          updatedContacts = (c.contacts || []).map(ct => ct.id === id ? { ...ct, ...updates } : ct);
          return { ...c, contacts: updatedContacts };
        }
        return c;
      });
      if (targetCompany) {
        api.updateCompany(targetCompany.id, { ...targetCompany, contacts: updatedContacts }).catch(err => alert("Erreur Serveur: " + err.message));
      }
      return { ...prev, companies: newCompanies };
    });
  }, []);

  const deleteContact = useCallback((id: string) => {
    setData(prev => {
      let targetCompany: Company | null = null;
      let updatedContacts: Contact[] = [];
      const newCompanies = prev.companies.map(c => {
        if ((c.contacts || []).some(ct => ct.id === id)) {
          targetCompany = c;
          updatedContacts = (c.contacts || []).filter(ct => ct.id !== id);
          return { ...c, contacts: updatedContacts };
        }
        return c;
      });
      if (targetCompany) {
        api.updateCompany(targetCompany.id, { ...targetCompany, contacts: updatedContacts }).catch(err => alert("Erreur Serveur: " + err.message));
      }
      return { ...prev, companies: newCompanies };
    });
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
    setData(prev => ({ ...prev, products: [...prev.products, newProduct] }));
    
    api.addProduct(newProduct).catch(err => {
      alert("Erreur lors de la création du produit: " + err.message);
      setData(prev => ({
        ...prev,
        products: prev.products.filter(p => p.id !== newProduct.id)
      }));
    });
    
    return newProduct;
  }, []);

  const updateProduct = useCallback((id: string, updates: Partial<Product>) => {
    setData(prev => {
      const newProducts = prev.products.map(p => p.id === id ? { ...p, ...updates } : p);
      const fullEntity = newProducts.find(p => p.id === id);
      if (fullEntity) {
        api.updateProduct(id, fullEntity).catch(err => alert("Erreur Serveur: " + err.message));
      }
      return { ...prev, products: newProducts };
    });
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setData(prev => ({ ...prev, products: (prev.products || []).filter(p => p.id !== id) }));
    api.deleteProduct(id).catch(err => alert("Erreur Serveur: " + err.message));
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

  const setCurrentUserId = useCallback((id: string | null, userObj?: any) => {
    setData(prev => {
      const newState = { ...prev, currentUserId: id };
      if (userObj && id) {
        const exists = (newState.employees || []).some(e => e.id === id);
        if (!exists) {
          newState.employees = [...(newState.employees || []), userObj];
        }
      }
      return newState;
    });
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
          ((d.type === 'invoice' || d.type === 'supplier_invoice') && d.status !== 'paid' && d.status !== 'cancelled') ||
          (d.type === 'proforma' && d.status !== 'cancelled') ||
          (d.type === 'delivery_note' && d.status !== 'cancelled') ||
          (d.type === 'receipt_note' && d.status !== 'cancelled') ||
          (d.type === 'purchase_order' && d.status !== 'received' && d.status !== 'cancelled')
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
    setTimeout(() => {
      if (newMov) api.addStockMovement(newMov).catch(err => alert("Erreur Serveur: " + err.message));
    }, 0);
    return newMov || ({} as StockMovement);
  }, []);

  const addDocument = useCallback((doc: Omit<BusinessDocument, 'id' | 'createdAt' | 'reference'>): BusinessDocument => {
    const newDoc = { ...doc, id: generateId(), createdAt: new Date().toISOString() } as BusinessDocument;
    
    setData(prev => {
      const tenant = prev.currentTenant || doc.tenant;
      newDoc.tenant = tenant;
      const t = tenant === 'katamine' ? 'KTM' : 'KLT';
      const year = new Date().getFullYear();
      
      let reference = `BROUILLON-${newDoc.id.slice(0, 5)}`;
      let nextCounter = null;
      let counterKey = '';

      if (doc.status === 'validated') {
        const typePrefix = doc.type === 'invoice' ? 'FAC' : doc.type === 'proforma' ? 'PRO' : doc.type === 'delivery_note' ? 'BL' : 'BC';
        const prefix = `${typePrefix}-${t}-${year}-`;
        
        // Find the maximum counter for this prefix from existing documents
        const existingDocs = (prev.documents || []).filter(d => d.reference && d.reference.startsWith(prefix));
        const maxCounter = existingDocs.reduce((max, d) => {
          const parts = d.reference!.split('-');
          const num = parseInt(parts[parts.length - 1], 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        
        nextCounter = maxCounter + 1;
        reference = `${prefix}${nextCounter.toString().padStart(4, '0')}`;
      }
      
      newDoc.reference = reference;
      newDoc.fiscalYear = prev.currentYearId || new Date().getFullYear().toString();

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
    
    setTimeout(() => {
      api.addDocument(newDoc).catch(err => alert("Erreur Serveur: " + err.message));
    }, 0);
    
    return newDoc;
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

      if (oldDoc.status === 'draft' && newDoc.status === 'validated') {
        const t = newDoc.tenant === 'katamine' ? 'KTM' : 'KLT';
        const year = new Date(newDoc.date || Date.now()).getFullYear();
        const typePrefix = newDoc.type === 'invoice' ? 'FAC' : newDoc.type === 'proforma' ? 'PRO' : newDoc.type === 'delivery_note' ? 'BL' : 'BC';
        const prefix = `${typePrefix}-${t}-${year}-`;
        
        const existingDocs = docs.filter(d => d.reference && d.reference.startsWith(prefix));
        const maxCounter = existingDocs.reduce((max, d) => {
          const parts = d.reference!.split('-');
          const num = parseInt(parts[parts.length - 1], 10);
          return !isNaN(num) && num > max ? num : max;
        }, 0);
        
        const nextCounter = maxCounter + 1;
        newDoc.reference = `${prefix}${nextCounter.toString().padStart(4, '0')}`;

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

      const newDocs = docs.map(d => d.id === id ? newDoc : d);
      api.updateDocument(id, newDoc).catch(err => alert("Erreur Serveur: " + err.message));
      
      return { 
        ...prev, 
        documents: newDocs,
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
    setTimeout(() => {
      api.deleteDocument(id).catch(err => alert("Erreur Serveur: " + err.message));
    }, 0);
  }, []);

  const addPayment = useCallback((payment: Omit<Payment, 'id'>): Payment => {
    const newPayment = { ...payment, id: generateId() } as Payment;
    
    setData(prev => {
      newPayment.tenant = prev.currentTenant || payment.tenant;
      newPayment.fiscalYear = prev.currentYearId || new Date().getFullYear().toString();
      
      const newPaymentsList = [...(prev.payments || []), newPayment];
      let newDocs = [...(prev.documents || [])];

      // Auto update document status to paid or partially_paid if total paid >= total amount
      if (newPayment.documentId) {
        const doc = newDocs.find(d => d.id === newPayment.documentId);
        if (doc) {
          const totalPaid = newPaymentsList.filter(p => p.documentId === doc.id).reduce((sum, p) => sum + p.amount, 0);
          if (totalPaid >= doc.totalAmount) {
            const updatedDoc = { ...doc, status: 'paid' as const };
            newDocs = newDocs.map(d => d.id === doc.id ? updatedDoc : d);
            setTimeout(() => {
              api.updateDocument(doc.id, updatedDoc).catch(err => console.error("Failed to update doc status:", err));
            }, 0);
          } else if (totalPaid > 0) {
            const updatedDoc = { ...doc, status: 'partially_paid' as const };
            newDocs = newDocs.map(d => d.id === doc.id ? updatedDoc : d);
            setTimeout(() => {
              api.updateDocument(doc.id, updatedDoc).catch(err => console.error("Failed to update doc status:", err));
            }, 0);
          }
        }
      }

      return { ...prev, payments: newPaymentsList, documents: newDocs };
    });
    
    setTimeout(() => {
      api.addPayment(newPayment).catch(err => alert("Erreur Serveur: " + err.message));
    }, 0);
    
    return newPayment;
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
    
    const invoiceIds = invoices.map(i => i.id);
    const clientPayments = pays.filter(p => 
      (invoiceIds.includes(p.documentId) || p.companyId === companyId) &&
      (!data.currentTenant || p.tenant === data.currentTenant)
    );

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = clientPayments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = totalInvoiced - totalPaid;

    return { totalInvoiced, totalPaid, balanceDue };
  }, [data.documents, data.payments, data.currentTenant]);

  const getSupplierSituation = useCallback((companyId: string) => {
    const docs = data.documents || [];
    const pays = data.payments || [];
    
    const invoices = docs.filter(d => 
      d.companyId === companyId && 
      d.type === 'supplier_invoice' && 
      (d.status === 'validated' || d.status === 'partially_paid' || d.status === 'paid') &&
      (!data.currentTenant || d.tenant === data.currentTenant)
    );
    
    const invoiceIds = invoices.map(i => i.id);
    const supplierPayments = pays.filter(p => 
      (invoiceIds.includes(p.documentId) || p.companyId === companyId) &&
      (!data.currentTenant || p.tenant === data.currentTenant)
    );

    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const totalPaid = supplierPayments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = totalInvoiced - totalPaid;

    return { totalInvoiced, totalPaid, balanceDue };
  }, [data.documents, data.payments, data.currentTenant]);

  const addExpense = useCallback((expense: Omit<Expense, 'id' | 'createdAt'>): Expense => {
    const newExpense = {
      ...expense,
      id: generateId(),
      createdAt: new Date().toISOString()
    } as Expense;
    
    setData(prev => {
      newExpense.tenant = prev.currentTenant || undefined;
      return { ...prev, expenses: [...(prev.expenses || []), newExpense] };
    });
    
    setTimeout(() => {
      api.addExpense(newExpense).catch(err => alert("Erreur Serveur: " + err.message));
    }, 0);
    
    return newExpense;
  }, []);

  const updateExpense = useCallback((id: string, updates: Partial<Expense>) => {
    setData(prev => {
      const newExpenses = (prev.expenses || []).map(e => e.id === id ? { ...e, ...updates } : e);
      const fullEntity = newExpenses.find(e => e.id === id);
      if (fullEntity) {
        api.updateExpense(id, fullEntity).catch(err => alert("Erreur Serveur: " + err.message));
      }
      return { ...prev, expenses: newExpenses };
    });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      expenses: (prev.expenses || []).filter(e => e.id !== id)
    }));
    api.deleteExpense(id).catch(err => alert("Erreur Serveur: " + err.message));
  }, []);

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
    expenses: filterByTenantAndYear(data.expenses || []),
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
      addNote, deleteNote,
      addDocument, updateDocument, deleteDocument, addPayment, getClientSituation, getSupplierSituation,
      addStockMovement,
      addExpense, updateExpense, deleteExpense
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
