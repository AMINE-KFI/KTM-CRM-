import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import type { DealStage, Deal } from '@/types';

interface DealFormProps {
  onClose: () => void;
  defaultCompanyId?: string;
  defaultStage?: DealStage;
  deal?: Deal;
}

export default function DealForm({ onClose, defaultCompanyId, defaultStage = 'lead', deal }: DealFormProps) {
  const { data, addDeal, updateDeal, currentUser } = useCRM();
  
  const [title, setTitle] = useState(deal?.title || '');
  const [companyId, setCompanyId] = useState(deal?.companyId || defaultCompanyId || (data.companies[0]?.id || ''));
  const [value, setValue] = useState(deal?.value ? deal.value.toString() : '');
  const [expectedCloseDate, setExpectedCloseDate] = useState(deal?.expectedCloseDate || '');
  const [notes, setNotes] = useState(deal?.notes || '');
  const [contactIds, setContactIds] = useState<string[]>(deal?.contactIds || []);
  const [stage, setStage] = useState<DealStage>(deal?.stage || defaultStage);
  
  const isAdmin = currentUser?.role === 'admin';

  const selectedCompany = data.companies.find(c => c.id === companyId);
  const companyContacts = selectedCompany?.contacts || [];

  const handleContactToggle = (id: string) => {
    setContactIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyId) {
      alert("Veuillez sélectionner une entreprise");
      return;
    }

    const payload = {
      title,
      companyId,
      value: parseFloat(value || '0'),
      stage,
      expectedCloseDate: expectedCloseDate || undefined,
      notes: notes || undefined,
      contactIds,
      assigneeIds: deal ? deal.assigneeIds : (isAdmin ? [] : [currentUser!.id])
    };

    if (deal) {
      updateDeal(deal.id, payload);
    } else {
      addDeal(payload as Deal);
    }
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">{deal ? 'Modifier l\'opportunité' : 'Nouvelle Opportunité'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Entreprise *</Label>
              <select
                required
                value={companyId}
                onChange={e => {
                  setCompanyId(e.target.value);
                  setContactIds([]); // Reset contacts when company changes
                }}
                className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white"
              >
                <option value="">Sélectionner une entreprise</option>
                {data.companies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Nom du dossier (Titre) *</Label>
              <Input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Projet Refonte Web"
              />
            </div>

            <div className="space-y-2">
              <Label>Valeur estimée (DZD)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Phase du dossier</Label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value as DealStage)}
                className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white"
              >
                <option value="lead">Piste</option>
                <option value="proposal">Proposition envoyée</option>
                <option value="negotiation">En négociation</option>
                <option value="won">Gagné</option>
                <option value="lost">Perdu</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Date de clôture estimée</Label>
              <Input
                type="date"
                value={expectedCloseDate}
                onChange={e => setExpectedCloseDate(e.target.value)}
              />
            </div>
          </div>

          {companyId && companyContacts.length > 0 && (
            <div className="space-y-2">
              <Label>Contacts impliqués</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {companyContacts.map(contact => (
                  <label key={contact.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={contactIds.includes(contact.id)}
                      onChange={() => handleContactToggle(contact.id)}
                    />
                    <div>
                      <div className="font-medium text-sm text-gray-900">{contact.firstName} {contact.lastName}</div>
                      <div className="text-xs text-gray-500">{contact.position}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes & Informations ("Tout ce que je dois savoir")</Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
              placeholder="Détails du projet, prochaines étapes, contexte du client..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
              Créer l'opportunité
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
