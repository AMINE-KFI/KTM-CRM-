import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { Company } from '@/types';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Plus, Search, Users, FileText, Phone, Mail, MapPin, ChevronRight, Upload, Download, FileSpreadsheet } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import CompanyForm from './CompanyForm';
import CompanyDetail from './CompanyDetail';
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
                        {(company.name || 'I').charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900 truncate">{company.name}</h3>
                          {company.legalForm && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">{company.legalForm}</span>}
                          {unpaid > 0 && role === 'client' && (
                            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                              {unpaid} impayée{unpaid > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                          {company.rc && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              RC: {company.rc}
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
          defaultRole={role}
          onClose={() => { setShowForm(false); setEditCompany(null); }}
        />
      )}
    </div>
  );
}
