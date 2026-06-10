import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { PaymentMethod } from '@/types';

interface PaymentModalProps {
  onClose: () => void;
  defaultCompanyId?: string;
  defaultDocumentId?: string;
  suggestedAmount?: number;
}

export default function PaymentModal({ onClose, defaultCompanyId, defaultDocumentId, suggestedAmount }: PaymentModalProps) {
  const { data, addPayment, currentTenant } = useCRM();

  const [companyId, setCompanyId] = useState(defaultCompanyId || '');
  const [documentId, setDocumentId] = useState(defaultDocumentId || 'none');
  const [amount, setAmount] = useState(suggestedAmount ? suggestedAmount.toString() : '');
  const [method, setMethod] = useState<'cash' | 'check' | 'transfer' | 'traite'>('transfer');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Filter out documents to allow linking to a specific validated/partially_paid invoice
  const companyDocuments = (data.documents || []).filter(
    d => d.companyId === companyId && d.type === 'invoice' && (d.status === 'validated' || d.status === 'partially_paid')
  );

  const selectedDoc = companyDocuments.find(d => d.id === documentId);
  const totalPaid = selectedDoc ? (data.payments || []).filter(p => p.documentId === selectedDoc.id).reduce((sum, p) => sum + p.amount, 0) : 0;
  const balanceDue = selectedDoc ? selectedDoc.totalAmount - totalPaid : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !amount || isNaN(parseFloat(amount))) {
      alert("Veuillez sélectionner un client et entrer un montant valide.");
      return;
    }

    if (selectedDoc && parseFloat(amount) > balanceDue) {
       if (!confirm("Le montant est supérieur au reste à payer. Voulez-vous continuer ?")) return;
    }

    addPayment({
      companyId,
      documentId: documentId === 'none' ? undefined : documentId,
      amount: parseFloat(amount),
      mode: method,
      date,
      tenant: currentTenant || 'katamine',
      reference: notes
    } as any);

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
            <Select value={companyId} onValueChange={setCompanyId} required disabled={!!defaultCompanyId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionner une entreprise..." />
              </SelectTrigger>
              <SelectContent>
                {data.companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Lier à un document (Optionnel)</Label>
            <Select value={documentId} onValueChange={setDocumentId} disabled={!companyId || companyDocuments.length === 0}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder={companyDocuments.length === 0 ? "Aucune facture en attente" : "Sélectionner une facture..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Paiement global / Acompte</SelectItem>
                {companyDocuments.map(d => {
                  const paid = (data.payments || []).filter(p => p.documentId === d.id).reduce((sum, p) => sum + p.amount, 0);
                  return (
                    <SelectItem key={d.id} value={d.id}>{d.reference} (Reste: {(d.totalAmount - paid).toFixed(2)} DZD)</SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Montant reçu *</Label>
              <div className="flex flex-col">
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="mt-1"
                />
                {documentId !== 'none' && selectedDoc && (
                   <span className="text-xs text-gray-500 mt-1">Reste à payer : <strong className="text-red-600">{balanceDue.toFixed(2)} DZD</strong></span>
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
