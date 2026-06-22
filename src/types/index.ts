export type ContactDepartment = 'approvisionnement' | 'comptabilite' | 'direction' | 'commercial' | 'technique' | 'autre';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  mobile?: string;
  position: string;
  department: ContactDepartment;
  notes?: string;
  companyId: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  role?: 'client' | 'supplier' | 'both';
  legalForm: string; // SARL, SAS, SA, etc.
  nif?: string; // NIF
  nis?: string; // NIS
  rc?: string; // Registre de Commerce
  // Address
  address: string;
  city: string;
  postalCode: string;
  country: string;
  // Fiscal
  fiscalYear?: string;
  art?: string;
  capital?: string;
  // Contact
  email?: string;
  phone?: string;
  website?: string;
  // Meta
  notes?: string;
  createdAt: string;
  contacts: Contact[];
}

export interface ReminderSettings {
  enabled: boolean;
  firstReminderDays: number;  // days after due date
  secondReminderDays: number;
  thirdReminderDays: number;
  senderName: string;
  senderEmail: string;
  companyName: string;
}

export type TenantType = 'katamine' | 'kltools';

export interface Product {
  id: string;
  name: string;
  brand?: string;
  description?: string;
  price: number; // Prix par défaut historique (vente)
  purchasePrice?: number; // Prix d'achat optionnel
  prices?: Record<string, number>;
  stockQuantity?: number;
  vatRate: number;
  createdAt: string;
}

export interface FiscalYear {
  id: string;
  label: string;
  isClosed: boolean;
}

export type DealStage = 'lead' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Deal {
  id: string;
  title: string;
  companyId: string;
  value: number;
  stage: DealStage;
  expectedCloseDate?: string;
  notes?: string;
  assigneeIds?: string[];
  contactIds?: string[];
  tenant?: TenantType;
  fiscalYear?: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  permissions?: string[];
  role: 'admin' | 'employee';
  tenant?: TenantType;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  completed: boolean;
  completedAt?: string;
  companyId?: string;
  contactId?: string;
  assigneeId?: string;
  tenant?: TenantType;
  fiscalYear?: string;
  createdAt: string;
}

export interface Note {
  id: string;
  content: string;
  companyId: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  type: 'task_completed' | 'deal_moved' | 'document_validated' | 'document_unvalidated' | string;
  title: string;
  description: string;
  userId: string;
  tenant?: TenantType;
  fiscalYear?: string;
  createdAt: string;
}

export type DocumentType = 'invoice' | 'proforma' | 'delivery_note' | 'purchase_order' | 'supplier_invoice' | 'receipt_note';
export type DocumentStatus = 'draft' | 'validated' | 'partially_paid' | 'paid' | 'cancelled' | 'received';

export interface DocumentItem {
  id: string;
  productId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

export interface BusinessDocument {
  id: string;
  type: DocumentType;
  status: DocumentStatus;
  reference: string;
  companyId: string;
  date: string;
  dueDate?: string;
  poReference?: string;
  items: DocumentItem[];
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  notes?: string;
  linkedDocumentId?: string;
  linkedDocumentRef?: string;
  tenant: TenantType;
  fiscalYear?: string;
  paymentMethod?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  documentId: string;
  companyId: string;
  amount: number;
  date: string;
  mode: 'cash' | 'check' | 'transfer' | 'traite';
  reference?: string;
  tenant: TenantType;
  fiscalYear?: string;
}

export interface FiscalSettings {
  companyName: string;
  address: string;
  rc: string;
  nif: string;
  nis: string;
  art: string;
  capital: string;
  phone: string;
  email: string;
  bankInfo: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'in' | 'out';
  quantity: number;
  referenceId?: string;
  tenant: TenantType;
  createdAt: string;
}

export interface Expense {
  id: string;
  title: string;
  category: 'rent' | 'utilities' | 'salaries' | 'taxes' | 'supplies' | 'other';
  amount: number;
  date: string;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  tenant: TenantType;
  fiscalYear?: string;
  createdAt: string;
}

export interface CRMData {
  companies: Company[];
  reminderSettings: ReminderSettings;
  products: Product[];
  deals: Deal[];
  tasks: Task[];
  notes: Note[];
  employees: Employee[];
  activityLogs: ActivityLog[];
  readNotifications: Record<string, string[]>;
  currentUserId: string | null;
  currentTenant: TenantType | null;
  documents?: BusinessDocument[];
  payments?: Payment[];
  stockMovements?: StockMovement[];
  expenses?: Expense[];
  documentCounters?: Record<string, number>;
  fiscalSettings?: Record<string, FiscalSettings>; // per tenant
  fiscalYears?: FiscalYear[];
  currentYearId?: string;
}
