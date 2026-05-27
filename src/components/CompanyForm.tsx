import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { Company } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { X } from 'lucide-react';

interface CompanyFormProps {
  company?: Company;
  onClose: () => void;
}

const LEGAL_FORMS = ['SAS', 'SARL', 'SA', 'EURL', 'SNC', 'SCI', 'Auto-entrepreneur', 'Autre'];

export default function CompanyForm({ company, onClose }: CompanyFormProps) {
  const { addCompany, updateCompany } = useCRM();
  const isEdit = !!company;

  const [form, setForm] = useState({
    name: company?.name || '',
    legalForm: company?.legalForm || 'SARL',
    siret: company?.siret || '',
    tvaNumber: company?.tvaNumber || '',
    registrationNumber: company?.registrationNumber || '',
    nafCode: company?.nafCode || '',
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
                <Label>Raison sociale *</Label>
                <Input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="NOM DE L'ENTREPRISE"
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Forme juridique</Label>
                <Select value={form.legalForm} onValueChange={v => set('legalForm', v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_FORMS.map(f => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Capital social</Label>
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
                <Label>Numéro SIRET</Label>
                <Input
                  value={form.siret}
                  onChange={e => set('siret', e.target.value)}
                  placeholder="123 456 789 00010"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Numéro TVA intracommunautaire</Label>
                <Input
                  value={form.tvaNumber}
                  onChange={e => set('tvaNumber', e.target.value)}
                  placeholder="FR12345678900"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>RCS / Immatriculation</Label>
                <Input
                  value={form.registrationNumber}
                  onChange={e => set('registrationNumber', e.target.value)}
                  placeholder="RCS Paris B 123 456 789"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Code NAF / APE</Label>
                <Input
                  value={form.nafCode}
                  onChange={e => set('nafCode', e.target.value)}
                  placeholder="ex: 6201Z"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Exercice fiscal</Label>
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
                <Label>Adresse</Label>
                <Input
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="Numéro et nom de rue"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Code postal</Label>
                <Input
                  value={form.postalCode}
                  onChange={e => set('postalCode', e.target.value)}
                  placeholder="75001"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Ville</Label>
                <Input
                  value={form.city}
                  onChange={e => set('city', e.target.value)}
                  placeholder="Paris"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Pays</Label>
                <Input
                  value={form.country}
                  onChange={e => set('country', e.target.value)}
                  placeholder="France"
                  className="mt-1"
                />
              </div>
            </div>
          </Section>

          {/* Contact */}
          <Section title="Contact entreprise">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  type="email"
                  placeholder="contact@entreprise.fr"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="01 23 45 67 89"
                  className="mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label>Site web</Label>
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
            <Label>Notes internes</Label>
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
