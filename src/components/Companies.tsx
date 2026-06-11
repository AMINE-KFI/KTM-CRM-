import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { Company } from '@/types';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Plus, Search, Users, FileText, Phone, Mail, MapPin, ChevronRight, Upload, Download, FileSpreadsheet, Filter } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import CompanyForm from './CompanyForm';
import CompanyDetail from './CompanyDetail';
import ErrorBoundary from './ErrorBoundary';
import { exportCompaniesToExcel, parseCompaniesExcel, downloadCompanyTemplate } from '@/lib/excel';
import { exportCompaniesToPDF } from '@/lib/pdf';
import { useRef } from 'react';

export default function Companies({ role = 'client' }: { role?: 'client' | 'supplier' }) {
  const { data, addCompany } = useCRM();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const importedCompanies = await parseCompaniesExcel(file);
      if (importedCompanies.length === 0) {
        alert("Aucun client trouvé dans le fichier.");
        return;
      }
      if (confirm(`Vous allez importer ${importedCompanies.length} clients. Continuer ?`)) {
        importedCompanies.forEach(comp => addCompany(comp as any));
        alert('Importation réussie !');
      }
    } catch (err) {
      alert("Erreur lors de la lecture du fichier Excel.");
      console.error(err);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filtered = data.companies.filter(c => {
    const isRoleMatch = role === 'supplier' 
      ? (c.role === 'supplier' || c.role === 'both') 
      : (c.role === 'client' || !c.role || c.role === 'both');
    
    if (!isRoleMatch) return false;

    return c.name.toLowerCase().includes(search.toLowerCase()) ||
           (c.city && c.city.toLowerCase().includes(search.toLowerCase())) ||
           (c.rc && c.rc.includes(search)) ||
           (c.nif && c.nif.includes(search));
  });

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
          <h1 className="text-2xl font-bold text-gray-900">{role === 'supplier' ? 'Fournisseurs' : 'Entreprises Clientes'}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{filtered.length} {role === 'supplier' ? 'fournisseur(s)' : 'client(s)'} enregistré(s)</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImportExcel}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Actions <ChevronRight className="w-4 h-4 rotate-90" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2 text-blue-600" />
                Importer Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadCompanyTemplate} className="cursor-pointer">
                <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                Modèle d'importation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportCompaniesToExcel(data.companies)} className="cursor-pointer">
                <Download className="w-4 h-4 mr-2 text-green-600" />
                Exporter Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCompaniesToPDF(data.companies)} className="cursor-pointer">
                <FileText className="w-4 h-4 mr-2 text-red-600" />
                Exporter PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            onClick={() => { setEditCompany(null); setShowForm(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Plus className="w-4 h-4" />
            {role === 'supplier' ? 'Nouveau fournisseur' : 'Nouvelle entreprise'}
          </Button>
        </div>
      </div>

      <Card className="border border-gray-200/60 shadow-sm overflow-hidden bg-gray-50/20">
        {/* Search & Filters */}
        <div className="p-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 mr-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Filtres</span>
          </div>
          
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par nom, ville, SIRET..."
              className="pl-9 bg-white border-gray-200"
            />
          </div>
        </div>

        {/* Companies List */}
        <div className="p-4 md:p-6">
          {filtered.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 font-medium">Aucun {role === 'supplier' ? 'fournisseur' : 'client'} trouvé</p>
              <p className="text-gray-300 text-sm mt-1">Créez votre premier enregistrement</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setEditCompany(null); setShowForm(true); }}
              >
                <Plus className="w-4 h-4 mr-2" /> Ajouter un {role === 'supplier' ? 'fournisseur' : 'client'}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(company => {
            const invoices = (data.documents || []).filter(inv => inv.type === 'invoice' && inv.companyId === company.id);
            const unpaid = invoices.filter(inv => inv.status !== 'paid').length;
            
            return (
              <Card
                key={company.id}
                className="border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group bg-white rounded-2xl"
                onClick={() => setSelectedCompanyId(company.id)}
              >
                <CardContent className="p-5 flex flex-col h-full">
                  <div className="flex items-start gap-3">
                    {/* Logo placeholder */}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl flex-shrink-0">
                      {(company.name || 'I').charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 truncate" title={company.name}>{company.name}</h3>
                        {company.legalForm && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded font-medium">{company.legalForm}</span>}
                      </div>
                      {unpaid > 0 && role === 'client' && (
                        <span className="inline-block mt-1 text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                          {unpaid} impayée{unpaid > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 mt-4 flex-1">
                    {company.rc && (
                      <span className="text-xs text-gray-500 flex items-center gap-2">
                        <span className="w-4 h-4 rounded bg-gray-50 flex items-center justify-center text-gray-400 font-bold text-[8px]">RC</span>
                        <span className="truncate">{company.rc}</span>
                      </span>
                    )}
                    {company.city && (
                      <span className="text-xs text-gray-500 flex items-center gap-2 truncate">
                        <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{company.city}{company.postalCode ? `, ${company.postalCode}` : ''}</span>
                      </span>
                    )}
                    {company.phone && (
                      <span className="text-xs text-gray-500 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{company.phone}</span>
                      </span>
                    )}
                    {company.email && (
                      <span className="text-xs text-gray-500 flex items-center gap-2 truncate">
                        <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{company.email}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-50">
                    <div className="flex gap-6">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900 leading-none">{(company.contacts || []).length}</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Contacts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900 leading-none">{invoices.length}</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Factures</p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </div>
      </Card>

      {showForm && (
        <ErrorBoundary>
          <CompanyForm
            company={editCompany || undefined}
            defaultRole={role}
            onClose={() => {
              setShowForm(false);
              setEditCompany(null);
            }}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
