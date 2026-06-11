import { useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/storage';
import { CreditCard, TrendingUp, Clock, Download, FileText, Search, MoreHorizontal, ArrowUpDown, Calendar as CalendarIcon, X, Filter, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { format, subMonths, startOfMonth, startOfQuarter, startOfYear, endOfMonth, endOfYear, endOfQuarter } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import PaymentModal from './PaymentModal';

export default function Payments() {
  const { data } = useCRM();
  
  // State
  const [dateRange, setDateRange] = useState<{from?: Date; to?: Date}>({});
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{key: string; direction: 'asc'|'desc'}>({key: 'balanceDue', direction: 'desc'});
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  
  // Modal states
  const [paymentCompanyId, setPaymentCompanyId] = useState<string | null>(null);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);

  // Constants
  const STATUSES = [
    { id: 'impayé', label: 'En retard / Impayé', color: 'bg-red-100 text-red-700' },
    { id: 'partiel', label: 'Partiellement payé', color: 'bg-amber-100 text-amber-700' },
    { id: 'soldé', label: 'Payé / Soldé', color: 'bg-green-100 text-green-700' },
  ];

  const shortcuts = [
    { label: "Ce mois-ci", onClick: () => setDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
    { label: "Mois dernier", onClick: () => setDateRange({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
    { label: "Ce trimestre", onClick: () => setDateRange({ from: startOfQuarter(new Date()), to: endOfQuarter(new Date()) }) },
    { label: "Cette année", onClick: () => setDateRange({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  ];

  // Logic
  const allSituations = useMemo(() => {
    let filtered = data.companies.map(company => {
      let companyInvoices = (data.documents || []).filter(i => i.companyId === company.id && i.type === 'invoice' && i.status !== 'draft' && i.status !== 'cancelled');
      
      if (dateRange.from) {
        companyInvoices = companyInvoices.filter(i => new Date(i.date) >= dateRange.from!);
      }
      if (dateRange.to) {
        companyInvoices = companyInvoices.filter(i => new Date(i.date) <= dateRange.to!);
      }
      
      const totalInvoiced = companyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      
      // Calculate total paid by summing up payments associated with this company's invoices
      const invoiceIds = companyInvoices.map(i => i.id);
      const companyPayments = (data.payments || []).filter(p => invoiceIds.includes(p.documentId) || (!p.documentId && p.companyId === company.id));
      
      let totalPaid = companyPayments.reduce((sum, p) => sum + p.amount, 0);
      
      // Also some documents might have a subtotal or a paid amount? No, the modal uses data.payments to calculate paid.
      // But wait! If we filter invoices by date, should we filter their payments too? 
      // Usually, yes or no. If we just want the status of those invoices, the payments might have happened later.
      // So we count all payments linked to these invoices.
      
      let balanceDue = totalInvoiced - totalPaid;
      // Handle overpayments or general payments if any
      if (balanceDue < 0) balanceDue = 0;
      
      let status = 'soldé';
      if (balanceDue > 0) {
        status = totalPaid > 0 ? 'partiel' : 'impayé';
      }

      return {
        company,
        totalInvoiced,
        totalPaid,
        balanceDue,
        status,
        invoicesCount: companyInvoices.length
      };
    });

    // Filtre de base
    if (!dateRange.from && !dateRange.to) {
      filtered = filtered.filter(s => s.totalInvoiced > 0 || s.totalPaid > 0);
    } else {
      filtered = filtered.filter(s => s.invoicesCount > 0);
    }

    // Filtre Client
    if (selectedClients.length > 0) {
      filtered = filtered.filter(s => selectedClients.includes(s.company.id));
    }

    // Filtre Statut
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter(s => selectedStatuses.includes(s.status));
    }

    // Sort
    filtered.sort((a: any, b: any) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [data.companies, data.invoices, dateRange, selectedClients, selectedStatuses, sortConfig]);

  // KPIs
  const globalInvoiced = allSituations.reduce((sum, s) => sum + s.totalInvoiced, 0);
  const globalPaid = allSituations.reduce((sum, s) => sum + s.totalPaid, 0);
  const globalDue = allSituations.reduce((sum, s) => sum + s.balanceDue, 0);
  
  // Dummy Trend logic for UI richness (could be calculated against previous period if needed)
  const paidTrend = globalInvoiced > 0 ? ((globalPaid / globalInvoiced) * 100).toFixed(1) : 0;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(allSituations.length / itemsPerPage));
  const paginatedSituations = allSituations.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handleExportCSV = () => {
    const headers = ['Entreprise', 'Total Facture', 'Total Encaisse', 'Reste a Payer', 'Statut'];
    const rows = allSituations.map(s => [
      `"${s.company?.name || 'Inconnu'}"`,
      s.totalInvoiced,
      s.totalPaid,
      s.balanceDue,
      s.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," + "\uFEFF"
      + headers.join(';') + "\n" 
      + rows.map(e => e.join(';')).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `creances_${format(new Date(), 'dd-MM-yyyy')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setDateRange({});
    setSelectedClients([]);
    setSelectedStatuses([]);
    setPage(1);
  };
  
  const hasFilters = selectedClients.length > 0 || selectedStatuses.length > 0 || dateRange.from;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Créances & Paiements</h1>
          <p className="text-gray-500 text-sm mt-0.5">Suivi de la situation financière globale</p>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="gap-2 bg-white shadow-sm border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-gray-900">
          <Download className="w-4 h-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Statistiques (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-blue-100 shadow-sm bg-gradient-to-br from-blue-50 to-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-blue-100 rounded-bl-full opacity-50" />
          <CardContent className="p-5 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-blue-600/80 uppercase tracking-wider">Total Facturé</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(globalInvoiced)}</p>
                <p className="text-xs text-gray-500 mt-1">Chiffre d'affaires global</p>
              </div>
              <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-inner shadow-white/50">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-green-100 shadow-sm bg-gradient-to-br from-green-50 to-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-green-100 rounded-bl-full opacity-50" />
          <CardContent className="p-5 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-green-600/80 uppercase tracking-wider">Total Encaissé</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(globalPaid)}</p>
                <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> {paidTrend}% du facturé
                </p>
              </div>
              <div className="p-3 bg-green-100 text-green-700 rounded-xl shadow-inner shadow-white/50">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-red-100 shadow-sm bg-gradient-to-br from-red-50 to-white relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-red-100 rounded-bl-full opacity-50" />
          <CardContent className="p-5 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-semibold text-red-600/80 uppercase tracking-wider">Reste à payer</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{formatCurrency(globalDue)}</p>
                <p className="text-xs text-red-500 font-medium mt-1">Montant total des créances</p>
              </div>
              <div className="p-3 bg-red-100 text-red-600 rounded-xl shadow-inner shadow-white/50">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200/60 shadow-sm overflow-hidden">
        {/* Barre de Filtres Avancés */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filtres</span>
          </div>

          {/* Filtre: Combobox Client */}
          <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={clientSearchOpen} className="w-[250px] justify-between bg-white border-gray-200">
                {selectedClients.length > 0 
                  ? `${selectedClients.length} client(s) sélectionné(s)` 
                  : "Rechercher un client..."}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Nom du client..." />
                <CommandList>
                  <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                  <CommandGroup>
                    {data.companies.map((company) => (
                      <CommandItem
                        key={company.id}
                        value={company.name}
                        onSelect={() => {
                          setSelectedClients(prev => 
                            prev.includes(company.id) ? prev.filter(id => id !== company.id) : [...prev, company.id]
                          );
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", selectedClients.includes(company.id) ? "opacity-100" : "opacity-0")} />
                        {company.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Filtre: Plage de Dates */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("justify-start text-left font-normal bg-white border-gray-200 w-[260px]", !dateRange.from && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "d MMM yyyy", { locale: fr })} -{" "}
                      {format(dateRange.to, "d MMM yyyy", { locale: fr })}
                    </>
                  ) : (
                    format(dateRange.from, "d MMM yyyy", { locale: fr })
                  )
                ) : (
                  <span>Filtrer par date...</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex border-b">
                <div className="flex flex-col gap-1 p-3 border-r bg-gray-50/50 w-36">
                  <span className="text-xs font-semibold text-gray-500 uppercase mb-1">Raccourcis</span>
                  {shortcuts.map((s, i) => (
                    <Button key={i} variant="ghost" size="sm" className="justify-start text-xs font-normal" onClick={s.onClick}>
                      {s.label}
                    </Button>
                  ))}
                </div>
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range: any) => setDateRange(range || {})}
                  numberOfMonths={2}
                  locale={fr}
                />
              </div>
            </PopoverContent>
          </Popover>

          {/* Filtre: Statut */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="bg-white border-gray-200">
                Statut {selectedStatuses.length > 0 && `(${selectedStatuses.length})`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Filtrer par statut</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STATUSES.map(status => (
                <DropdownMenuCheckboxItem
                  key={status.id}
                  checked={selectedStatuses.includes(status.id)}
                  onCheckedChange={(checked) => {
                    setSelectedStatuses(prev => 
                      checked ? [...prev, status.id] : prev.filter(id => id !== status.id)
                    );
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]}`} />
                    {status.label}
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset Filters */}
          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto h-9 px-3">
              <X className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-sm text-left text-gray-600">
            <thead className="text-xs text-gray-500 bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider">
                  <div className="flex items-center gap-2 cursor-pointer hover:text-gray-900 transition-colors" onClick={() => toggleSort('company')}>
                    Entreprise / Client <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">
                  <div className="flex items-center justify-end gap-2 cursor-pointer hover:text-gray-900 transition-colors" onClick={() => toggleSort('totalInvoiced')}>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /> Facturé
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">
                  <div className="flex items-center justify-end gap-2 cursor-pointer hover:text-gray-900 transition-colors" onClick={() => toggleSort('totalPaid')}>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /> Payé
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-right">
                  <div className="flex items-center justify-end gap-2 cursor-pointer hover:text-gray-900 transition-colors" onClick={() => toggleSort('balanceDue')}>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /> Reste à Payer
                  </div>
                </th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center">
                  Statut
                </th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-center w-20">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedSituations.map((sit) => {
                const statusDef = STATUSES.find(s => s.id === sit.status);
                return (
                  <tr key={sit.company.id} className="bg-white hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center font-bold text-blue-700 shadow-sm border border-blue-100/50">
                          {(sit.company?.name || 'I').charAt(0)}
                        </div>
                        <span className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">{sit.company?.name || 'Inconnu'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-700">{formatCurrency(sit.totalInvoiced)}</td>
                    <td className="px-6 py-4 text-right text-green-600 font-medium">{formatCurrency(sit.totalPaid)}</td>
                    <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(sit.balanceDue)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${statusDef?.color || 'bg-gray-100 text-gray-600'}`}>
                        {statusDef?.label || 'Inconnu'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-900 data-[state=open]:bg-gray-100">
                            <span className="sr-only">Ouvrir le menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => window.location.hash = `#company/${sit.company.id}`} className="cursor-pointer">
                            <Search className="mr-2 h-4 w-4 text-gray-400" /> Voir les détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setPaymentCompanyId(sit.company.id)} className="cursor-pointer font-medium text-blue-600 focus:text-blue-700">
                            <CreditCard className="mr-2 h-4 w-4 text-blue-500" /> Ajouter un paiement
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => window.location.href = `mailto:${sit.company.email || ''}?subject=Relance de facture impayée - Katamine`}
                            className="cursor-pointer text-amber-600 focus:text-amber-700"
                            disabled={sit.balanceDue <= 0 || !sit.company.email}
                          >
                            <Download className="mr-2 h-4 w-4 text-amber-500" /> Envoyer une relance
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
              {paginatedSituations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                      <Search className="w-10 h-10 mb-3 opacity-20" />
                      <p className="text-base font-medium text-gray-500">Aucune donnée trouvée</p>
                      <p className="text-sm mt-1">Modifiez vos filtres pour voir plus de résultats.</p>
                      {hasFilters && (
                        <Button variant="link" onClick={clearFilters} className="mt-2 text-blue-600">
                          Effacer les filtres
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {allSituations.length > 0 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Affichage <span className="font-medium text-gray-900">{(page - 1) * itemsPerPage + 1}</span> à <span className="font-medium text-gray-900">{Math.min(page * itemsPerPage, allSituations.length)}</span> sur <span className="font-medium text-gray-900">{allSituations.length}</span> résultats
            </p>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-8 px-2 bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm font-medium px-2 text-gray-600">
                {page} / {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="h-8 px-2 bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {paymentCompanyId && (
        <PaymentModal 
          companyId={paymentCompanyId}
          onClose={() => setPaymentCompanyId(null)}
        />
      )}
    </div>
  );
}
