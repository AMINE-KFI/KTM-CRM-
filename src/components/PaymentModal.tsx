import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';

interface PaymentModalProps {
  onClose: () => void;
  defaultCompanyId?: string;
  defaultDocumentId?: string;
  suggestedAmount?: number;
}

export default function PaymentModal({ onClose, defaultCompanyId, defaultDocumentId, suggestedAmount }: PaymentModalProps) {
  const { data, addPayment, currentTenant } = useCRM();

  const [companyId, setCompanyId] = useState(defaultCompanyId || '');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>(
    defaultDocumentId && defaultDocumentId !== 'none' ? [defaultDocumentId] : []
  );
  const [amount, setAmount] = useState(suggestedAmount ? suggestedAmount.toString() : '');
  const [method, setMethod] = useState<'cash' | 'check' | 'transfer' | 'traite'>('transfer');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Filter out documents to allow linking to validated/partially_paid invoices
  const companyDocuments = (data.documents || []).filter(
    d => d.companyId === companyId && d.type === 'invoice' && (d.status === 'validated' || d.status === 'partially_paid')
  );

  const selectedDocsInfo = companyDocuments.filter(d => selectedDocuments.includes(d.id));
  const totalBalanceDue = selectedDocsInfo.reduce((sum, d) => {
    const paid = (data.payments || []).filter(p => p.documentId === d.id).reduce((s, p) => s + p.amount, 0);
    return sum + (d.totalAmount - paid);
  }, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !amount || isNaN(parseFloat(amount))) {
      alert("Veuillez sélectionner un client et entrer un montant valide.");
      return;
    }

    const totalAmount = parseFloat(amount);

    if (selectedDocuments.length > 0 && totalAmount > totalBalanceDue + 0.01) {
       if (!confirm("Le montant est supérieur au reste à payer des factures sélectionnées. Le surplus sera enregistré comme un paiement global (Acompte). Voulez-vous continuer ?")) return;
    }

    const commonPaymentData = {
      companyId,
      mode: method,
      date,
      tenant: currentTenant || 'katamine',
      reference: notes
    };

    if (selectedDocuments.length === 0) {
      // Paiement global non lié à une facture spécifique
      addPayment({
        ...commonPaymentData,
        amount: totalAmount,
      } as any);
    } else {
      let remainingAmount = totalAmount;
      
      // Trier les factures de la plus ancienne à la plus récente
      const sortedDocs = companyDocuments
        .filter(d => selectedDocuments.includes(d.id))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      for (const doc of sortedDocs) {
        if (remainingAmount <= 0) break;
        
        const paid = (data.payments || []).filter(p => p.documentId === doc.id).reduce((sum, p) => sum + p.amount, 0);
        const balance = doc.totalAmount - paid;
        
        if (balance > 0) {
          const amountToPay = Math.min(balance, remainingAmount);
          addPayment({
            ...commonPaymentData,
            documentId: doc.id,
            amount: amountToPay
          } as any);
          remainingAmount -= amountToPay;
        }
      }
      
      // S'il reste de l'argent après avoir soldé les factures sélectionnées, on crée un paiement global (acompte)
      if (remainingAmount > 0.001) {
        addPayment({
          ...commonPaymentData,
          documentId: undefined,
          amount: remainingAmount
        } as any);
      }
    }

    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enregistrer un Paiement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          
          <div>
            <Label>Client *</Label>
            <Select 
              value={companyId} 
              onValueChange={(val) => {
                setCompanyId(val);
                setSelectedDocuments([]);
              }} 
              required 
              disabled={!!defaultCompanyId}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner une entreprise..." />
              </SelectTrigger>
              <SelectContent>
                {data.companies
                  .filter(c => c.role !== 'supplier')
                  .map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          {companyId && (
            <div>
              <Label>Factures à régler (Optionnel)</Label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border border-gray-200 p-3 rounded-md bg-gray-50/50">
                {companyDocuments.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">Aucune facture en attente de paiement.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1 border-b border-gray-200 pb-2">
                      <Checkbox 
                        id="select-all"
                        checked={selectedDocuments.length === companyDocuments.length && companyDocuments.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDocuments(companyDocuments.map(d => d.id));
                          } else {
                            setSelectedDocuments([]);
                          }
                        }}
                      />
                      <Label htmlFor="select-all" className="text-sm font-semibold cursor-pointer text-gray-700">
                        Tout sélectionner
                      </Label>
                    </div>
                    {companyDocuments.map(d => {
                      const paid = (data.payments || []).filter(p => p.documentId === d.id).reduce((sum, p) => sum + p.amount, 0);
                      const balance = d.totalAmount - paid;
                      return (
                        <div key={d.id} className="flex items-center space-x-2">
                          <Checkbox 
                            id={`doc-${d.id}`}
                            checked={selectedDocuments.includes(d.id)}
                            onCheckedChange={(checked) => {
                              if (checked) setSelectedDocuments([...selectedDocuments, d.id]);
                              else setSelectedDocuments(selectedDocuments.filter(id => id !== d.id));
                            }}
                          />
                          <Label htmlFor={`doc-${d.id}`} className="text-sm font-normal cursor-pointer flex-1">
                            {d.reference} <span className="text-gray-500 text-xs ml-1">(Reste: {balance.toFixed(2)} DA)</span>
                          </Label>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Montant reçu *</Label>
              <div className="flex flex-col mt-1 space-y-2">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
                {selectedDocuments.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs text-gray-600">
                      Reste à payer : <strong className="text-red-600">{totalBalanceDue.toFixed(2)} DA</strong>
                    </span>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800"
                      onClick={() => setAmount(totalBalanceDue.toFixed(2))}
                    >
                      Tout solder d'un coup
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label>Date du paiement *</Label>
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Moyen de paiement</Label>
            <Select value={method} onValueChange={(v: 'cash' | 'check' | 'transfer' | 'traite') => setMethod(v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Virement bancaire</SelectItem>
                <SelectItem value="check">Chèque</SelectItem>
                <SelectItem value="cash">Espèces</SelectItem>
                <SelectItem value="traite">Traite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes / Réf. (Numéro de chèque, etc.)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Chèque n° 123456 Banque BNA"
              className="mt-1"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
              Valider le paiement
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
