import { useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate, getDaysOverdue } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Building2, Users, FileText, AlertCircle,
  TrendingUp, TrendingDown, Clock, CheckCircle2,
  AlertTriangle, Loader2, ArrowDownToLine, Package
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

interface DashboardProps {
  onNavigate: (page: string, id?: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { data, tenant, getOverdueInvoices } = useCRM();
  
  const overdueInvoices = getOverdueInvoices();
  
  const stats = {
    totalCompanies: data.companies.filter(c => c.role === 'client' || !c.role || c.role === 'both').length,
    totalContacts: (data.companies || []).reduce((sum, c) => sum + (c.contacts || []).length, 0),
    totalInvoices: (data.documents || []).filter(d => (!tenant || d.tenant === tenant) && d.type === 'invoice').length,
    unpaidInvoices: (data.documents || []).filter(d => (!tenant || d.tenant === tenant) && d.type === 'invoice' && d.status !== 'paid').length,
    pipelineValue: (data.deals || []).filter(d => d.stage !== 'lost' && d.stage !== 'won').reduce((sum, d) => sum + d.value, 0),
    pendingQuotes: (data.documents || []).filter(d => (!tenant || d.tenant === tenant) && d.type === 'proforma' && (d.status === 'draft' || d.status === 'validated')).length
  };

  const localInvoices = (data.documents || []).filter(d => (!tenant || d.tenant === tenant) && d.type === 'invoice' && d.status !== 'cancelled');
  const localSupplierInvoices = (data.documents || []).filter(d => (!tenant || d.tenant === tenant) && d.type === 'supplier_invoice' && d.status !== 'cancelled');
  const localTotalSales = localInvoices.reduce((sum, d) => sum + d.totalAmount, 0);
  const localTotalPurchases = localSupplierInvoices.reduce((sum, d) => sum + d.totalAmount, 0);
  const localTotalExpenses = (data.expenses || []).reduce((sum, e) => sum + e.amount, 0);

  const encaissementsClients = (data.payments || []).filter(p => p.type === 'in' && (!tenant || p.tenant === tenant)).reduce((sum, p) => sum + p.amount, 0);
  const paiementsFournisseurs = (data.payments || []).filter(p => p.type === 'out' && (!tenant || p.tenant === tenant)).reduce((sum, p) => sum + p.amount, 0);
  
  const creancesClients = localTotalSales - encaissementsClients;
  const dettesFournisseurs = localTotalPurchases - paiementsFournisseurs;

  let valeurStock = 0;
  (data.products || []).forEach(p => {
    const price = tenant && p.prices && p.prices[tenant] !== undefined ? p.prices[tenant] : p.price;
    const stock = p.stockQuantity || 0;
    valeurStock += price * stock;
  });

  const financialStats = {
    totalSales: localTotalSales,
    totalPurchases: localTotalPurchases,
    totalExpenses: localTotalExpenses,
    netProfit: localTotalSales - localTotalPurchases - localTotalExpenses
  };

  const recentInvoices = useMemo(() => {
    const source = data.documents;
    if (!source) return [];
    
    const erpInvoices = source.filter((d: any) => (!tenant || d.tenant === tenant) && d.type === 'invoice');
    return erpInvoices
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
      .map((inv: any) => ({
        ...inv,
        invoiceNumber: inv.reference,
        company: data.companies.find((c: any) => c.id === inv.companyId),
      }));
  }, [data.documents, data.companies, tenant]);

  // Chart data
  const pieData = [
    { name: 'Achats', value: financialStats.totalPurchases, color: '#3b82f6' },
    { name: 'Dépenses', value: financialStats.totalExpenses, color: '#f97316' },
    { name: 'Marge', value: Math.max(0, financialStats.netProfit), color: '#10b981' },
  ];

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
          onClick={() => onNavigate('documents')}
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
          onClick={() => onNavigate('documents')}
        />
        <StatCard
          label="Impayées"
          value={stats.unpaidInvoices}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          color="red"
          onClick={() => onNavigate('documents')}
        />
      </div>

      {/* Trésorerie & Stocks */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Trésorerie & Stocks</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Encaissements"
            value={formatCurrency(encaissementsClients)}
            icon={<ArrowDownToLine className="w-5 h-5 text-emerald-600" />}
            color="emerald"
            onClick={() => onNavigate('payments')}
          />
          <StatCard
            label="Créances Clients"
            value={formatCurrency(creancesClients)}
            icon={<Clock className="w-5 h-5 text-orange-600" />}
            color="orange"
            onClick={() => onNavigate('documents')}
          />
          <StatCard
            label="Dettes Fourn."
            value={formatCurrency(dettesFournisseurs)}
            icon={<AlertCircle className="w-5 h-5 text-red-600" />}
            color="red"
            onClick={() => onNavigate('supplier_invoices')}
          />
          <StatCard
            label="Valeur du Stock"
            value={formatCurrency(valeurStock)}
            icon={<Package className="w-5 h-5 text-indigo-600" />}
            color="indigo"
            onClick={() => onNavigate('products')}
          />
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border border-emerald-100 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50 overflow-hidden rounded-2xl relative cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate('documents')}>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none scale-150">
            <TrendingUp className="w-24 h-24 text-emerald-900" />
          </div>
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Chiffre d'Affaires</p>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-900 mt-1 truncate">{formatCurrency(financialStats.totalSales)}</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-blue-100 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden rounded-2xl relative cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate('purchases')}>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none scale-150">
            <TrendingDown className="w-24 h-24 text-blue-900" />
          </div>
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Achats Fournisseurs</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1 truncate">{formatCurrency(financialStats.totalPurchases)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-orange-100 shadow-sm bg-gradient-to-br from-orange-50 to-red-50 overflow-hidden rounded-2xl relative cursor-pointer hover:shadow-md transition-all" onClick={() => onNavigate('expenses')}>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none scale-150">
            <AlertCircle className="w-24 h-24 text-orange-900" />
          </div>
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Charges / Dépenses</p>
              <p className="text-2xl sm:text-3xl font-bold text-orange-900 mt-1 truncate">{formatCurrency(financialStats.totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={`border ${financialStats.netProfit >= 0 ? 'border-purple-100 bg-gradient-to-br from-purple-50 to-fuchsia-50' : 'border-red-100 bg-gradient-to-br from-red-50 to-rose-50'} shadow-sm overflow-hidden rounded-2xl relative`}>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none scale-150">
            <Building2 className={`w-24 h-24 ${financialStats.netProfit >= 0 ? 'text-purple-900' : 'text-red-900'}`} />
          </div>
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col gap-1">
              <p className={`text-xs font-bold uppercase tracking-wider ${financialStats.netProfit >= 0 ? 'text-purple-700' : 'text-red-700'}`}>Bénéfice Net</p>
              <p className={`text-2xl sm:text-3xl font-bold mt-1 truncate ${financialStats.netProfit >= 0 ? 'text-purple-900' : 'text-red-900'}`}>{formatCurrency(financialStats.netProfit)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-gray-100">
          <CardHeader className="pb-2 border-b border-gray-50 mb-4">
            <CardTitle className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Répartition Financière
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recent Invoices list */}
        <Card className="shadow-sm border-gray-100 lg:row-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-50 bg-white sticky top-0 z-10 rounded-t-xl">
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
              <CardTitle className="text-sm font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                Factures récentes
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-blue-600 font-semibold" onClick={() => onNavigate('documents')}>
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
                        <p className="font-bold text-sm text-gray-900">{inv.invoiceNumber}</p>
                        <p className="text-xs font-medium text-gray-500">{inv.company?.name} · {formatDate(inv.dueDate)}</p>
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
    const items: any[] = [];

    // 1. Overdue Invoices
    overdueInvoices.forEach(inv => {
      const days = getDaysOverdue(inv.dueDate);
      items.push({
        id: `inv-${inv.id}`,
        type: 'danger',
        icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
        title: 'Facture en retard',
        description: `Facture ${inv.reference} (${inv.company?.name || 'Inconnu'}) est en retard de ${days} jour(s).`,
        date: new Date(inv.dueDate),
        action: () => onNavigate('documents')
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
  const colorMap: Record<string, { bg: string; text: string; iconCol: string }> = {
    blue: { bg: 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100', text: 'text-blue-900', iconCol: 'text-blue-900' },
    violet: { bg: 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-100', text: 'text-violet-900', iconCol: 'text-violet-900' },
    emerald: { bg: 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100', text: 'text-emerald-900', iconCol: 'text-emerald-900' },
    red: { bg: 'bg-gradient-to-br from-red-50 to-rose-50 border-red-100', text: 'text-red-900', iconCol: 'text-red-900' },
    amber: { bg: 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-100', text: 'text-amber-900', iconCol: 'text-amber-900' },
    indigo: { bg: 'bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100', text: 'text-indigo-900', iconCol: 'text-indigo-900' },
  };

  const style = colorMap[color] || colorMap.blue;

  return (
    <Card
      className={`border shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 rounded-2xl relative overflow-hidden ${style.bg}`}
      onClick={onClick}
    >
      <div className={`absolute -right-4 -bottom-4 opacity-5 pointer-events-none scale-[2]`}>
        {icon}
      </div>
      <CardContent className="p-4 sm:p-5 relative z-10">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate" title={label}>{label}</p>
          <p className={`text-xl sm:text-3xl font-bold mt-1 truncate ${style.text}`} title={String(value)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function InvoiceStatusBadge({ status }: { status: string }) {
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
