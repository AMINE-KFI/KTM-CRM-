import { useMemo, useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Target, Users, X } from 'lucide-react';
import type { DealStage, Deal, Employee } from '@/types';

import DealForm from './DealForm';

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: 'lead', label: 'Piste', color: 'bg-gray-100 border-gray-200' },
  { id: 'proposal', label: 'Proposition envoyée', color: 'bg-blue-50 border-blue-100' },
  { id: 'negotiation', label: 'En négociation', color: 'bg-amber-50 border-amber-100' },
  { id: 'won', label: 'Gagné', color: 'bg-green-50 border-green-100' },
  { id: 'lost', label: 'Perdu', color: 'bg-red-50 border-red-100' }
];

export default function Pipeline() {
  const { data, updateDeal, currentUser, addActivityLog } = useCRM();
  const [managingDeal, setManagingDeal] = useState<Deal | null>(null);
  const [showDealForm, setShowDealForm] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  const dealsByStage = useMemo(() => {
    const grouped = {
      lead: [], proposal: [], negotiation: [], won: [], lost: []
    } as Record<DealStage, any[]>;

    (data.deals || []).forEach(deal => {
      // Access Control
      if (!isAdmin) {
        if (!deal.assigneeIds?.includes(currentUser?.id || '')) {
          return; // Skip if not assigned and not admin
        }
      }

      const company = data.companies.find(c => c.id === deal.companyId);
      grouped[deal.stage].push({ ...deal, company });
    });

    return grouped;
  }, [data, currentUser, isAdmin]);

  const handleAddDeal = () => {
    setShowDealForm(true);
  };

  const moveDeal = (dealId: string, newStage: DealStage) => {
    updateDeal(dealId, { stage: newStage });
    if (currentUser) {
      const deal = data.deals.find(d => d.id === dealId);
      const stageObj = STAGES.find(s => s.id === newStage);
      if (deal && stageObj) {
        addActivityLog({
          type: 'deal_moved',
          title: 'Opportunité déplacée',
          description: `a déplacé "${deal.title}" vers "${stageObj.label}"`,
          userId: currentUser.id
        });
      }
    }
  };

  return (
    <div className="space-y-5 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 text-sm mt-0.5">Vos opportunités en cours</p>
        </div>
        {isAdmin && (
          <Button onClick={handleAddDeal} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Nouvelle opportunité
          </Button>
        )}
      </div>

      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
        {STAGES.map(stage => (
          <div key={stage.id} className={`w-80 flex-shrink-0 flex flex-col rounded-xl border snap-center ${stage.color}`}>
            <div className="p-3 border-b border-black/5 flex items-center justify-between bg-white/50 rounded-t-xl">
              <h3 className="font-semibold text-gray-800 text-sm">{stage.label}</h3>
              <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-gray-500 shadow-sm">
                {dealsByStage[stage.id].length}
              </span>
            </div>
            
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {dealsByStage[stage.id].map(deal => (
                <Card key={deal.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-semibold text-gray-900 text-sm">{deal.title}</h4>
                      {isAdmin && (
                        <button onClick={() => setManagingDeal(deal)} className="text-gray-400 hover:text-blue-600" title="Gérer l'équipe">
                          <Users className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{deal.company?.name || 'Inconnu'}</p>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-bold text-blue-600 text-sm">{formatCurrency(deal.value)}</span>
                      
                      <select 
                        className="text-[10px] bg-gray-50 border border-gray-200 rounded p-1"
                        value={deal.stage}
                        onChange={(e) => moveDeal(deal.id, e.target.value as DealStage)}
                      >
                        {STAGES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {(deal.assigneeIds?.length > 0) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {deal.assigneeIds.map((id: string) => {
                          const emp = data.employees?.find(e => e.id === id);
                          if (!emp) return null;
                          return (
                            <div key={id} className="w-6 h-6 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[10px] font-bold text-blue-700" title={`${emp.firstName} ${emp.lastName}`}>
                              {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {dealsByStage[stage.id].length === 0 && (
                <div className="text-center py-6">
                  <Target className="w-8 h-8 text-black/10 mx-auto mb-2" />
                  <p className="text-xs text-black/40 font-medium">Vide</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {managingDeal && (
        <AssigneesModal 
          deal={managingDeal} 
          employees={data.employees || []} 
          onClose={() => setManagingDeal(null)} 
          onSave={(ids) => {
            updateDeal(managingDeal.id, { assigneeIds: ids });
            setManagingDeal(null);
          }}
        />
      )}

      {showDealForm && (
        <DealForm 
          deal={editDeal || undefined} 
          onClose={() => { setShowDealForm(false); setEditDeal(null); }} 
        />
      )}
    </div>
  );
}

function AssigneesModal({ deal, employees, onClose, onSave }: { deal: Deal, employees: Employee[], onClose: () => void, onSave: (ids: string[]) => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(deal.assigneeIds || []);

  const toggleEmp = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Équipe du projet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {employees.filter(e => e.role !== 'admin').map(emp => (
            <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input 
                type="checkbox" 
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                checked={selectedIds.includes(emp.id)}
                onChange={() => toggleEmp(emp.id)}
              />
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
              </div>
              <span className="text-sm font-medium text-gray-900">{emp.firstName} {emp.lastName}</span>
            </label>
          ))}
          {employees.filter(e => e.role !== 'admin').length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Aucun employé disponible.</p>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 flex justify-end">
          <Button onClick={() => onSave(selectedIds)} className="bg-blue-600 text-white">Enregistrer</Button>
        </div>
      </div>
    </div>
  );
}
