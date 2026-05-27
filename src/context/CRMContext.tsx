import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { CRMData, Company, Contact, Invoice, ReminderSettings } from '../types';
import { loadData, saveData, generateId } from '../lib/storage';

interface CRMContextType {
  data: CRMData;
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
  markAsPaid: (id: string) => void;
  getInvoicesForCompany: (companyId: string) => Invoice[];
  // Reminders
  updateReminderSettings: (settings: ReminderSettings) => void;
  getOverdueInvoices: () => (Invoice & { company: Company })[];
  // Stats
  getTotalUnpaid: () => number;
  getTotalPaid: () => number;
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
    const newInvoice: Invoice = {
      ...invoice,
      id: generateId(),
      createdAt: new Date().toISOString(),
      reminderSent: false,
      reminderCount: 0,
    };
    setData(prev => ({ ...prev, invoices: [...prev.invoices, newInvoice] }));
    return newInvoice;
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

  const markAsPaid = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      invoices: prev.invoices.map(inv =>
        inv.id === id
          ? { ...inv, status: 'paid', paidDate: new Date().toISOString().split('T')[0] }
          : inv
      ),
    }));
  }, []);

  const getInvoicesForCompany = useCallback((companyId: string) => {
    return data.invoices.filter(inv => inv.companyId === companyId);
  }, [data.invoices]);

  const updateReminderSettings = useCallback((settings: ReminderSettings) => {
    setData(prev => ({ ...prev, reminderSettings: settings }));
  }, []);

  const getOverdueInvoices = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return data.invoices
      .filter(inv => {
        if (inv.status === 'paid') return false;
        const due = new Date(inv.dueDate);
        return due < today;
      })
      .map(inv => {
        const company = data.companies.find(c => c.id === inv.companyId)!;
        return { ...inv, company };
      })
      .filter(inv => inv.company);
  }, [data.invoices, data.companies]);

  const getTotalUnpaid = useCallback(() => {
    return data.invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  }, [data.invoices]);

  const getTotalPaid = useCallback(() => {
    return data.invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  }, [data.invoices]);

  return (
    <CRMContext.Provider value={{
      data,
      addCompany, updateCompany, deleteCompany, getCompany,
      addContact, updateContact, deleteContact,
      addInvoice, updateInvoice, deleteInvoice, markAsPaid, getInvoicesForCompany,
      updateReminderSettings, getOverdueInvoices,
      getTotalUnpaid, getTotalPaid,
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
