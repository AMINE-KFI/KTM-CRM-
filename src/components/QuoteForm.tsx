import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency } from '@/lib/storage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { QuoteStatus } from '@/types';

interface QuoteFormProps {
  companyId?: string;
  onClose: () => void;
}

export default function QuoteForm({ companyId, onClose }: QuoteFormProps) {
  const { addQuote, data } = useCRM();

  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return {
      companyId: companyId || '',
      quoteNumber: `DEV-${new Date().getFullYear()}-${String((data.quotes || []).length + 1).padStart(3, '0')}`,
      issueDate: today,
      expiryDate: in30,
      amount: '',
      vatRate: '19', // standard in Algeria
      description: '',
      status: 'draft' as QuoteStatus,
      notes: '',
    };
  });

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const vatAmount = parseFloat(form.amount || '0') * (parseFloat(form.vatRate) / 100);
  const totalAmount = parseFloat(form.amount || '0') + vatAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyId || !form.quoteNumber || !form.amount) return;

    addQuote({
      quoteNumber: form.quoteNumber,
      companyId: form.companyId,
      issueDate: form.issueDate,
      expiryDate: form.expiryDate,
      amount: parseFloat(form.amount),
      vatAmount,
      totalAmount,
      status: form.status,
      description: form.description,
      notes: form.notes,
    });
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau devis</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {!companyId && (
            <div>
              <Label>Entreprise *</Label>
              <Select value={form.companyId} onValueChange={v => set('companyId', v)} required>
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
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>N° de devis *</Label>
              <Input
                value={form.quoteNumber}
                onChange={e => set('quoteNumber', e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="sent">Envoyé</SelectItem>
                  <SelectItem value="accepted">Accepté</SelectItem>
                  <SelectItem value="rejected">Refusé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date d'émission</Label>
              <Input
                type="date"
                value={form.issueDate}
                onChange={e => set('issueDate', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Date de validité</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={e => set('expiryDate', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Montant HT *</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={e => set('amount', e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label>Taux TVA (%)</Label>
              <Select value={form.vatRate} onValueChange={v => set('vatRate', v)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0% (exonéré)</SelectItem>
                  <SelectItem value="9">9%</SelectItem>
                  <SelectItem value="19">19%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Totals preview */}
          {form.amount && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Montant HT</span>
                <span>{formatCurrency(parseFloat(form.amount))}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>TVA {form.vatRate}%</span>
                <span>{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-1">
                <span>Total TTC</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          )}

          <div>
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="ex: Prestation de service - Mai 2024"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Notes internes</Label>
            <Textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Créer le devis
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
