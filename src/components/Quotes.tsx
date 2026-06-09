import { useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Plus, Search, CheckCircle2, Clock, XCircle, MoreVertical, FileDown } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import QuoteForm from './QuoteForm';

export default function Quotes() {
  const { data, convertQuoteToInvoice, deleteQuote, updateQuote } = useCRM();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [showForm, setShowForm] = useState(false);

  const enrichedQuotes = useMemo(() => {
    return (data.quotes || [])
      .map(q => ({
        ...q,
        company: data.companies.find(c => c.id === q.companyId),
      }))
      .filter(q => q.company);
  }, [data]);

  const filtered = useMemo(() => {
    return enrichedQuotes.filter(q => {
      const matchSearch = !search ||
        q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
        q.company!.name.toLowerCase().includes(search.toLowerCase());

      const matchTab = activeTab === 'all' ? true : q.status === activeTab;
      return matchSearch && matchTab;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [enrichedQuotes, search, activeTab]);

  const handleConvert = (id: string) => {
    if (confirm('Convertir ce devis en facture ? Le devis passera en statut "Accepté".')) {
      const newInvoice = convertQuoteToInvoice(id);
      if (newInvoice) {
        alert('Facture générée avec succès : ' + newInvoice.invoiceNumber);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'rejected': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'sent': return <FileText className="w-5 h-5 text-blue-500" />;
      default: return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted': return <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium">Accepté</span>;
      case 'rejected': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">Refusé</span>;
      case 'sent': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">Envoyé</span>;
      default: return <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">Brouillon</span>;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
          <p className="text-gray-500 text-sm mt-0.5">{(data.quotes || []).length} devis au total</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Nouveau devis
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par n° devis ou entreprise..."
          className="pl-9 bg-white border-gray-200"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-gray-100">
          <TabsTrigger value="all">Tous</TabsTrigger>
          <TabsTrigger value="draft">Brouillons</TabsTrigger>
          <TabsTrigger value="sent" className="text-blue-700">Envoyés</TabsTrigger>
          <TabsTrigger value="accepted" className="text-green-700">Acceptés</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucun devis trouvé</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map(quote => (
                <Card key={quote.id} className="border border-gray-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg flex-shrink-0 mt-0.5 bg-gray-50">
                          {getStatusIcon(quote.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900">{quote.quoteNumber}</span>
                            {getStatusBadge(quote.status)}
                          </div>
                          <p className="text-sm font-medium text-gray-700 mt-0.5">{quote.company?.name}</p>
                          {quote.description && <p className="text-xs text-gray-400 mt-0.5 truncate">{quote.description}</p>}
                          <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                            <span>Émis: {formatDate(quote.issueDate)}</span>
                            <span>Valide jusqu'au: {formatDate(quote.expiryDate)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="font-bold text-gray-900">{formatCurrency(quote.totalAmount)}</p>
                          <p className="text-xs text-gray-400">HT: {formatCurrency(quote.amount)}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {quote.status !== 'accepted' && (
                              <DropdownMenuItem onClick={() => handleConvert(quote.id)} className="text-green-600 font-medium">
                                <FileDown className="w-4 h-4 mr-2" />
                                Convertir en facture
                              </DropdownMenuItem>
                            )}
                            {quote.status !== 'sent' && (
                              <DropdownMenuItem onClick={() => updateQuote(quote.id, { status: 'sent' })}>
                                Marquer comme envoyé
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => updateQuote(quote.id, { status: 'rejected' })} className="text-red-600">
                              Marquer comme refusé
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { if (confirm('Supprimer ce devis ?')) deleteQuote(quote.id); }}
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
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {showForm && <QuoteForm onClose={() => setShowForm(false)} />}
    </div>
  );
}
