import { useState, useMemo } from 'react';
import { useCRM } from '@/context/CRMContext';
import { formatCurrency, formatDate, generateId } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Trash2, Edit, CreditCard, Filter, TrendingDown, ArrowUpDown } from 'lucide-react';
import type { Expense } from '@/types';

export default function Expenses() {
  const { data, addExpense, updateExpense, deleteExpense } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Expense; direction: 'asc' | 'desc' } | null>({ key: 'date', direction: 'desc' });
  
  const [formData, setFormData] = useState<Partial<Expense>>({
    date: new Date().toISOString().split('T')[0],
    category: 'fournitures',
    description: '',
    amount: 0,
    paymentMethod: 'virement'
  });

  const categories = [
    { value: 'fournitures', label: 'Fournitures de bureau' },
    { value: 'loyer', label: 'Loyer' },
    { value: 'electricite', label: 'Électricité / Eau' },
    { value: 'internet', label: 'Internet / Téléphone' },
    { value: 'transport', label: 'Transport / Carburant' },
    { value: 'salaire', label: 'Salaires' },
    { value: 'marketing', label: 'Marketing / Publicité' },
    { value: 'autre', label: 'Autres charges' }
  ];

  const expenses = data.expenses || [];

  const filteredExpenses = useMemo(() => {
    const filtered = expenses.filter(exp => {
      const searchMatch = exp.description.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = filterCategory === 'all' || exp.category === filterCategory;
      return searchMatch && categoryMatch;
    });

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    return filtered;
  }, [expenses, searchTerm, filterCategory, sortConfig]);

  const toggleSort = (key: keyof Expense) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.date || !formData.amount || !formData.description) return;

    if (editingExpense) {
      updateExpense(editingExpense.id, {
        ...editingExpense,
        ...formData
      });
    } else {
      addExpense({
        ...formData,
        id: generateId(),
        date: formData.date,
        amount: Number(formData.amount),
        description: formData.description,
        category: formData.category || 'autre',
        paymentMethod: formData.paymentMethod || 'especes',
        createdAt: new Date().toISOString(),
      } as Expense);
    }

    setShowForm(false);
    setEditingExpense(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      category: 'fournitures',
      description: '',
      amount: 0,
      paymentMethod: 'virement'
    });
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      paymentMethod: expense.paymentMethod,
      reference: expense.reference || ''
    });
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer cette dépense ?')) {
      deleteExpense(id);
    }
  };

  if (showForm) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-xl font-bold mb-6">
          {editingExpense ? 'Modifier la dépense' : 'Nouvelle dépense'}
        </h2>
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date *</Label>
              <Input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="mt-1" />
            </div>
            <div>
              <Label>Catégorie *</Label>
              <Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label>Description *</Label>
            <Textarea required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="mt-1" placeholder="ex: Facture Sonelgaz Mars 2026" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Montant *</Label>
              <Input type="number" step="0.01" required min="0" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value)})} className="mt-1" />
            </div>
            <div>
              <Label>Méthode de paiement</Label>
              <Select value={formData.paymentMethod} onValueChange={v => setFormData({...formData, paymentMethod: v as any})}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="virement">Virement Bancaire</SelectItem>
                  <SelectItem value="cheque">Chèque</SelectItem>
                  <SelectItem value="especes">Espèces</SelectItem>
                  <SelectItem value="carte">Carte Bancaire</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Référence / N° Pièce jointe (Optionnel)</Label>
            <Input type="text" value={formData.reference || ''} onChange={e => setFormData({...formData, reference: e.target.value})} className="mt-1" />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Enregistrer</Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dépenses Générales</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filteredExpenses.length} dépense(s)</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-red-600 hover:bg-red-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Ajouter une dépense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-red-100 shadow-sm bg-gradient-to-br from-red-50 to-orange-50 overflow-hidden rounded-2xl relative md:col-span-1">
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none scale-150">
            <TrendingDown className="w-24 h-24 text-red-900" />
          </div>
          <CardContent className="p-5 sm:p-6 relative z-10">
            <div className="flex flex-col gap-1">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Total Dépenses</p>
              <p className="text-2xl sm:text-4xl font-bold text-red-900 mt-1 truncate">{formatCurrency(totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-3 justify-between items-center bg-gray-50/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 w-[250px] bg-white border-gray-200"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-16">
              <CreditCard className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucune dépense trouvée</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/50 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-4 py-4 whitespace-nowrap cursor-pointer hover:text-gray-900 group" onClick={() => toggleSort('date')}>
                    <div className="flex items-center gap-2">Date <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /></div>
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-gray-900 group" onClick={() => toggleSort('description')}>
                    <div className="flex items-center gap-2">Description <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /></div>
                  </th>
                  <th className="px-4 py-4 cursor-pointer hover:text-gray-900 group" onClick={() => toggleSort('category')}>
                    <div className="flex items-center gap-2">Catégorie <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /></div>
                  </th>
                  <th className="px-4 py-4 text-right cursor-pointer hover:text-gray-900 group" onClick={() => toggleSort('amount')}>
                    <div className="flex items-center justify-end gap-2"><ArrowUpDown className="w-3.5 h-3.5 opacity-50" /> Montant</div>
                  </th>
                  <th className="px-4 py-4 text-center cursor-pointer hover:text-gray-900 group" onClick={() => toggleSort('paymentMethod')}>
                    <div className="flex items-center justify-center gap-2">Méthode <ArrowUpDown className="w-3.5 h-3.5 opacity-50" /></div>
                  </th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredExpenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 font-medium text-gray-900 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td className="px-4 py-4 text-gray-800">
                      {exp.description}
                      {exp.reference && <span className="block text-xs text-gray-400">Réf: {exp.reference}</span>}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-[11px] font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {categories.find(c => c.value === exp.category)?.label || exp.category}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="font-bold text-gray-900">{formatCurrency(exp.amount)}</div>
                    </td>
                    <td className="px-4 py-4 text-center text-gray-500 uppercase text-xs">
                      {exp.paymentMethod}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(exp)} className="text-gray-400 hover:text-blue-600 h-8 w-8 p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(exp.id)} className="text-gray-400 hover:text-red-600 h-8 w-8 p-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
