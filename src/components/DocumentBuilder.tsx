import { useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, generateId } from '@/lib/storage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Printer, CreditCard, AlertTriangle } from 'lucide-react';
import { PrintOptionsModal } from './PrintOptionsModal';
import PaymentModal from './PaymentModal';
import { generateDocumentPDF } from '@/lib/pdf';
import type { PrintOptions } from '@/lib/pdf';
import type { DocumentType, DocumentItem, BusinessDocument } from '@/types';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface DocumentBuilderProps {
  onClose: () => void;
  defaultType?: DocumentType;
  defaultCompanyId?: string;
  initialData?: BusinessDocument;
  sourceData?: BusinessDocument;
  onConvert?: (doc: BusinessDocument, targetType: DocumentType) => void;
}

export default function DocumentBuilder({ onClose, defaultType = 'invoice', defaultCompanyId = '', initialData, sourceData, onConvert }: DocumentBuilderProps) {
  const { data, addDocument, updateDocument, tenant: globalTenant, currentUser, addActivityLog } = useCRM();
  
  const isReadOnly = initialData && initialData.status !== 'draft';

  const [tenant, setTenant] = useState<TenantType>(initialData?.tenant || globalTenant || 'katamine');
  const [isPrintOptionsOpen, setIsPrintOptionsOpen] = useState(false);
  const [type, setType] = useState<DocumentType>(initialData?.type || defaultType);
  const isPurchase = type === 'purchase_order' || type === 'supplier_invoice' || type === 'receipt_note';
  const [companyId, setCompanyId] = useState(initialData?.companyId || sourceData?.companyId || defaultCompanyId);
  const [vatRate, setVatRate] = useState<number>(initialData?.vatRate ?? sourceData?.vatRate ?? 0.19);
  const [issueDate, setIssueDate] = useState(() => initialData?.createdAt ? initialData.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    if (initialData?.dueDate) return initialData.dueDate;
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState(initialData?.notes || sourceData?.notes || '');
  const [poReference, setPoReference] = useState(initialData?.poReference || sourceData?.poReference || '');
  const [paymentMethod, setPaymentMethod] = useState(initialData?.paymentMethod || 'À échéance');
  
  const [items, setItems] = useState<DocumentItem[]>(
    initialData?.items || 
    (sourceData?.items ? sourceData.items.map(i => ({...i, id: generateId()})) : [])
  );
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [linkedDocumentId, setLinkedDocumentId] = useState(initialData?.linkedDocumentId || sourceData?.id || undefined);
  const [linkedDocumentRef, setLinkedDocumentRef] = useState(initialData?.linkedDocumentRef || sourceData?.reference || undefined);

  // Calculate totals
  const subTotal = useMemo(() => items.reduce((sum, item) => sum + item.total, 0), [items]);
  const taxAmount = subTotal * vatRate;
  const totalAmount = subTotal + taxAmount;

  const totalPaid = initialData ? (data.payments || []).filter(p => p.documentId === initialData.id).reduce((sum, p) => sum + p.amount, 0) : 0;
  const balanceDue = initialData ? initialData.totalAmount - totalPaid : 0;

  const handleAddItem = () => {
    setItems(prev => [...prev, {
      id: generateId(),
      productId: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: keyof DocumentItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      
      const updated = { ...item, [field]: value };
      
      // Auto-fill price when product is selected
      if (field === 'productId') {
        const product = data.products.find(p => p.id === value);
        if (product) {
          updated.name = product.name;
          const price = tenant && product.prices && product.prices[tenant] 
            ? product.prices[tenant] 
            : product.price;
          updated.unitPrice = isPurchase && product.purchasePrice !== undefined ? product.purchasePrice : price;
        }
      }

      // Recalculate line total
      updated.total = updated.quantity * updated.unitPrice;
      
      return updated;
    }));
  };

  const handleSave = (targetStatus: 'draft' | 'validated') => {
    if (!companyId || items.length === 0) {
      alert(`Veuillez sélectionner un ${isPurchase ? 'fournisseur' : 'client'} et ajouter au moins un article.`);
      return;
    }

    if (targetStatus === 'validated') {
      if (!confirm("Attention : Une fois validé, ce document ne pourra plus être modifié ni supprimé. Voulez-vous continuer ?")) {
        return;
      }
    }

    const docData = {
      type,
      companyId,
      tenant: tenant,
      items,
      subtotal: subTotal,
      vatAmount: taxAmount,
      totalAmount,
      status: targetStatus,
      date: issueDate,
      createdAt: issueDate,
      dueDate,
      poReference,
      notes,
      vatRate,
      linkedDocumentId,
      linkedDocumentRef,
      paymentMethod
    };

    if (initialData) {
      updateDocument(initialData.id, docData as any);
      if (initialData.status !== 'validated' && targetStatus === 'validated' && currentUser) {
        addActivityLog({
          type: 'document_validated',
          title: 'Document validé',
          description: `${currentUser.firstName} a validé le document ${initialData.reference || 'sans référence'}`,
          userId: currentUser.id,
          tenant: globalTenant,
        });
      }
    } else {
      const newDoc = addDocument(docData as any);
      if (targetStatus === 'validated' && currentUser) {
        addActivityLog({
          type: 'document_validated',
          title: 'Document validé',
          description: `${currentUser.firstName} a validé le document ${newDoc.reference || 'sans référence'}`,
          userId: currentUser.id,
          tenant: globalTenant,
        });
      }
    }
    
    onClose();
  };

  const handlePrint = () => {
    if (!initialData) return;
    setIsPrintOptionsOpen(true);
  };

  const handlePrintConfirm = (options: PrintOptions) => {
    if (!initialData) return;
    const entity = initialData.type === 'purchase_order' 
      ? data.companies.find(c => c.id === initialData.companyId && (c.role === 'supplier' || c.role === 'both'))
      : getCompany(initialData.companyId);

    const fs = data.fiscalSettings && tenant ? data.fiscalSettings[tenant] : undefined;

    if (entity) {
      generateDocumentPDF(initialData, entity as any, fs, totalPaid, false, options);
    }
  };

  const conversionOptions = (() => {
    if (!initialData || !onConvert) return [];
    switch (initialData.type) {
      case 'proforma':
        return [{ type: 'invoice' as DocumentType, label: 'Facture' }, { type: 'delivery_note' as DocumentType, label: 'Bon de Livraison' }];
      case 'invoice':
        return [{ type: 'delivery_note' as DocumentType, label: 'Bon de Livraison' }];
      case 'delivery_note':
        return [{ type: 'invoice' as DocumentType, label: 'Facture' }];
      case 'purchase_order':
        return [{ type: 'supplier_invoice' as DocumentType, label: 'Facture Fournisseur' }, { type: 'receipt_note' as DocumentType, label: 'Bon de Réception' }];
      case 'receipt_note':
        return [{ type: 'supplier_invoice' as DocumentType, label: 'Facture Fournisseur' }];
      default:
        return [];
    }
  })();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full min-h-[600px]">
      <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onClose} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isReadOnly ? 'Détails du document' : initialData ? 'Modifier le document' : 'Créer un document'} 
              <span className="text-gray-400 text-base font-normal ml-2">({tenant === 'kltools' ? 'KL Tools' : 'Katamine'})</span>
            </h2>
            {initialData && (
              <p className="text-sm font-medium mt-0.5 text-blue-600">Ref: {initialData.reference}</p>
            )}
            {linkedDocumentRef && !initialData && (
              <p className="text-sm font-medium mt-0.5 text-blue-600">Suite au: {linkedDocumentRef}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          {initialData && conversionOptions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50">
                  Convertir en...
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {conversionOptions.map(opt => (
                  <DropdownMenuItem key={opt.type} onClick={() => onConvert!(initialData, opt.type)}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isReadOnly && (
            <Button type="button" variant="outline" onClick={handlePrint} className="gap-2 text-gray-700">
              <Printer className="w-4 h-4" /> Imprimer / PDF
            </Button>
          )}
          {isReadOnly && type === 'invoice' && (
            <Button 
               type="button" 
               className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-sm"
               onClick={() => setIsPaymentModalOpen(true)}
               disabled={balanceDue <= 0}
            >
              <CreditCard className="w-4 h-4" /> 
              {balanceDue > 0 ? 'Encaisser' : 'Déjà soldée'}
            </Button>
          )}
          {(!initialData || initialData.status === 'draft') && (
            <>
              <Button type="button" variant="secondary" onClick={() => handleSave('draft')}>
                Sauvegarder Brouillon
              </Button>
              <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleSave('validated')}>
                Valider définitivement
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="p-4 md:p-6 flex-1 overflow-y-auto">
        <form onSubmit={(e) => { e.preventDefault(); handleSave('draft'); }} className="space-y-8 max-w-4xl mx-auto">
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>Type de Document</Label>
              <Select value={type} onValueChange={(v: DocumentType) => setType(v)} disabled={isReadOnly}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invoice">Facture</SelectItem>
                  <SelectItem value="proforma">Facture Proforma</SelectItem>
                  <SelectItem value="delivery_note">Bon de livraison</SelectItem>
                  <SelectItem value="purchase_order">Bon de commande</SelectItem>
                  <SelectItem value="supplier_invoice">Facture Fournisseur</SelectItem>
                  <SelectItem value="receipt_note">Bon de Réception</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>TVA Globale</Label>
              <Select value={vatRate.toString()} onValueChange={(v) => setVatRate(parseFloat(v))} disabled={isReadOnly}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.19">19% (Standard)</SelectItem>
                  <SelectItem value="0.09">9% (Réduit)</SelectItem>
                  <SelectItem value="0">0% (Exonéré/Export)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{isPurchase ? 'Fournisseur' : 'Client'} *</Label>
              <Select value={companyId} onValueChange={setCompanyId} required disabled={isReadOnly}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={`Sélectionner un ${isPurchase ? 'fournisseur' : 'client'}...`} />
                </SelectTrigger>
                <SelectContent>
                  {isPurchase 
                    ? data.companies.filter(c => c.role === 'supplier' || c.role === 'both').map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))
                    : data.companies.filter(c => c.role === 'client' || !c.role || c.role === 'both').map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Date d'émission</Label>
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="mt-1" disabled={isReadOnly} />
              </div>
              <div>
                <Label>Échéance</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="mt-1" disabled={isReadOnly} />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 col-span-2">
              <div>
                <Label>Réf. Bon de Commande (Optionnel)</Label>
                <Input type="text" placeholder="Ex: BC-2026-045" value={poReference} onChange={e => setPoReference(e.target.value)} className="mt-1" disabled={isReadOnly} />
              </div>
              <div>
                <Label>Moyen de paiement</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod} disabled={isReadOnly}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Espèces">Espèces</SelectItem>
                    <SelectItem value="Virement bancaire">Virement bancaire</SelectItem>
                    <SelectItem value="Chèque">Chèque</SelectItem>
                    <SelectItem value="Versement sur compte">Versement sur compte</SelectItem>
                    <SelectItem value="Carte bancaire (TPE)">Carte bancaire (TPE)</SelectItem>
                    <SelectItem value="E-paiement">E-paiement</SelectItem>
                    <SelectItem value="À échéance">À échéance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Lignes du document */}
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Articles</h3>
              {!isReadOnly && (
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="gap-2">
                  <Plus className="w-4 h-4" /> Ajouter une ligne
                </Button>
              )}
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="flex items-start gap-3 bg-white p-3 border border-gray-100 rounded-md shadow-sm">
                  <div className="flex-1">
                    <Label className="text-xs">Produit / Service</Label>
                    <Select value={item.productId} onValueChange={v => handleItemChange(item.id, 'productId', v)} disabled={isReadOnly}>
                      <SelectTrigger className="mt-1 h-9">
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {data.products.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="w-32">
                    <Label className="text-xs">Nom personnalisé</Label>
                    <Input 
                      className="mt-1 h-9 bg-white" 
                      value={item.name} 
                      onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                      placeholder={item.productId ? "" : "Nom libre"}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="w-24">
                    <Label className="text-xs">Quantité</Label>
                    <Input 
                      type="number" min="1" step="1"
                      className="mt-1 h-9 bg-white" 
                      value={item.quantity} 
                      onChange={e => handleItemChange(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly}
                    />
                    {/* Stock warning removed */}
                  </div>

                  <div className="w-32">
                    <Label className="text-xs">Prix unitaire HT</Label>
                    <Input 
                      type="number" min="0" step="0.01"
                      className="mt-1 h-9 bg-white" 
                      value={item.unitPrice} 
                      onChange={e => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      disabled={isReadOnly}
                    />
                  </div>

                  <div className="w-32">
                    <Label className="text-xs">Total Ligne HT</Label>
                    <div className="mt-1 h-9 flex items-center px-3 bg-gray-50 border border-gray-200 rounded-md text-sm font-medium">
                      {formatCurrency(item.total)}
                    </div>
                  </div>

                  {!isReadOnly && (
                    <Button 
                      type="button" variant="ghost" 
                      className="mt-6 text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
                      onClick={() => handleRemoveItem(item.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {items.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-sm italic">
                  Aucun article ajouté. Cliquez sur "Ajouter une ligne".
                </div>
              )}
            </div>
            
            {items.length > 0 && (
              <div className="mt-6 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Total HT</span>
                    <span>{formatCurrency(subTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>TVA ({vatRate * 100}%)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2 mt-2">
                    <span>Net à payer</span>
                    <span>{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <Label>Notes & Conditions</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Conditions de paiement, RIB, détails supplémentaires..."
              className="mt-1"
              rows={3}
              disabled={isReadOnly}
            />
          </div>
        </form>
      </div>

      {isPaymentModalOpen && initialData && (
        <PaymentModal
          onClose={() => setIsPaymentModalOpen(false)}
          defaultCompanyId={initialData.companyId}
          defaultDocumentId={initialData.id}
          suggestedAmount={balanceDue > 0 ? balanceDue : undefined}
        />
      )}

      <PrintOptionsModal 
        isOpen={isPrintOptionsOpen} 
        onClose={() => setIsPrintOptionsOpen(false)} 
        onConfirm={handlePrintConfirm} 
      />
    </div>
  );
}
