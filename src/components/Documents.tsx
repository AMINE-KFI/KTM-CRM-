import { useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate } from '@/lib/storage';
import { generateDocumentPDF } from '@/lib/pdf';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Search, Plus, Download, CreditCard, Edit, Trash2, Filter, TrendingUp, AlertCircle } from 'lucide-react';
import DocumentBuilder from './DocumentBuilder';
import PaymentModal from './PaymentModal';
import type { BusinessDocument, DocumentType } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function Documents() {
  const { data, getCompany, updateDocument, deleteDocument } = useCRM();
  const [showDocBuilder, setShowDocBuilder] = useState(false);
  const [editDocument, setEditDocument] = useState<BusinessDocument | null>(null);
  const [convertingDoc, setConvertingDoc] = useState<BusinessDocument | null>(null);
  const [convertingTargetType, setConvertingTargetType] = useState<DocumentType | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const documents = data.documents || [];

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      const entity = doc.type === 'purchase_order' 
        ? data.companies.find(c => c.id === doc.companyId && (c.role === 'supplier' || c.role === 'both'))
        : getCompany(doc.companyId);
        
      const searchMatch = 
        doc.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entity?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const typeMatch = filterType === 'all' || doc.type === filterType;

      return searchMatch && typeMatch;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [documents, searchTerm, filterType, getCompany, data.companies]);

  const kpis = useMemo(() => {
    const invoices = documents.filter(d => d.type === 'invoice' && d.status !== 'cancelled');
    const proformas = documents.filter(d => d.type === 'proforma' && (d.status === 'draft' || d.status === 'validated'));
    
    const totalInvoiced = invoices.reduce((sum, d) => sum + d.totalAmount, 0);
    const pendingQuotesCount = proformas.length;
    
    return { totalInvoiced, pendingQuotesCount };
  }, [documents]);

  const docTypeLabels: Record<string, string> = {
    invoice: 'Facture',
    proforma: 'Proforma',
    delivery_note: 'BL',
    purchase_order: 'BC'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'partially_paid': return 'bg-yellow-100 text-yellow-700';
      case 'validated': return 'bg-blue-100 text-blue-700';
      case 'received': return 'bg-purple-100 text-purple-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Payé';
      case 'partially_paid': return 'Partiel';
      case 'validated': return 'Validé';
      case 'received': return 'Reçu';
      case 'draft': return 'Brouillon';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const handlePrint = (doc: BusinessDocument) => {
    // For purchase orders, we'll pass the supplier as the company for the PDF generator
    const entity = doc.type === 'purchase_order' 
      ? data.companies.find(c => c.id === doc.companyId && (c.role === 'supplier' || c.role === 'both'))
      : getCompany(doc.companyId);

    const fs = data.fiscalSettings && doc.tenant ? data.fiscalSettings[doc.tenant] : undefined;

    if (entity) {
      // Cast entity to any since the PDF generator expects a Company type
      generateDocumentPDF(doc, entity as any, fs);
    } else {
      alert("Erreur: Entité introuvable");
    }
  };

  const handleMarkAsReceived = (docId: string) => {
    if (confirm('Marquer cette commande comme reçue ? Les stocks seront mis à jour automatiquement.')) {
      updateDocument(docId, { status: 'received' });
    }
  };

  const handleCancelDocument = (docId: string) => {
    if (confirm("Voulez-vous vraiment annuler ce document ? Cette action est irréversible et il restera tracé en tant qu'annulé.")) {
      updateDocument(docId, { status: 'cancelled' });
    }
  };

  const handleDeleteDocument = (docId: string) => {
    if (confirm("Supprimer définitivement ce brouillon ?")) {
      deleteDocument(docId);
    }
  };

  const getConversionOptions = (doc: BusinessDocument) => {
    switch (doc.type) {
      case 'proforma': return [{ type: 'invoice', label: 'Facture' }, { type: 'delivery_note', label: 'BL' }];
      case 'invoice': return [{ type: 'delivery_note', label: 'BL' }];
      case 'delivery_note': return [{ type: 'invoice', label: 'Facture' }];
      default: return [];
    }
  };

  if (showDocBuilder || editDocument || convertingDoc) {
    return (
      <DocumentBuilder 
        onClose={() => { 
          setShowDocBuilder(false); 
          setEditDocument(null); 
          setConvertingDoc(null);
          setConvertingTargetType(null);
        }}
        initialData={editDocument || undefined}
        sourceData={convertingDoc || undefined}
        defaultType={convertingTargetType || undefined}
        onConvert={(doc, targetType) => {
          setEditDocument(null);
          setConvertingDoc(doc);
          setConvertingTargetType(targetType);
          setShowDocBuilder(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ERP : Documents</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filteredDocuments.length} document(s)</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowPaymentModal(true)} variant="outline" className="gap-2 text-green-600 border-green-200 hover:bg-green-50">
            <CreditCard className="w-4 h-4" /> Encaisser
          </Button>
          <Button onClick={() => { setEditDocument(null); setShowDocBuilder(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Créer un document
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border border-blue-100 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50 overflow-hidden rounded-2xl relative">
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none scale-150">
            <TrendingUp className="w-24 h-24 text-blue-900" />
          </div>
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Facturé</p>
              <p className="text-2xl sm:text-4xl font-bold text-blue-900 mt-1 truncate">{formatCurrency(kpis.totalInvoiced)}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-indigo-100 shadow-sm bg-gradient-to-br from-indigo-50 to-violet-50 overflow-hidden rounded-2xl relative">
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none scale-150">
            <FileText className="w-24 h-24 text-indigo-900" />
          </div>
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Devis en attente</p>
              <p className="text-2xl sm:text-4xl font-bold text-indigo-900 mt-1 truncate">{kpis.pendingQuotesCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-200/60 shadow-sm overflow-hidden bg-white mt-5">
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-col md:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 mr-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filtres</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher par référence..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 w-[250px] bg-white border-gray-200"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto w-full md:w-auto">
            {['all', 'invoice', 'proforma', 'delivery_note', 'purchase_order'].map(type => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(type)}
                className={filterType === type ? 'bg-gray-900 text-white h-9' : 'text-gray-600 h-9 bg-white'}
              >
                {type === 'all' ? 'Tous' : docTypeLabels[type]}
              </Button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucun document trouvé</p>
              <p className="text-sm text-gray-300 mt-1">Créez votre première facture ou devis.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-4 py-4 whitespace-nowrap">Référence</th>
                  <th className="px-4 py-4">Client / Fournisseur</th>
                  <th className="px-4 py-4">Date</th>
                  <th className="px-4 py-4 text-right">Montant</th>
                  <th className="px-4 py-4 text-center">Statut</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDocuments.map(doc => {
                  const entity = doc.type === 'purchase_order' 
                    ? data.companies.find(c => c.id === doc.companyId && (c.role === 'supplier' || c.role === 'both'))
                    : getCompany(doc.companyId);
                    
                  return (
                    <tr 
                      key={doc.id} 
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer group"
                      onClick={() => setEditDocument(doc)}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{doc.reference}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded font-medium whitespace-nowrap">
                            {docTypeLabels[doc.type]}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-800">
                        {entity?.name || 'Entité inconnue'}
                      </td>
                      <td className="px-4 py-4 text-gray-500">
                        {formatDate(doc.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="font-bold text-gray-900">{formatCurrency(doc.totalAmount)}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusColor(doc.status)}`}>
                          {getStatusLabel(doc.status)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-1 items-center opacity-80 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          {doc.type === 'purchase_order' && doc.status !== 'received' && (
                            <Button variant="outline" size="sm" onClick={() => handleMarkAsReceived(doc.id)} className="text-purple-600 border-purple-200 hover:bg-purple-50 h-8 text-xs">
                              Marquer Reçu
                            </Button>
                          )}
                          {doc.status === 'draft' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => { setEditDocument(doc); setShowDocBuilder(true); }} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0" title="Modifier">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0" title="Supprimer">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {(doc.status === 'validated' || doc.status === 'partially_paid') && (
                            <Button variant="ghost" size="sm" onClick={() => handleCancelDocument(doc.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 text-xs px-2 h-8">
                              Annuler
                            </Button>
                          )}
                          {getConversionOptions(doc).length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-purple-600 hover:bg-purple-50 text-xs px-2 h-8">
                                  Convertir
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {getConversionOptions(doc).map(opt => (
                                  <DropdownMenuItem key={opt.type} onClick={(e) => {
                                    e.stopPropagation();
                                    setConvertingDoc(doc);
                                    setConvertingTargetType(opt.type as DocumentType);
                                  }}>
                                    En {opt.label}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => handlePrint(doc)} className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0" title="Télécharger">
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} />}
    </div>
  );
}
