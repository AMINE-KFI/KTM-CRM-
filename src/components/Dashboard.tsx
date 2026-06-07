import { useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate, getDaysOverdue } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2, Users, FileText, AlertCircle,
  TrendingUp, TrendingDown, Clock, CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type { InvoiceStatus } from '@/types';

interface DashboardProps {
  onNavigate: (page: string, id?: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data, getTotalUnpaid, getTotalPaid, getOverdueInvoices } = useCRM();
  
  const overdueInvoices = getOverdueInvoices();
  const totalUnpaid = getTotalUnpaid();
  const totalPaid = getTotalPaid();
  
  const stats = useMemo(() => {
    const totalCompanies = data.companies.length;
    const totalContacts = data.companies.reduce((sum, c) => sum + c.contacts.length, 0);
    const totalInvoices = data.invoices.length;
    const unpaidInvoices = data.invoices.filter(i => i.status !== 'paid').length;
    const pipelineValue = (data.deals || []).filter(d => d.stage !== 'lost' && d.stage !== 'won').reduce((sum, d) => sum + d.value, 0);
    const pendingQuotes = (data.quotes || []).filter(q => q.status === 'sent').length;
    
    return { totalCompanies, totalContacts, totalInvoices, unpaidInvoices, pipelineValue, pendingQuotes };
  }, [data]);

  const recentInvoices = useMemo(() => {
    return [...data.invoices]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map(inv => ({
        ...inv,
        company: data.companies.find(c => c.id === inv.companyId),
      }));
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de votre CRM</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          label="Entreprises"
          value={stats.totalCompanies}
          icon={<Building2 className="w-5 h-5 text-blue-600" />}
          color="blue"
          onClick={() => onNavigate('companies')}
        />
        <StatCard
          label="Pipeline (HT)"
          value={formatCurrency(stats.pipelineValue)}
          icon={<TrendingUp className="w-5 h-5 text-amber-600" />}
          color="amber"
          onClick={() => onNavigate('pipeline')}
        />
        <StatCard
          label="Devis en attente"
          value={stats.pendingQuotes}
          icon={<FileText className="w-5 h-5 text-indigo-600" />}
          color="indigo"
          onClick={() => onNavigate('quotes')}
        />
        <StatCard
          label="Contacts"
          value={stats.totalContacts}
          icon={<Users className="w-5 h-5 text-violet-600" />}
          color="violet"
          onClick={() => onNavigate('companies')}
        />
        <StatCard
          label="Total Factures"
          value={stats.totalInvoices}
          icon={<FileText className="w-5 h-5 text-emerald-600" />}
          color="emerald"
          onClick={() => onNavigate('invoices')}
        />
        <StatCard
          label="Impayées"
          value={stats.unpaidInvoices}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          color="red"
          onClick={() => onNavigate('invoices')}
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-emerald-700 font-medium truncate">Total Encaissé</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1 truncate">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-orange-50 overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-red-700 font-medium truncate">En attente de paiement</p>
                <p className="text-xl sm:text-2xl font-bold text-red-800 mt-1 truncate">{formatCurrency(totalUnpaid)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl flex-shrink-0">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section: Invoices & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Notifications Center */}
        <Card className="border-0 shadow-sm flex flex-col">
          <CardHeader className="pb-3 pt-5 px-5 border-b border-gray-50 bg-white sticky top-0 z-10 rounded-t-xl">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                Centre de Notifications
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto max-h-[400px]">
            <NotificationFeed data={data} onNavigate={onNavigate} overdueInvoices={overdueInvoices} />
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="border-0 shadow-sm flex flex-col">
          <CardHeader className="pb-3 pt-5 px-5 border-b border-gray-50 bg-white sticky top-0 z-10 rounded-t-xl">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Factures récentes
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={() => onNavigate('invoices')}>
                Voir tout
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-3">
            <div className="space-y-2">
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucune facture pour l'instant</p>
              ) : (
                recentInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${inv.status === 'paid' ? 'bg-green-50' : 'bg-red-50'}`}>
                        {inv.status === 'paid' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">{inv.invoiceNumber}</p>
                        <p className="text-xs text-gray-400">{inv.company?.name} · {formatDate(inv.dueDate)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-gray-900">{formatCurrency(inv.totalAmount)}</p>
                      <InvoiceStatusBadge status={inv.status} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NotificationFeed({ data, onNavigate, overdueInvoices }: { data: any, onNavigate: any, overdueInvoices: any[] }) {
  const notifications = useMemo(() => {
    const items = [];

    // 1. Overdue Invoices
    overdueInvoices.forEach(inv => {
      const days = getDaysOverdue(inv.dueDate);
      items.push({
        id: `inv-${inv.id}`,
        type: 'danger',
        icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
        title: 'Facture en retard',
        description: `Facture ${inv.invoiceNumber} (${inv.company?.name}) est en retard de ${days} jour(s).`,
        date: new Date(inv.dueDate),
        action: () => onNavigate('invoices')
      });
    });

    // 2. Overdue Tasks
    (data.tasks || []).forEach((t: any) => {
      if (!t.completed && t.dueDate) {
        const days = getDaysOverdue(t.dueDate);
        if (days >= 1) {
          const assignee = (data.employees || []).find((e: any) => e.id === t.assigneeId);
          const name = assignee ? `${assignee.firstName}` : 'Quelqu\'un';
          items.push({
            id: `task-ov-${t.id}`,
            type: 'warning',
            icon: <Clock className="w-4 h-4 text-orange-600" />,
            title: 'Tâche en retard',
            description: `"${t.title}" (assignée à ${name}) est en retard de ${days} jour(s).`,
            date: new Date(t.dueDate),
            action: () => onNavigate('tasks')
          });
        }
      }
    });

    // 3. Activity Logs
    (data.activityLogs || []).forEach((log: any) => {
      const user = (data.employees || []).find((e: any) => e.id === log.userId);
      const name = user ? user.firstName : 'Un utilisateur';
      
      let icon = <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      if (log.type === 'deal_moved') {
        icon = <TrendingUp className="w-4 h-4 text-blue-600" />;
      }

      items.push({
        id: `log-${log.id}`,
        type: 'info',
        icon,
        title: log.title,
        description: `${name} ${log.description}`,
        date: new Date(log.createdAt),
      });
    });

    // Sort by date descending
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data, overdueInvoices, onNavigate]);

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-8 h-8 text-gray-200 mx-auto mb-2" />
        <p className="text-sm text-gray-400">Aucune notification</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-50">
      {notifications.map(n => (
        <div 
          key={n.id} 
          className={`p-4 flex items-start gap-3 transition-colors ${n.action ? 'cursor-pointer hover:bg-gray-50' : ''} ${n.type === 'danger' ? 'bg-red-50/30' : n.type === 'warning' ? 'bg-orange-50/30' : ''}`}
          onClick={n.action}
        >
          <div className={`p-2 rounded-full flex-shrink-0 ${n.type === 'danger' ? 'bg-red-100' : n.type === 'warning' ? 'bg-orange-100' : 'bg-blue-50'}`}>
            {n.icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{n.title}</p>
            <p className="text-sm text-gray-600 mt-0.5 leading-snug">{n.description}</p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(n.date.toISOString())}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, icon, color, onClick }: {
  label: string; value: number | string; icon: React.ReactNode; color: string; onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
    violet: 'bg-violet-50 border-violet-100 text-violet-700',
    emerald: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    amber: 'bg-amber-50 border-amber-100 text-amber-700',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-700',
  };

  return (
    <Card
      className={`border shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 bg-white`}
      onClick={onClick}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-500 leading-tight truncate" title={label}>{label}</p>
            <p className="text-lg sm:text-2xl font-bold text-gray-900 mt-1 truncate" title={String(value)}>{value}</p>
          </div>
          <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${colorMap[color]}`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus | string }) {
  const config: Record<string, { label: string; className: string }> = {
    paid: { label: 'Payée', className: 'bg-green-100 text-green-700' },
    unpaid: { label: 'Non payée', className: 'bg-red-100 text-red-700' },
    overdue: { label: 'En retard', className: 'bg-red-100 text-red-700' },
    pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
  };
  const { label, className } = config[status] || { label: status, className: '' };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
