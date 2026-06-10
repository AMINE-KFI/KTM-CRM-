import type { CRMData, ReminderSettings } from '../types';

const STORAGE_KEY = 'katamine_crm_data_v3';

const defaultSettings: ReminderSettings = {
  enabled: true,
  firstReminderDays: 7,
  secondReminderDays: 14,
  thirdReminderDays: 30,
  senderName: 'Service Comptabilité KL TOOLS',
  senderEmail: 'comptabilite@kltools.com',
  companyName: 'KL TOOLS',
};

const defaultData: CRMData = {
  companies: [],
  invoices: [],
  products: [],
  quotes: [],
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
    katamine: { companyName: 'Katamine', address: '', rc: '', nif: '', nis: '', art: '', capital: '', phone: '', email: '', bankInfo: '' },
    kltools: { companyName: 'KL Tools', address: '', rc: '', nif: '', nis: '', art: '', capital: '', phone: '', email: '', bankInfo: '' }
  }
};

export function loadData(): CRMData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // migrations for old data
      if (!parsed.employees) parsed.employees = defaultData.employees;
      if (!parsed.activityLogs) parsed.activityLogs = [];
      if (!parsed.readNotifications) parsed.readNotifications = {};
      
      // Clean up old mock data that didn't have a tenant (to avoid duplicate ID conflicts and old data)
      parsed.employees = parsed.employees.filter((e: any) => 
        e.tenant || e.email.includes('@katamine.dz') || e.email.includes('@kltools.dz')
      );

      // Force user to login again for testing login page
      parsed.currentUserId = null;
      parsed.currentTenant = null;
      
      // Update missing passwords on load
      parsed.employees = parsed.employees.map((e: any) => ({
        ...e,
        password: e.password || '12345',
        permissions: e.permissions || (e.role === 'admin' ? defaultData.employees[0].permissions : defaultData.employees[1].permissions)
      }));

      // Ensure both default admins exist if missing
      if (!parsed.employees.find((e: any) => e.email === 'dg@katamine.dz')) {
        parsed.employees.push(defaultData.employees[0]);
      }
      if (!parsed.employees.find((e: any) => e.email === 'dg@kltools.dz')) {
        parsed.employees.push(defaultData.employees[1]);
      }

      return parsed;
    }
  } catch (e) {
    console.error('Error loading data:', e);
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

// Simulate sending reminder email (in real app, would call backend API)
export function sendReminderEmail(
  contactEmail: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  reminderCount: number,
  settings: ReminderSettings,
  issueDate?: string
): string {
  const subject = getReminderSubject(invoiceNumber, reminderCount);
  const body = getReminderBody(invoiceNumber, amount, dueDate, reminderCount, settings, issueDate);
  
  // Create mailto link for simulation
  const mailtoLink = `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return mailtoLink;
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
  issueDate?: string
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
 ${settings.companyName}



NB: Veuillez SVP, nous accuser la bonne réception de ce message - merci`;
}
