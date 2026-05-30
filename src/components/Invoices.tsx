import { useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate, getDaysOverdue, sendReminderEmail } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Plus, Search, AlertCircle, CheckCircle2, Clock, Mail, MoreVertical, Filter
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { InvoiceStatusBadge } from './Dashboard';
import InvoiceForm from './InvoiceForm';
import type { Invoice } from '@/types';

export default function Invoices() {
  const { data, markAsPaid, deleteInvoice, updateInvoice, getOverdueInvoices } = useCRM();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const overdueInvoices = getOverdueInvoices();

  const enrichedInvoices = useMemo(() => {
    return data.invoices
      .map(inv => ({
        ...inv,
        company: data.companies.find(c => c.id === inv.companyId),
      }))
      .filter(inv => inv.company);
  }, [data]);

  const filtered = useMemo(() => {
    return enrichedInvoices.filter(inv => {
      const matchSearch = !search ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        inv.company!.name.toLowerCase().includes(search.toLowerCase());

      const matchTab =
        activeTab === 'all' ? true :
        activeTab === 'unpaid' ? inv.status !== 'paid' :
        activeTab === 'overdue' ? inv.status === 'overdue' :
        activeTab === 'paid' ? inv.status === 'paid' : true;

      return matchSearch && matchTab;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [enrichedInvoices, search, activeTab]);

  const stats = useMemo(() => ({
    all: data.invoices.length,
    unpaid: data.invoices.filter(i => i.status !== 'paid').length,
    overdue: overdueInvoices.length,
    paid: data.invoices.filter(i => i.status === 'paid').length,
  }), [data.invoices, overdueInvoices]);

  const handleSendReminder = (inv: Invoice & { company: any }) => {
    const comptaContact = inv.company?.contacts?.find((c: any) => c.department === 'comptabilite');
    const email = comptaContact?.email || inv.company?.email || '';
    const newCount = (inv.reminderCount || 0) + 1;
    
    const mailtoLink = sendReminderEmail(
      inv.company?.name || '',
      email,
      inv.invoiceNumber,
      inv.totalAmount,
      inv.dueDate,
      newCount,
      data.reminderSettings
    );
    
    updateInvoice(inv.id, {
      status: 'overdue',
      reminderSent: true,
      reminderCount: newCount,
      lastReminderDate: new Date().toISOString().split('T')[0],
    });

    if (email) {
      window.open(mailtoLink, '_blank');
    } else {
      alert(`⚠️ Aucun email trouvé pour ${inv.company?.name}.\n\nVeuillez ajouter un contact comptabilité ou l'email de l'entreprise.`);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Factures</h1>
          <p className="text-gray-500 text-sm mt-0.5">{data.invoices.length} facture{data.invoices.length > 1 ? 's' : ''} au total</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Nouvelle facture
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par n° facture ou entreprise..."
          className="pl-9 bg-white border-gray-200"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="all">Toutes <TabCount count={stats.all} /></TabsTrigger>
          <TabsTrigger value="unpaid" className="text-red-700">Non payées <TabCount count={stats.unpaid} color="red" /></TabsTrigger>
          <TabsTrigger value="paid" className="text-green-700">Payées <TabCount count={stats.paid} color="green" /></TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucune facture trouvée</p>
              {activeTab === 'all' && (
                <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Créer une facture
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map(inv => {
                const daysOverdue = inv.status !== 'paid' ? getDaysOverdue(inv.dueDate) : 0;
                
                return (
                  <Card key={inv.id} className={`border shadow-sm ${inv.status === 'overdue' ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${
                            inv.status === 'paid' ? 'bg-green-50' :
                            inv.status === 'overdue' ? 'bg-red-50' : 'bg-gray-50'
                          }`}>
                            {inv.status === 'paid' ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : inv.status === 'overdue' ? (
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            ) : (
                              <Clock className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{inv.invoiceNumber}</span>
                              <InvoiceStatusBadge status={inv.status} />
                              {inv.reminderSent && inv.reminderCount > 0 && (
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                                  {inv.reminderCount} rappel{inv.reminderCount > 1 ? 's' : ''} envoyé{inv.reminderCount > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            <p className="text-sm font-medium text-gray-700 mt-0.5">{inv.company?.name}</p>
                            {inv.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{inv.description}</p>}
                            <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                              <span>Émise: {formatDate(inv.issueDate)}</span>
                              <span>Échéance: {formatDate(inv.dueDate)}</span>
                              {daysOverdue > 0 && (
                                <span className="text-red-500 font-semibold">⚠ {daysOverdue} jour{daysOverdue > 1 ? 's' : ''} de retard</span>
                              )}
                              {inv.paidDate && (
                                <span className="text-green-600">✓ Payée le {formatDate(inv.paidDate)}</span>
                              )}
                              {inv.lastReminderDate && (
                                <span className="text-amber-600">Dernier rappel: {formatDate(inv.lastReminderDate)}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-gray-900">{formatCurrency(inv.totalAmount)}</p>
                            <p className="text-xs text-gray-400">HT: {formatCurrency(inv.amount)}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {inv.status !== 'paid' && (
                                <>
                                  <DropdownMenuItem onClick={() => {
                                      const date = prompt('Date de paiement (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                                      if (date) markAsPaid(inv.id, date);
                                    }} className="text-green-600">
                                    ✓ Marquer comme payée
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSendReminder(inv)} className="text-amber-600">
                                    <Mail className="w-4 h-4 mr-2" />
                                    Envoyer un rappel
                                  </DropdownMenuItem>
                                </>
                              )}
                              {inv.status === 'paid' && (
                                <DropdownMenuItem onClick={() => {
                                    const current = inv.paidDate || new Date().toISOString().split('T')[0];
                                    const date = prompt('Modifier la date de paiement (YYYY-MM-DD):', current);
                                    if (date) markAsPaid(inv.id, date);
                                  }} className="text-blue-600">
                                  Modifier la date de paiement
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => { if (confirm('Supprimer cette facture ?')) deleteInvoice(inv.id); }}
                                className="text-red-600"
                              >
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {showForm && <InvoiceForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

function TabCount({ count, color }: { count: number; color?: string }) {
  if (count === 0) return null;
  const colorClass = color === 'red' ? 'bg-red-100 text-red-600' :
    color === 'orange' ? 'bg-orange-100 text-orange-600' :
    color === 'green' ? 'bg-green-100 text-green-600' :
    'bg-gray-200 text-gray-600';
  return (
    <span className={`ml-1 text-xs font-medium px-1.5 py-0.5 rounded-full ${colorClass}`}>{count}</span>
  );
}
