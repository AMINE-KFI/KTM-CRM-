import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency } from '@/lib/storage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { InvoiceStatus } from '@/types';

interface InvoiceFormProps {
  companyId?: string;
  onClose: () => void;
}

export default function InvoiceForm({ companyId, onClose }: InvoiceFormProps) {
  const { addInvoice, data } = useCRM();

  const [form, setForm] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    return {
      companyId: companyId || '',
      invoiceNumber: `FAC-${new Date().getFullYear()}-${String(data.invoices.length + 1).padStart(3, '0')}`,
      issueDate: today,
      dueDate: in30,
      amount: '',
      vatRate: '20',
      description: '',
      status: 'unpaid' as InvoiceStatus,
      notes: '',
    };
  });

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const vatAmount = parseFloat(form.amount || '0') * (parseFloat(form.vatRate) / 100);
  const totalAmount = parseFloat(form.amount || '0') + vatAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyId || !form.invoiceNumber || !form.amount) return;

    addInvoice({
      invoiceNumber: form.invoiceNumber,
      companyId: form.companyId,
      issueDate: form.issueDate,
      dueDate: form.dueDate,
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
          <DialogTitle>Nouvelle facture</DialogTitle>
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
              <Label>N° de facture *</Label>
              <Input
                value={form.invoiceNumber}
                onChange={e => set('invoiceNumber', e.target.value)}
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
                  <SelectItem value="unpaid">Non payée</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="paid">Payée</SelectItem>
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
              <Label>Date d'échéance</Label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={e => set('dueDate', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Montant HT (€) *</Label>
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
                  <SelectItem value="5.5">5.5%</SelectItem>
                  <SelectItem value="10">10%</SelectItem>
                  <SelectItem value="20">20%</SelectItem>
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
              Créer la facture
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
