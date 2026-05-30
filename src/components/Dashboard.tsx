import { useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate, getDaysOverdue } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    return { totalCompanies, totalContacts, totalInvoices, unpaidInvoices };
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
        <p className="text-gray-500 text-sm mt-1">Vue d'ensemble de votre CRM KL TOOLS</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Entreprises clientes"
          value={stats.totalCompanies}
          icon={<Building2 className="w-5 h-5 text-blue-600" />}
          color="blue"
          onClick={() => onNavigate('companies')}
        />
        <StatCard
          label="Contacts"
          value={stats.totalContacts}
          icon={<Users className="w-5 h-5 text-violet-600" />}
          color="violet"
          onClick={() => onNavigate('companies')}
        />
        <StatCard
          label="Factures totales"
          value={stats.totalInvoices}
          icon={<FileText className="w-5 h-5 text-emerald-600" />}
          color="emerald"
          onClick={() => onNavigate('invoices')}
        />
        <StatCard
          label="Factures impayées"
          value={stats.unpaidInvoices}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          color="red"
          onClick={() => onNavigate('invoices')}
        />
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-700 font-medium">Total Encaissé</p>
                <p className="text-2xl font-bold text-emerald-800 mt-1">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="p-3 bg-emerald-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-orange-50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">En attente de paiement</p>
                <p className="text-2xl font-bold text-red-800 mt-1">{formatCurrency(totalUnpaid)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <Card className="border border-amber-200 bg-amber-50/60 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              {overdueInvoices.length} facture{overdueInvoices.length > 1 ? 's' : ''} en retard de paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="space-y-2">
              {overdueInvoices.slice(0, 3).map(inv => {
                const days = getDaysOverdue(inv.dueDate);
                return (
                  <div key={inv.id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-500">{inv.company?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm text-red-700">{formatCurrency(inv.totalAmount)}</p>
                      <p className="text-xs text-amber-600">{days} jour{days > 1 ? 's' : ''} de retard</p>
                    </div>
                  </div>
                );
              })}
              {overdueInvoices.length > 3 && (
                <p className="text-xs text-amber-600 text-center pt-1">
                  + {overdueInvoices.length - 3} autres factures en retard
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full border-amber-300 text-amber-800 hover:bg-amber-100"
              onClick={() => onNavigate('invoices')}
            >
              Gérer les relances →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Invoices */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3 pt-5 px-5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">Factures récentes</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={() => onNavigate('invoices')}>
              Voir tout
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="space-y-2">
            {recentInvoices.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Aucune facture pour l'instant</p>
            ) : (
              recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${inv.status === 'paid' ? 'bg-green-50' : 'bg-red-50'}`}>
                      {inv.status === 'paid' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">{inv.invoiceNumber}</p>
                      <p className="text-xs text-gray-400">{inv.company?.name} · {formatDate(inv.dueDate)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">{formatCurrency(inv.totalAmount)}</p>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, icon, color, onClick }: {
  label: string; value: number; icon: React.ReactNode; color: string; onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    violet: 'bg-violet-50 border-violet-100',
    emerald: 'bg-emerald-50 border-emerald-100',
    red: 'bg-red-50 border-red-100',
  };

  return (
    <Card
      className={`border shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${colorMap[color]}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          </div>
          <div className="mt-0.5">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus | string }) {
  const config: Record<string, { label: string; className: string }> = {
    paid: { label: 'Payée', className: 'bg-green-100 text-green-700' },
    unpaid: { label: 'Non payée', className: 'bg-red-100 text-red-700' },
    overdue: { label: 'Non payée', className: 'bg-red-100 text-red-700' },
    pending: { label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
  };
  const { label, className } = config[status] || { label: status, className: '' };
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${className}`}>
      {label}
    </span>
  );
}
