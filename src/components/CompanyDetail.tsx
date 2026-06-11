import { useState, useRef, useEffect } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { Contact, Deal } from '@/types';
import { formatCurrency, formatDate, getDepartmentLabel, getDaysOverdue } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Building2, Edit, Trash2, Plus, Phone, Mail, Globe,
  FileText, Users, MessageSquare, Target, Upload, Download, AlignLeft, Briefcase
} from 'lucide-react';
import CompanyForm from './CompanyForm';
import ContactForm from './ContactForm';
import DocumentBuilder from './DocumentBuilder';
import DealForm from './DealForm';
import ErrorBoundary from './ErrorBoundary';
import PaymentModal from './PaymentModal';
import { generateDocumentPDF } from '@/lib/pdf';
import { saveCompanyFile, getCompanyFiles, deleteCompanyFile } from '@/lib/fileStorage';
import type { BusinessDocument } from '@/types';

interface CompanyDetailProps {
  companyId: string;
  onBack: () => void;
}

export default function CompanyDetail({ companyId, onBack }: CompanyDetailProps) {
  const { data, getCompany, deleteCompany, getInvoicesForCompany, addNote, getClientSituation, updateDocument, deleteDocument } = useCRM();
  const company = getCompany(companyId);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [showDealForm, setShowDealForm] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | null>(null);
  const [newNote, setNewNote] = useState('');
  const [showDocBuilder, setShowDocBuilder] = useState(false);
  const [docType, setDocType] = useState<'invoice'|'proforma'|'delivery_note'|'purchase_order'>('invoice');
  const [editDocument, setEditDocument] = useState<BusinessDocument | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (companyId) {
      getCompanyFiles(companyId).then(setFiles).catch(console.error);
    }
  }, [companyId]);

  const handlePrint = (doc: BusinessDocument) => {
    const fs = data.fiscalSettings && doc.tenant ? data.fiscalSettings[doc.tenant] : undefined;
    if (company) {
      generateDocumentPDF(doc, company as any, fs);
    } else {
      alert("Erreur: Entité introuvable");
    }
  };

  const handleCancelDocument = (docId: string) => {
    if (confirm("Voulez-vous vraiment annuler ce document ? Cette action est irréversible et il restera tracé en tant qu'annulé.")) {
      updateDocument(docId, { status: 'cancelled' });
    }
  };

  const handleDeleteDocument = (docId: string) => {
    if (confirm("Supprimer définitivement ce brouillon ?")) {
      deleteDocument(docId);
    }
  };

  if (!company) return null;

  if (showDocBuilder || editDocument) {
    return (
      <DocumentBuilder 
        onClose={() => { setShowDocBuilder(false); setEditDocument(null); }} 
        defaultCompanyId={company.id} 
        defaultType={docType}
        initialData={editDocument || undefined}
      />
    );
  }

  const invoices = getInvoicesForCompany(companyId);
  const unpaidInvoices = invoices.filter(i => i.status !== 'paid');
  const totalUnpaid = unpaidInvoices.reduce((s, i) => s + i.totalAmount, 0);

  const situation = getClientSituation(companyId);
  
  const deals = (data.deals || []).filter(d => d.companyId === companyId);
  const erpDocuments = (data.documents || []).filter(d => d.companyId === companyId);
  
  const erpInvoices = erpDocuments.filter(d => d.type === 'invoice');
  const erpProformas = erpDocuments.filter(d => d.type === 'proforma');
  const erpBLs = erpDocuments.filter(d => d.type === 'delivery_note');
  
  const notes = (data.notes || []).filter(n => n.companyId === companyId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleDeleteCompany = () => {
    if (confirm(`Supprimer l'entreprise "${company.name}" et toutes ses données ?`)) {
      deleteCompany(companyId);
      onBack();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        const newFile = {
          id: crypto.randomUUID(),
          companyId,
          name: file.name,
          type: file.type,
          dataUrl,
          createdAt: new Date().toISOString()
        };
        await saveCompanyFile(newFile);
        setFiles(prev => [...prev, newFile]);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert('Erreur lors de l\'upload');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Supprimer ce fichier ?')) return;
    try {
      await deleteCompanyFile(fileId);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la suppression');
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote({ content: newNote.trim(), companyId });
    setNewNote('');
  };

  if (showDocBuilder) {
    return <DocumentBuilder 
      defaultCompanyId={companyId} 
      initialData={editDocument || undefined} 
      onClose={() => { setShowDocBuilder(false); setEditDocument(null); }} 
    />;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-500 gap-2 -ml-1 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-4 w-full sm:w-auto">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0">
            {(company.name || 'Inconnu').charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{company.name || 'Inconnu'}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full whitespace-nowrap">{company.legalForm}</span>
              {company.city && <span className="text-xs sm:text-sm text-gray-400 truncate">{company.city}, {company.country}</span>}
              {unpaidInvoices.length > 0 && (
                <span className="text-xs sm:text-sm text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                  {formatCurrency(totalUnpaid)} impayé
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end border-t border-gray-100 sm:border-0 pt-3 sm:pt-0">
          <Button variant="outline" size="sm" onClick={() => setShowEditForm(true)} className="gap-2">
            <Edit className="w-4 h-4" /> <span className="hidden sm:inline">Modifier</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeleteCompany} className="text-red-600 hover:bg-red-50 border-red-200 gap-2">
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Supprimer</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="info" className="gap-2"><Building2 className="w-4 h-4" /> Informations</TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <Users className="w-4 h-4" /> Contacts
            {(company.contacts || [])?.length > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{(company.contacts || []).length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="deals" className="gap-2">
            <Target className="w-4 h-4" /> Dossiers
            {deals.length > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{deals.length}</span>
            )}
          </TabsTrigger>

          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="w-4 h-4" /> Factures
            {erpInvoices.length > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{erpInvoices.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="bls" className="gap-2">
            <FileText className="w-4 h-4" /> BL
            {erpBLs.length > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{erpBLs.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="proformas" className="gap-2">
            <FileText className="w-4 h-4" /> Devis (Proforma)
            {erpProformas.length > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{erpProformas.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-2">
            <Upload className="w-4 h-4" /> Fichiers
            {files.length > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{files.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-2">
            <MessageSquare className="w-4 h-4" /> Notes
            {notes.length > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{notes.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border border-gray-100 shadow-sm bg-blue-50/50">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500">Total Facturé</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(situation.totalInvoiced)}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-100 shadow-sm bg-green-50/50">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500">Total Payé</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(situation.totalPaid)}</p>
              </CardContent>
            </Card>
            <Card className="border border-gray-100 shadow-sm bg-red-50/50">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-500">Reste à Payer</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(situation.balanceDue)}</p>
              </CardContent>
            </Card>
          </div>

          {/* ERP Actions */}
          <div className="flex flex-wrap items-center gap-3 mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
            <span className="text-sm font-medium text-blue-900 flex-1 min-w-[200px]">Actions ERP Rapides :</span>
            <Button size="sm" onClick={() => setShowPaymentModal(true)} variant="outline" className="text-green-700 border-green-200 bg-white hover:bg-green-50 shadow-sm">
              Encaisser un paiement
            </Button>
            <Button size="sm" onClick={() => { setEditDocument(null); setShowDocBuilder(true); }} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              Créer Facture / Devis ERP
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard title="Coordonnées fiscales">
              <InfoRow label="NIF" value={company.nif} />
              <InfoRow label="NIS" value={company.nis} />
              <InfoRow label="RC" value={company.rc} />
              <InfoRow label="ART" value={company.art} />
              <InfoRow label="Capital" value={company.capital} />
              <InfoRow label="Exercice fiscal" value={company.fiscalYear} />
            </InfoCard>

            <InfoCard title="Adresse">
              <InfoRow label="Adresse" value={company.address} />
              <InfoRow label="Code postal" value={company.postalCode} />
              <InfoRow label="Wilaya / Ville" value={company.city} />
              <InfoRow label="Pays" value={company.country} />
            </InfoCard>

            <InfoCard title="Contact entreprise">
              {company.email && (
                <a href={`mailto:${company.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline py-1">
                  <Mail className="w-4 h-4 text-gray-400" /> {company.email}
                </a>
              )}
              {company.phone && (
                <a href={`tel:${company.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline py-1">
                  <Phone className="w-4 h-4 text-gray-400" /> {company.phone}
                </a>
              )}
              {company.website && (
                <a href={`https://${company.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline py-1">
                  <Globe className="w-4 h-4 text-gray-400" /> {company.website}
                </a>
              )}
            </InfoCard>

            {company.notes && (
              <InfoCard title="Notes internes">
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{company.notes}</p>
              </InfoCard>
            )}
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{files.length} document{files.length > 1 ? 's' : ''}</p>
            <div className="flex items-center gap-2">
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
              <Button size="sm" disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                <Upload className="w-4 h-4" /> {isUploading ? 'Chargement...' : 'Ajouter un document'}
              </Button>
            </div>
          </div>
          {files.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <Upload className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400">Aucun document administratif (RC, NIF, NIS...)</p>
              <Button variant="outline" className="mt-3" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter un document
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map(file => (
                <Card key={file.id} className="border border-gray-100 shadow-sm relative group overflow-hidden">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
                        <p className="text-xs text-gray-500">{new Date(file.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <a href={file.dataUrl} download={file.name} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                        <Download className="w-4 h-4" />
                      </a>
                      <button onClick={() => handleDeleteFile(file.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{(company.contacts || []).length} contact{(company.contacts || []).length > 1 ? 's' : ''}</p>
            <Button size="sm" onClick={() => { setEditContact(null); setShowContactForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Ajouter un contact
            </Button>
          </div>
          {(company.contacts || []).length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400">Aucun contact pour cette entreprise</p>
              <Button variant="outline" className="mt-3" size="sm" onClick={() => setShowContactForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter un contact
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {(company.contacts || []).map(contact => (
                <ContactCard
                  key={contact.id}
                  contact={contact}
                  onEdit={() => { setEditContact(contact); setShowContactForm(true); }}
                  onDelete={() => {
                    if (confirm(`Supprimer le contact ${contact.firstName} ${contact.lastName} ?`)) {
                      deleteContact(contact.id);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{deals.length} dossier{deals.length > 1 ? 's' : ''}</p>
            <Button size="sm" onClick={() => { setEditDeal(null); setShowDealForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Nouveau dossier
            </Button>
          </div>
          {deals.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <Target className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400">Aucun dossier pour cette entreprise</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {deals.map(deal => {
                const stageLabels: Record<string, string> = {
                  lead: 'Piste',
                  proposal: 'Proposition envoyée',
                  negotiation: 'En négociation',
                  won: 'Gagné',
                  lost: 'Perdu'
                };
                return (
                <Card 
                  key={deal.id} 
                  className="border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative"
                  onClick={() => { setEditDeal(deal); setShowDealForm(true); }}
                >
                  <CardContent className="p-4 flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className="font-semibold text-gray-900 text-lg group-hover:text-blue-600 transition-colors">{deal.title}</h4>
                      <div className="text-sm text-gray-500 mt-2 flex items-center gap-2 flex-wrap">
                        <span className="bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full font-medium border border-blue-100">Phase: {stageLabels[deal.stage] || deal.stage}</span>
                        {deal.value > 0 && <span className="bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-medium border border-green-100">Valeur: {formatCurrency(deal.value)}</span>}
                        {deal.expectedCloseDate && <span className="bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200 text-gray-600">Prévu pour le {formatDate(deal.expectedCloseDate)}</span>}
                      </div>
                      
                      {deal.contactIds && deal.contactIds.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contacts liés</p>
                          <div className="flex flex-wrap gap-2">
                            {(company.contacts || [])
                              .filter(c => deal.contactIds?.includes(c.id))
                              .map(contact => (
                                <div key={contact.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
                                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                    {(contact.firstName || 'I').charAt(0)}{(contact.lastName || '').charAt(0)}
                                  </div>
                                  <div>
                                    <span className="font-medium text-gray-800">{contact.firstName} {contact.lastName}</span>
                                    {contact.position && <span className="text-gray-500 text-xs ml-1">({contact.position})</span>}
                                  </div>
                                </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {deal.notes && (
                        <div className="mt-4 bg-yellow-50/50 border border-yellow-100 rounded-lg p-3">
                          <p className="text-xs font-semibold text-yellow-800 uppercase tracking-wider mb-1">Notes / Informations</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{deal.notes}</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); setEditDeal(deal); setShowDealForm(true); }} 
                        className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                        title="Modifier le dossier"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </TabsContent>



        {/* ERP Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{erpInvoices.length} facture{erpInvoices.length > 1 ? 's' : ''}</p>
            <Button size="sm" onClick={() => { setDocType('invoice'); setEditDocument(null); setShowDocBuilder(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Nouvelle facture ERP
            </Button>
          </div>
          {erpInvoices.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400">Aucune facture ERP pour cette entreprise</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {erpInvoices
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(doc => (
                  <Card 
                    key={doc.id} 
                    className="border border-gray-100 shadow-sm hover:border-blue-200 transition-colors cursor-pointer relative group"
                    onClick={() => setEditDocument(doc)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-gray-900">{doc.reference}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              doc.status === 'paid' ? 'bg-green-100 text-green-700' :
                              doc.status === 'partially_paid' ? 'bg-orange-100 text-orange-700' :
                              doc.status === 'validated' ? 'bg-blue-100 text-blue-700' :
                              doc.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {doc.status === 'draft' ? 'Brouillon' : 
                               doc.status === 'validated' ? 'Validé' : 
                               doc.status === 'paid' ? 'Payé' : 
                               doc.status === 'partially_paid' ? 'Partiellement payé' : 
                               doc.status === 'cancelled' ? 'Annulé' : doc.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Créée le {formatDate(doc.createdAt)}</p>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto border-t border-gray-100 sm:border-0 pt-3 sm:pt-0" onClick={e => e.stopPropagation()}>
                          <div className="text-left sm:text-right flex-1 sm:flex-none">
                            <p className="font-bold text-gray-900 text-lg">{formatCurrency(doc.totalAmount)}</p>
                            <p className="text-xs text-gray-500">{(doc.items || []).length} article(s)</p>
                          </div>
                          
                          <div className="flex gap-1 items-center">
                            {doc.status === 'draft' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => { setEditDocument(doc); setShowDocBuilder(true); }} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0" title="Modifier">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0" title="Supprimer">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {(doc.status === 'validated' || doc.status === 'partially_paid') && (
                              <Button variant="ghost" size="sm" onClick={() => handleCancelDocument(doc.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 text-xs px-2 h-8">
                                Annuler
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handlePrint(doc)} className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0" title="Télécharger">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* ERP BLs Tab */}
        <TabsContent value="bls" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{erpBLs.length} BL</p>
            <Button size="sm" onClick={() => { setDocType('delivery_note'); setEditDocument(null); setShowDocBuilder(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Nouveau BL
            </Button>
          </div>
          {erpBLs.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400">Aucun bon de livraison pour cette entreprise</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {erpBLs
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(doc => (
                  <Card 
                    key={doc.id} 
                    className="border border-gray-100 shadow-sm hover:border-blue-200 transition-colors cursor-pointer relative group"
                    onClick={() => setEditDocument(doc)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-gray-900">{doc.reference}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              doc.status === 'paid' ? 'bg-green-100 text-green-700' :
                              doc.status === 'partially_paid' ? 'bg-orange-100 text-orange-700' :
                              doc.status === 'validated' ? 'bg-blue-100 text-blue-700' :
                              doc.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {doc.status === 'draft' ? 'Brouillon' : 
                               doc.status === 'validated' ? 'Validé' : 
                               doc.status === 'paid' ? 'Payé' : 
                               doc.status === 'partially_paid' ? 'Partiellement payé' : 
                               doc.status === 'cancelled' ? 'Annulé' : doc.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Créé le {formatDate(doc.createdAt)}</p>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto border-t border-gray-100 sm:border-0 pt-3 sm:pt-0" onClick={e => e.stopPropagation()}>
                          <div className="text-left sm:text-right flex-1 sm:flex-none">
                            <p className="font-bold text-gray-900 text-lg">{formatCurrency(doc.totalAmount)}</p>
                            <p className="text-xs text-gray-500">{(doc.items || []).length} article(s)</p>
                          </div>
                          
                          <div className="flex gap-1 items-center">
                            {doc.status === 'draft' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => { setEditDocument(doc); setShowDocBuilder(true); }} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0" title="Modifier">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0" title="Supprimer">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {(doc.status === 'validated' || doc.status === 'partially_paid') && (
                              <Button variant="ghost" size="sm" onClick={() => handleCancelDocument(doc.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 text-xs px-2 h-8">
                                Annuler
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handlePrint(doc)} className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0" title="Télécharger">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* ERP Proformas Tab */}
        <TabsContent value="proformas" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{erpProformas.length} devis ERP</p>
            <Button size="sm" onClick={() => { setDocType('proforma'); setEditDocument(null); setShowDocBuilder(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Nouveau devis ERP
            </Button>
          </div>
          {erpProformas.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400">Aucun devis ERP pour cette entreprise</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {erpProformas
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(doc => (
                  <Card 
                    key={doc.id} 
                    className="border border-gray-100 shadow-sm hover:border-blue-200 transition-colors cursor-pointer relative group"
                    onClick={() => setEditDocument(doc)}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <span className="font-bold text-gray-900">{doc.reference}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              doc.status === 'validated' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {doc.status === 'draft' ? 'Brouillon' : 
                               doc.status === 'validated' ? 'Validé' : 
                               doc.status === 'cancelled' ? 'Annulé' : doc.status}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">Créé le {formatDate(doc.createdAt)}</p>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto border-t border-gray-100 sm:border-0 pt-3 sm:pt-0" onClick={e => e.stopPropagation()}>
                          <div className="text-left sm:text-right flex-1 sm:flex-none">
                            <p className="font-bold text-gray-900 text-lg">{formatCurrency(doc.totalAmount)}</p>
                            <p className="text-xs text-gray-500">{(doc.items || []).length} article(s)</p>
                          </div>
                          
                          <div className="flex gap-1 items-center">
                            {doc.status === 'draft' && (
                              <>
                                <Button variant="ghost" size="sm" onClick={() => { setEditDocument(doc); setShowDocBuilder(true); }} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8 p-0" title="Modifier">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(doc.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0" title="Supprimer">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {(doc.status === 'validated' || doc.status === 'partially_paid') && (
                              <Button variant="ghost" size="sm" onClick={() => handleCancelDocument(doc.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 text-xs px-2 h-8">
                                Annuler
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => handlePrint(doc)} className="text-blue-600 hover:bg-blue-50 h-8 w-8 p-0" title="Télécharger">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{notes.length} note{notes.length > 1 ? 's' : ''}</p>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Ajouter une note</h3>
            <textarea
              className="w-full border border-gray-200 rounded-lg p-3 text-sm min-h-[100px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Compte-rendu d'appel, remarque importante..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
            />
            <div className="flex justify-end mt-2">
              <Button size="sm" onClick={handleAddNote} disabled={!newNote.trim()} className="bg-blue-600 text-white">
                Enregistrer la note
              </Button>
            </div>
          </div>

          {notes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400">Aucune note pour cette entreprise</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notes.map(note => (
                <div key={note.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm relative group">
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-gray-400 mt-2">Le {formatDate(note.createdAt)}</p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { if(confirm('Supprimer cette note ?')) deleteNote(note.id); }}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {showEditForm && (
        <CompanyForm company={company} onClose={() => setShowEditForm(false)} />
      )}
      {showContactForm && (
        <ErrorBoundary>
          <ContactForm
            contact={editContact || undefined}
            companyId={companyId}
            onClose={() => { setShowContactForm(false); setEditContact(null); }}
          />
        </ErrorBoundary>
      )}
      {showDealForm && (
        <ErrorBoundary>
          <DealForm 
            deal={editDeal || undefined}
            defaultCompanyId={companyId}
            onClose={() => { setShowDealForm(false); setEditDeal(null); }} 
          />
        </ErrorBoundary>
      )}
      {showPaymentModal && <PaymentModal onClose={() => setShowPaymentModal(false)} companyId={company.id} />}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border border-gray-100 shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-1">{children}</CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-400 w-36 flex-shrink-0">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value}</span>
    </div>
  );
}

const DEPT_COLORS: Record<string, string> = {
  approvisionnement: 'bg-emerald-100 text-emerald-700',
  comptabilite: 'bg-blue-100 text-blue-700',
  direction: 'bg-violet-100 text-violet-700',
  commercial: 'bg-amber-100 text-amber-700',
  technique: 'bg-slate-100 text-slate-700',
  autre: 'bg-gray-100 text-gray-700',
};

function ContactCard({ contact, onEdit, onDelete }: { contact: Contact; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card 
      className="border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
      onClick={onEdit}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 w-full min-w-0">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
              {(contact.firstName || 'I').charAt(0)}{(contact.lastName || '').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {contact.firstName} {contact.lastName}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${DEPT_COLORS[contact.department] || 'bg-gray-100 text-gray-600'}`}>
                  {getDepartmentLabel(contact.department)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{contact.position || 'Poste non renseigné'}</p>
              
              <div className="flex flex-wrap gap-3 mt-2">
                {contact.email && (
                  <span className="text-xs text-gray-600 flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-gray-400" /> <span className="truncate">{contact.email}</span>
                  </span>
                )}
                {contact.phone && (
                  <span className="text-xs text-gray-600 flex items-center gap-1.5 whitespace-nowrap">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {contact.phone}
                  </span>
                )}
                {contact.mobile && (
                  <span className="text-xs text-gray-600 flex items-center gap-1.5 whitespace-nowrap">
                    <Phone className="w-3.5 h-3.5 text-gray-400" /> {contact.mobile} <span className="text-gray-400">(mob.)</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              title="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
