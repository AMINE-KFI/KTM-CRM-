import { useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate } from '@/lib/storage';
import { generateDocumentPDF } from '@/lib/pdf';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Search, Plus, Download, CreditCard, Edit, Trash2 } from 'lucide-react';
import DocumentBuilder from './DocumentBuilder';
import PaymentModal from './PaymentModal';
import type { BusinessDocument } from '@/types';

export default function Documents() {
  const { data, getCompany, updateDocument, deleteDocument } = useCRM();
  const [showDocBuilder, setShowDocBuilder] = useState(false);
  const [editDocument, setEditDocument] = useState<BusinessDocument | null>(null);
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
      case 'partially_paid': return 'Paiement Partiel';
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

  if (showDocBuilder || editDocument) {
    return (
      <DocumentBuilder 
        initialData={editDocument || undefined} 
        onClose={() => { setShowDocBuilder(false); setEditDocument(null); }} 
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

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Rechercher par référence ou client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          {['all', 'invoice', 'proforma', 'delivery_note', 'purchase_order'].map(type => (
            <Button
              key={type}
              variant={filterType === type ? 'default' : 'outline'}
              onClick={() => setFilterType(type)}
              className={filterType === type ? 'bg-gray-900 text-white' : 'text-gray-600'}
            >
              {type === 'all' ? 'Tous' : docTypeLabels[type]}
            </Button>
          ))}
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-white">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Aucun document trouvé</p>
          <p className="text-sm text-gray-400 mt-1">Créez votre première facture ou devis ERP.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredDocuments.map(doc => {
            const entity = doc.type === 'purchase_order' 
              ? data.companies.find(c => c.id === doc.companyId && (c.role === 'supplier' || c.role === 'both'))
              : getCompany(doc.companyId);
              
            return (
              <Card 
                key={doc.id} 
                className="border border-gray-100 shadow-sm hover:border-blue-200 transition-colors cursor-pointer"
                onClick={() => setEditDocument(doc)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-bold text-gray-900">{doc.reference}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-medium">
                          {docTypeLabels[doc.type]}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(doc.status)}`}>
                          {getStatusLabel(doc.status)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{entity?.name || 'Entité inconnue'}</p>
                      <p className="text-xs text-gray-500 mt-1">Créé le {formatDate(doc.createdAt)}</p>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto border-t border-gray-100 sm:border-0 pt-3 sm:pt-0" onClick={e => e.stopPropagation()}>
                      <div className="text-left sm:text-right flex-1 sm:flex-none">
                        <p className="font-bold text-gray-900 text-lg">{formatCurrency(doc.totalAmount)}</p>
                        <p className="text-xs text-gray-500">{(doc.items || []).length} article(s)</p>
                      </div>
                      
                      {doc.type === 'purchase_order' && doc.status !== 'received' && (
                        <Button variant="outline" size="sm" onClick={() => handleMarkAsReceived(doc.id)} className="text-purple-600 border-purple-200 hover:bg-purple-50">
                          Marquer Reçu
                        </Button>
                      )}
                      
                      <div className="flex gap-1 items-center">
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
                        <Button variant="ghost" size="sm" onClick={() => handlePrint(doc)} className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0" title="Télécharger">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} />}
    </div>
  );
}
