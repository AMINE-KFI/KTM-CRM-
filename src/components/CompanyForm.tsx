import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { Company } from '@/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CompanyFormProps {
  company?: Company;
  defaultRole?: 'client' | 'supplier' | 'both';
  onClose: () => void;
}

const LEGAL_FORMS = ['SARL', 'EURL', 'SPA', 'SNC', 'SCS', 'Auto-entrepreneur', 'Autre'];

export default function CompanyForm({ company, defaultRole = 'client', onClose }: CompanyFormProps) {
  const { addCompany, updateCompany } = useCRM();
  const isEdit = !!company;

  const [form, setForm] = useState({
    name: company?.name || '',
    role: company?.role || defaultRole,
    legalForm: company?.legalForm || 'SARL',
    nif: company?.nif || '',
    nis: company?.nis || '',
    rc: company?.rc || '',
    art: company?.art || '',
    capital: company?.capital || '',
    fiscalYear: company?.fiscalYear || '',
    address: company?.address || '',
    city: company?.city || '',
    postalCode: company?.postalCode || '',
    country: company?.country || 'France',
    email: company?.email || '',
    phone: company?.phone || '',
    website: company?.website || '',
    notes: company?.notes || '',
  });

  const set = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (isEdit) {
      updateCompany(company!.id, form);
    } else {
      addCompany(form);
    }
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">
            {isEdit ? 'Modifier l\'entreprise' : 'Nouvelle entreprise cliente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
          {/* Informations générales */}
          <Section title="Informations générales">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Raison sociale *</label>
                <Input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="NOM DE L'ENTREPRISE"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Forme juridique</label>
                <select
                  value={form.legalForm}
                  onChange={e => set('legalForm', e.target.value)}
                  className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white mt-1 text-sm"
                >
                  <option value="">Sélectionner...</option>
                  {['SARL', 'EURL', 'SPA', 'SNC', 'SCS', 'Indépendant', 'Autre'].map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Capital social</label>
                <Input
                  value={form.capital}
                  onChange={e => set('capital', e.target.value)}
                  placeholder="ex: 10 000 €"
                  className="mt-1"
                />
              </div>
            </div>
          </Section>

          {/* Informations fiscales */}
          <Section title="Coordonnées fiscales">
            <div className="grid grid-cols-2 gap-4">
              <div>
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Numéro d'Identification Fiscale (NIF)</label>
                <Input
                  value={form.nif}
                  onChange={e => set('nif', e.target.value)}
                  placeholder="000012345678900"
                  className="mt-1"
                />
              </div>
              <div>
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Numéro d'Identification Statistique (NIS)</label>
                <Input
                  value={form.nis}
                  onChange={e => set('nis', e.target.value)}
                  placeholder="123456789012345"
                  className="mt-1"
                />
              </div>
              <div>
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Registre de Commerce (RC)</label>
                <Input
                  value={form.rc}
                  onChange={e => set('rc', e.target.value)}
                  placeholder="12/00-0123456 B 20"
                  className="mt-1"
                />
              </div>
              <div>
                            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Article d'Imposition (ART)</label>
                <Input
                  value={form.art}
                  onChange={e => set('art', e.target.value)}
                  placeholder="1201234567"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium leading-none">Exercice fiscal</label>
                <Input
                  value={form.fiscalYear}
                  onChange={e => set('fiscalYear', e.target.value)}
                  placeholder="01/01 - 31/12"
                  className="mt-1"
                />
              </div>
            </div>
          </Section>

          {/* Adresse */}
          <Section title="Adresse">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-sm font-medium leading-none">Adresse</label>
                <Input
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="Numéro et nom de rue"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium leading-none">Code postal</label>
                <Input
                  value={form.postalCode}
                  onChange={e => set('postalCode', e.target.value)}
                  placeholder="75001"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium leading-none">Wilaya / Ville</label>
                <Input
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Alger"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium leading-none">Pays</label>
                <Input
                  value={form.country}
                  onChange={e => set('country', e.target.value)}
                  placeholder="Algérie"
                  className="mt-1"
                />
              </div>
            </div>
          </Section>

          {/* Contact */}
          <Section title="Contact entreprise">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium leading-none">Email</label>
                <Input
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  type="email"
                  placeholder="contact@entreprise.fr"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium leading-none">Téléphone</label>
                <Input
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="01 23 45 67 89"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium leading-none">Site web</label>
                <Input
                  value={form.website}
                  onChange={e => set('website', e.target.value)}
                  placeholder="www.entreprise.fr"
                  className="mt-1"
                />
              </div>
            </div>
          </Section>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium leading-none">Notes internes</label>
            <Textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Informations complémentaires..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
              {isEdit ? 'Enregistrer' : 'Créer l\'entreprise'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      {children}
    </div>
  );
}
