export type InvoiceStatus = 'paid' | 'unpaid' | 'overdue' | 'pending';
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

export interface Invoice {
  id: string;
  invoiceNumber: string;
  companyId: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  description?: string;
  reminderSent: boolean;
  reminderCount: number;
  lastReminderDate?: string;
  paidDate?: string;
  paidAmount?: number;
  notes?: string;
  tenant?: TenantType;
  createdAt: string;
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
  description?: string;
  price: number; // Prix par défaut historique
  prices?: {
    katamine?: number;
    kltools?: number;
  };
  vatRate: number;
  createdAt: string;
}

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface Quote {
  id: string;
  quoteNumber: string;
  companyId: string;
  issueDate: string;
  expiryDate: string;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  status: QuoteStatus;
  description?: string;
  notes?: string;
  tenant?: TenantType;
  createdAt: string;
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
  tenant?: TenantType;
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
  type: 'task_completed' | 'deal_moved';
  title: string;
  description: string;
  userId: string;
  tenant?: TenantType;
  createdAt: string;
}

export interface CRMData {
  companies: Company[];
  invoices: Invoice[];
  reminderSettings: ReminderSettings;
  products: Product[];
  quotes: Quote[];
  deals: Deal[];
  tasks: Task[];
  notes: Note[];
  employees: Employee[];
  activityLogs: ActivityLog[];
  currentUserId: string | null;
  currentTenant: TenantType | null;
}
