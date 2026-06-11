import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { Contact, ContactDepartment } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">{title}</h3>
      {children}
    </div>
  );
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEdit ? 'Modifier le contact' : 'Nouveau contact professionnel'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          
          <Section title="Identité">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Prénom *</label>
                <Input
                  value={form.firstName}
                  onChange={e => set('firstName', e.target.value)}
                  required
                  placeholder="Ex: Jean"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Nom *</label>
                <Input
                  value={form.lastName}
                  onChange={e => set('lastName', e.target.value)}
                  required
                  placeholder="Ex: DUPONT"
                  className="mt-1"
                />
              </div>
            </div>
          </Section>

          <Section title="Rôle & Fonction">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Service / Département</label>
                <select
                  value={form.department}
                  onChange={e => set('department', e.target.value)}
                  className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white mt-1 text-sm"
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d.value} value={d.value}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Poste exact</label>
                <Input
                  value={form.position}
                  onChange={e => set('position', e.target.value)}
                  placeholder="Ex: Directeur Commercial"
                  className="mt-1"
                />
              </div>
            </div>
          </Section>

          <Section title="Coordonnées">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email professionnel</label>
                <Input
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  type="email"
                  placeholder="jean.dupont@entreprise.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Téléphone mobile</label>
                <Input
                  value={form.mobile}
                  onChange={e => set('mobile', e.target.value)}
                  placeholder="Ex: 06 12 34 56 78"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Ligne directe / Fixe</label>
                <Input
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="Ex: 01 23 45 67 89"
                  className="mt-1"
                />
              </div>
            </div>
          </Section>

          <Section title="Informations complémentaires">
            <div>
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Notes internes</label>
              <Textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Ajoutez ici vos remarques, horaires de disponibilité, ou informations utiles sur ce contact..."
                rows={3}
                className="mt-1 resize-none"
              />
            </div>
          </Section>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              {isEdit ? 'Mettre à jour' : 'Ajouter le contact'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
