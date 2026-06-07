import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { Company } from '@/types';
import { formatDate, getDepartmentLabel } from '@/lib/storage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Building2, Plus, Search, Users, FileText, Phone, Mail, Globe, MapPin, ChevronRight } from 'lucide-react';
import CompanyForm from './CompanyForm';
import CompanyDetail from './CompanyDetail';

export default function Companies() {
  const { data } = useCRM();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [editCompany, setEditCompany] = useState<Company | null>(null);

  const filtered = data.companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city.toLowerCase().includes(search.toLowerCase()) ||
    (c.siret && c.siret.includes(search))
  );

  if (selectedCompanyId) {
    return (
      <CompanyDetail
        companyId={selectedCompanyId}
        onBack={() => setSelectedCompanyId(null)}
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entreprises</h1>
          <p className="text-gray-500 text-sm mt-0.5">{data.companies.length} client{data.companies.length > 1 ? 's' : ''} enregistré{data.companies.length > 1 ? 's' : ''}</p>
        </div>
        <Button
          onClick={() => { setEditCompany(null); setShowForm(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle entreprise
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, ville, SIRET..."
          className="pl-9 bg-white border-gray-200"
        />
      </div>

      {/* Companies List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Aucune entreprise trouvée</p>
          <p className="text-gray-300 text-sm mt-1">Créez votre première entreprise cliente</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => { setEditCompany(null); setShowForm(true); }}
          >
            <Plus className="w-4 h-4 mr-2" /> Ajouter une entreprise
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(company => {
            const invoices = data.invoices.filter(inv => inv.companyId === company.id);
            const unpaid = invoices.filter(inv => inv.status !== 'paid').length;
            
            return (
              <Card
                key={company.id}
                className="border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
                onClick={() => setSelectedCompanyId(company.id)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 w-full min-w-0">
                      {/* Logo placeholder */}
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {company.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">{company.legalForm}</span>
                          {unpaid > 0 && (
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                              {unpaid} impayée{unpaid > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                          {company.siret && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              SIRET: {company.siret}
                            </span>
                          )}
                          {company.city && (
                            <span className="text-xs text-gray-500 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {company.city}, {company.postalCode}
                            </span>
                          )}
                          {company.phone && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3 flex-shrink-0" />
                              {company.phone}
                            </span>
                          )}
                          {company.email && (
                            <span className="text-xs text-gray-500 flex items-center gap-1 truncate">
                              <Mail className="w-3 h-3 flex-shrink-0" />
                              {company.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-4 border-t border-gray-100 sm:border-0 pt-3 sm:pt-0">
                      <div className="flex gap-4 text-center">
                        <div>
                          <p className="text-lg font-bold text-gray-900">{company.contacts.length}</p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-0.5"><Users className="w-3 h-3" /> Contacts</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-gray-900">{invoices.length}</p>
                          <p className="text-[10px] text-gray-400 flex items-center gap-0.5"><FileText className="w-3 h-3" /> Factures</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-400 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      {showForm && (
        <CompanyForm
          company={editCompany || undefined}
          onClose={() => { setShowForm(false); setEditCompany(null); }}
        />
      )}
    </div>
  );
}
