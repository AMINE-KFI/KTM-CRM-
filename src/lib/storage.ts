import type { CRMData, ReminderSettings, Product, Quote, Deal, Task, Note } from '../types';

const STORAGE_KEY = 'katamine_crm_data';

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
  companies: [
    {
      id: 'demo-1',
      name: 'TECHNO SOLUTIONS SAS',
      legalForm: 'SAS',
      nif: '000012345678900',
      nis: '123456789012345',
      rc: '12/00-0123456 B 20',
      address: '15 Rue de la République',
      city: 'Paris',
      postalCode: '75001',
      country: 'France',
      fiscalYear: '01/01 - 31/12',
      art: '1201234567',
      capital: '50 000 €',
      email: 'contact@technosolutions.fr',
      phone: '01 23 45 67 89',
      website: 'www.technosolutions.fr',
      notes: 'Client depuis 2022. Paiement généralement à 30 jours.',
      createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      contacts: [
        {
          id: 'c-1',
          firstName: 'Marie',
          lastName: 'DUPONT',
          email: 'marie.dupont@technosolutions.fr',
          phone: '01 23 45 67 90',
          mobile: '06 12 34 56 78',
          position: 'Responsable Approvisionnement',
          department: 'approvisionnement',
          notes: 'Contact principal pour les commandes',
          companyId: 'demo-1',
          createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
        },
      ],
    }
  ],
  invoices: [],
  products: [
    {
      id: 'prod-1',
      name: 'Prestation de service - Journée',
      description: 'Consulting technique (par jour)',
      price: 50000,
      prices: {
        katamine: 50000,
        kltools: 45000
      },
      vatRate: 19,
      createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    }
  ],
  quotes: [],
  deals: [],
  tasks: [],
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
  currentUserId: null,
  currentTenant: null,
  reminderSettings: defaultSettings,
};

export function loadData(): CRMData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // migrations for old data
      if (!parsed.employees) parsed.employees = defaultData.employees;
      if (!parsed.activityLogs) parsed.activityLogs = [];
      
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
  }).format(amount);
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

export function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate);
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
  companyName: string,
  contactEmail: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  reminderCount: number,
  settings: ReminderSettings
): string {
  const subject = getReminderSubject(invoiceNumber, reminderCount);
  const body = getReminderBody(companyName, invoiceNumber, amount, dueDate, reminderCount, settings);
  
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
  companyName: string,
  invoiceNumber: string,
  amount: number,
  dueDate: string,
  reminderCount: number,
  settings: ReminderSettings
): string {
  const formattedAmount = new Intl.NumberFormat('fr-DZ', { style: 'currency', currency: 'DZD' }).format(amount);
  const formattedDate = new Intl.DateTimeFormat('fr-FR').format(new Date(dueDate));
  const urgency = reminderCount >= 3 ? '\n\nSans retour de votre part dans les 48h, nous nous verrons dans l\'obligation de transmettre ce dossier à notre service contentieux.' : '';
  
  return `Madame, Monsieur,

Sauf erreur ou omission de notre part, nous constatons que notre facture n° ${invoiceNumber} d'un montant de ${formattedAmount}, dont l'échéance était fixée au ${formattedDate}, n'a pas encore été réglée.

Nous vous serions reconnaissants de bien vouloir régulariser votre situation dans les meilleurs délais.

Si le règlement a été effectué, veuillez ne pas tenir compte de ce rappel.${urgency}

Pour tout renseignement complémentaire, n'hésitez pas à contacter notre service comptabilité.

Cordialement,

${settings.senderName}
${settings.companyName}
Email: ${settings.senderEmail}`;
}
