import type { CRMData, ReminderSettings } from '../types';

const STORAGE_KEY = 'katamine_crm_core_db';

const defaultSettings: ReminderSettings = {
  enabled: true,
  firstReminderDays: 7,
  secondReminderDays: 14,
  thirdReminderDays: 30,
  senderName: 'Service Comptabilité',
  senderEmail: '',
  companyName: '',
};

const defaultData: CRMData = {
  companies: [],
  products: [],
  deals: [],
  tasks: [],
  notes: [],
  employees: [
    {
      id: 'emp-admin-katamine',
      firstName: 'Directeur',
      lastName: 'Katamine',
      email: 'dg@katamine.dz',
      password: '12345',
      role: 'admin',
      permissions: ['dashboard', 'companies', 'pipeline', 'quotes', 'invoices', 'products', 'tasks', 'team', 'settings'],
      tenant: 'katamine',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'emp-admin-kltools',
      firstName: 'Directeur',
      lastName: 'KL Tools',
      email: 'dg@kltools.dz',
      password: '12345',
      role: 'admin',
      permissions: ['dashboard', 'companies', 'pipeline', 'quotes', 'invoices', 'products', 'tasks', 'team', 'settings'],
      tenant: 'kltools',
      createdAt: new Date().toISOString(),
    }
  ],
  activityLogs: [],
  readNotifications: {},
  currentUserId: null,
  currentTenant: null,
  reminderSettings: defaultSettings,
  fiscalSettings: {
    katamine: { tenant: 'katamine', address: '', rc: '', nif: '', nis: '', art: '', bankName: '', rib: '', phone: '', email: '' },
    kltools: { tenant: 'kltools', address: '', rc: '', nif: '', nis: '', art: '', bankName: '', rib: '', phone: '', email: '' }
  },
  documents: [],
  payments: [],
  stockMovements: [],
  documentCounters: {}
};

export function loadData(): CRMData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      
      // SANITIZATION AND VALIDATION (ANTI-WHITE PAGE)
      const sanitizedData: CRMData = {
        ...defaultData,
        ...parsed,
        companies: Array.isArray(parsed.companies) ? parsed.companies.map((c: any) => ({
          ...c,
          contacts: Array.isArray(c.contacts) ? c.contacts : []
        })) : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
        products: Array.isArray(parsed.products) ? parsed.products : [],
        quotes: Array.isArray(parsed.quotes) ? parsed.quotes : [],
        deals: Array.isArray(parsed.deals) ? parsed.deals : [],
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        employees: Array.isArray(parsed.employees) && parsed.employees.length > 0 ? parsed.employees : defaultData.employees,
        activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
        readNotifications: typeof parsed.readNotifications === 'object' && parsed.readNotifications !== null ? parsed.readNotifications : {},
        documents: Array.isArray(parsed.documents) ? parsed.documents.map((d: any) => ({
          ...d,
          items: Array.isArray(d.items) ? d.items : []
        })) : [],
        payments: Array.isArray(parsed.payments) ? parsed.payments : [],
        stockMovements: Array.isArray(parsed.stockMovements) ? parsed.stockMovements : [],
        documentCounters: typeof parsed.documentCounters === 'object' && parsed.documentCounters !== null ? parsed.documentCounters : {},
        reminderSettings: {
          ...defaultSettings,
          ...parsed.reminderSettings
        },
        fiscalSettings: {
          katamine: { ...defaultData.fiscalSettings?.katamine, ...(parsed.fiscalSettings?.katamine || {}) },
          kltools: { ...defaultData.fiscalSettings?.kltools, ...(parsed.fiscalSettings?.kltools || {}) }
        }
      };

      // Clean up mock employees that might cause tenant collision issues
      sanitizedData.employees = sanitizedData.employees.filter((e: any) => 
        e.tenant || e.email.includes('@katamine.dz') || e.email.includes('@kltools.dz')
      );
      
      // Ensure default admins
      if (!sanitizedData.employees.find((e: any) => e.email === 'dg@katamine.dz')) {
        sanitizedData.employees.push(defaultData.employees[0]);
      }
      if (!sanitizedData.employees.find((e: any) => e.email === 'dg@kltools.dz')) {
        sanitizedData.employees.push(defaultData.employees[1]);
      }

      // Ensure passwords and permissions exist
      sanitizedData.employees = sanitizedData.employees.map((e: any) => ({
        ...e,
        password: e.password || '12345',
        permissions: e.permissions || (e.role === 'admin' ? defaultData.employees[0].permissions : defaultData.employees[1].permissions)
      }));

      // Security measure: always demand login on reload
      sanitizedData.currentUserId = null;
      sanitizedData.currentTenant = null;

      return sanitizedData;
    }
  } catch (e) {
    console.error('Error loading clean data:', e);
  }
  return defaultData;
}

export function saveData(data: CRMData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: 'DZD',
  }).format(amount).replace(/[\u202F\u00A0]/g, ' ');
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR').format(date);
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

export function getDaysOverdue(dueDate: string | undefined): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  if (isNaN(due.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
}

export function getInvoiceStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    paid: 'Payée',
    unpaid: 'Non payée',
    overdue: 'Non payée',
    pending: 'En attente',
  };
  return labels[status] || status;
}

export function getDepartmentLabel(dept: string): string {
  const labels: Record<string, string> = {
    approvisionnement: 'Approvisionnement',
    comptabilite: 'Comptabilité',
    direction: 'Direction',
    commercial: 'Commercial',
    technique: 'Technique',
    autre: 'Autre',
  };
  return labels[dept] || dept;
}

export function sendReminderEmail(
  contactEmail: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  reminderCount: number,
  settings: ReminderSettings,
  issueDate?: string,
  senderCompanyName?: string
): string {
  const subject = getReminderSubject(invoiceNumber, reminderCount);
  const body = getReminderBody(invoiceNumber, amount, dueDate, reminderCount, settings, issueDate, senderCompanyName);

  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function getReminderSubject(invoiceNumber: string, reminderCount: number): string {
  if (reminderCount === 1) return `Rappel de paiement - Facture ${invoiceNumber}`;
  if (reminderCount === 2) return `2ème rappel - Facture ${invoiceNumber} impayée`;
  return `URGENT - 3ème rappel - Facture ${invoiceNumber}`;
}

function getReminderBody(
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  _reminderCount: number,
  settings: ReminderSettings,
  issueDate?: string,
  senderCompanyName?: string
): string {
  const formattedAmount = new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  const dateToUse = issueDate ? new Date(issueDate) : new Date(dueDate);
  const formattedDate = new Intl.DateTimeFormat('fr-FR').format(dateToUse);

  return `Bonjour Messieurs
         Nous vous demandons de bien vouloir, faire le nécessaire, afin de procéder au règlement de la créance se rapportant à notre facture ci-après non encore honorée à savoir:
* N°: ${invoiceNumber} du ${formattedDate} de ${formattedAmount} DA/TTC

         Dans l'attente de vous lire, et d'un prompt règlement, de votre part, recevez nos meilleures et sincères salutations.
Cordialement votre

 Le Service recouvrement
 ${senderCompanyName || settings.companyName}



NB: Veuillez SVP, nous accuser la bonne réception de ce message - merci`;
}
