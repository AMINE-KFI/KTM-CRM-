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

export interface CRMData {
  companies: Company[];
  invoices: Invoice[];
  reminderSettings: ReminderSettings;
}
