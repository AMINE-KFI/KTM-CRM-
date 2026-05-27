import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { Contact, ContactDepartment } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const DEPARTMENTS: { value: ContactDepartment; label: string }[] = [
  { value: 'approvisionnement', label: 'Approvisionnement / Achats' },
  { value: 'comptabilite', label: 'Comptabilité / Finance' },
  { value: 'direction', label: 'Direction Générale' },
  { value: 'commercial', label: 'Commercial / Ventes' },
  { value: 'technique', label: 'Technique / IT' },
  { value: 'autre', label: 'Autre' },
];

interface ContactFormProps {
  contact?: Contact;
  companyId: string;
  onClose: () => void;
}

export default function ContactForm({ contact, companyId, onClose }: ContactFormProps) {
  const { addContact, updateContact } = useCRM();
  const isEdit = !!contact;

  const [form, setForm] = useState({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    mobile: contact?.mobile || '',
    position: contact?.position || '',
    department: contact?.department || 'approvisionnement' as ContactDepartment,
    notes: contact?.notes || '',
  });

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) return;

    if (isEdit) {
      updateContact(contact!.id, form);
    } else {
      addContact({ ...form, companyId });
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le contact' : 'Nouveau contact'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prénom *</Label>
              <Input
                value={form.firstName}
                onChange={e => set('firstName', e.target.value)}
                required
                placeholder="Prénom"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Nom *</Label>
              <Input
                value={form.lastName}
                onChange={e => set('lastName', e.target.value)}
                required
                placeholder="NOM"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Service / Département</Label>
            <Select value={form.department} onValueChange={v => set('department', v)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Poste / Fonction</Label>
            <Input
              value={form.position}
              onChange={e => set('position', e.target.value)}
              placeholder="ex: Responsable Achats"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={e => set('email', e.target.value)}
                type="email"
                placeholder="nom@entreprise.fr"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Téléphone fixe</Label>
              <Input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="01 23 45 67 89"
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label>Mobile</Label>
            <Input
              value={form.mobile}
              onChange={e => set('mobile', e.target.value)}
              placeholder="06 12 34 56 78"
              className="mt-1"
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Informations complémentaires sur ce contact..."
              rows={2}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              {isEdit ? 'Enregistrer' : 'Ajouter le contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
