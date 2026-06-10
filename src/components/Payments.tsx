import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency } from '@/lib/storage';
import { CreditCard, TrendingUp, TrendingDown, Clock, Download, FileText, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
export default function Payments() {
  const { data, getCompany, getClientSituation } = useCRM();
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Compute global situation per company
  const situations = data.companies.map(company => {
    const sit = getClientSituation(company.id);
    return {
      company,
      ...sit
    };
  }).filter(s => {
    const matchSearch = (s.company?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    
    if (filter === 'unpaid') return s.balanceDue > 0;
    if (filter === 'paid') return s.totalPaid > 0 && s.balanceDue <= 0;
    return s.totalInvoiced > 0 || s.totalPaid > 0;
  });

  const globalInvoiced = situations.reduce((sum, s) => sum + s.totalInvoiced, 0);
  const globalPaid = situations.reduce((sum, s) => sum + s.totalPaid, 0);
  const globalDue = situations.reduce((sum, s) => sum + s.balanceDue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Créances & Paiements</h1>
          <p className="text-gray-500 text-sm mt-0.5">Suivi de la situation financière globale</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-gray-100 shadow-sm bg-blue-50/50">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Facturé</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(globalInvoiced)}</p>
              </div>
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-gray-100 shadow-sm bg-green-50/50">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Encaissé</p>
                <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(globalPaid)}</p>
              </div>
              <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-100 shadow-sm bg-red-50/50">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Créances (Reste à payer)</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(globalDue)}</p>
              </div>
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex gap-2">
            <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Toutes les situations</button>
            <button onClick={() => setFilter('unpaid')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'unpaid' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Avec créances</button>
            <button onClick={() => setFilter('paid')} className={`px-4 py-2 rounded-lg text-sm font-medium ${filter === 'paid' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Soldées</button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Rechercher un client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3 font-medium">Entreprise / Client</th>
                <th className="px-6 py-3 font-medium text-right">Facturé</th>
                <th className="px-6 py-3 font-medium text-right">Payé</th>
                <th className="px-6 py-3 font-medium text-right">Reste à Payer</th>
                <th className="px-6 py-3 font-medium text-center">Statut</th>
              </tr>
            </thead>
            <tbody>
              {situations.map((sit) => (
                <tr key={sit.company.id} className="bg-white border-b hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-gray-500">
                        {(sit.company?.name || 'I').charAt(0)}
                      </div>
                      {sit.company?.name || 'Inconnu'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">{formatCurrency(sit.totalInvoiced)}</td>
                  <td className="px-6 py-4 text-right text-green-600 font-medium">{formatCurrency(sit.totalPaid)}</td>
                  <td className="px-6 py-4 text-right font-bold text-red-600">{formatCurrency(sit.balanceDue)}</td>
                  <td className="px-6 py-4 text-center">
                    {sit.balanceDue > 0 ? (
                      <span className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium">Impayé</span>
                    ) : (
                      <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium">Soldé</span>
                    )}
                  </td>
                </tr>
              ))}
              {situations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                    Aucune donnée financière correspondante.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
