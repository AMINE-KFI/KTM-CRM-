import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import type { Contact } from '@/types';
import { formatCurrency, formatDate, getDepartmentLabel, getDaysOverdue } from '@/lib/storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft, Building2, Edit, Trash2, Plus, Phone, Mail, Globe,
  MapPin, FileText, Users, CreditCard, MoreVertical, User, MessageSquare
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import CompanyForm from './CompanyForm';
import ContactForm from './ContactForm';
import InvoiceForm from './InvoiceForm';
import { InvoiceStatusBadge } from './Dashboard';

interface CompanyDetailProps {
  companyId: string;
  onBack: () => void;
}

const DEPT_COLORS: Record<string, string> = {
  approvisionnement: 'bg-blue-100 text-blue-700',
  comptabilite: 'bg-green-100 text-green-700',
  direction: 'bg-purple-100 text-purple-700',
  commercial: 'bg-orange-100 text-orange-700',
  technique: 'bg-gray-100 text-gray-700',
  autre: 'bg-gray-100 text-gray-600',
};

export default function CompanyDetail({ companyId, onBack }: CompanyDetailProps) {
  const { data, getCompany, deleteCompany, getInvoicesForCompany, deleteContact, markAsPaid, deleteInvoice, addNote, deleteNote } = useCRM();
  const company = getCompany(companyId);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [newNote, setNewNote] = useState('');

  if (!company) return null;

  const invoices = getInvoicesForCompany(companyId);
  const unpaidInvoices = invoices.filter(i => i.status !== 'paid');
  const totalUnpaid = unpaidInvoices.reduce((s, i) => s + i.totalAmount, 0);
  
  const notes = (data.notes || []).filter(n => n.companyId === companyId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleDeleteCompany = () => {
    if (confirm(`Supprimer l'entreprise "${company.name}" et toutes ses données ?`)) {
      deleteCompany(companyId);
      onBack();
    }
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    addNote({ content: newNote.trim(), companyId });
    setNewNote('');
  };

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
            {company.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{company.name}</h1>
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
            {company.contacts.length > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{company.contacts.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="w-4 h-4" /> Factures
            {invoices.length > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded-full">{invoices.length}</span>
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

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{company.contacts.length} contact{company.contacts.length > 1 ? 's' : ''}</p>
            <Button size="sm" onClick={() => { setEditContact(null); setShowContactForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Ajouter un contact
            </Button>
          </div>
          {company.contacts.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400">Aucun contact pour cette entreprise</p>
              <Button variant="outline" className="mt-3" size="sm" onClick={() => setShowContactForm(true)}>
                <Plus className="w-4 h-4 mr-2" /> Ajouter un contact
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {company.contacts.map(contact => (
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

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{invoices.length} facture{invoices.length > 1 ? 's' : ''}</p>
            <Button size="sm" onClick={() => setShowInvoiceForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
              <Plus className="w-4 h-4" /> Nouvelle facture
            </Button>
          </div>
          {invoices.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <FileText className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400">Aucune facture pour cette entreprise</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {invoices
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map(inv => (
                  <Card key={inv.id} className="border border-gray-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 w-full min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 truncate">{inv.invoiceNumber}</span>
                            <InvoiceStatusBadge status={inv.status} />
                          </div>
                          <p className="text-sm text-gray-500 mt-1 truncate">{inv.description || 'Sans description'}</p>
                          <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                            <span>Émise: {formatDate(inv.issueDate)}</span>
                            <span>Échéance: {formatDate(inv.dueDate)}</span>
                            {inv.status !== 'paid' && getDaysOverdue(inv.dueDate) > 0 && (
                              <span className="text-red-500 font-medium whitespace-nowrap">{getDaysOverdue(inv.dueDate)}j de retard</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full sm:w-auto sm:justify-end gap-3 border-t border-gray-100 sm:border-0 pt-3 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <p className="font-bold text-gray-900">{formatCurrency(inv.totalAmount)}</p>
                            <p className="text-xs text-gray-400">HT: {formatCurrency(inv.amount)}</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {inv.status !== 'paid' ? (
                                <DropdownMenuItem onClick={() => {
                                  const date = prompt('Date de paiement (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
                                  if (date) markAsPaid(inv.id, date);
                                }} className="text-green-600">
                                  ✓ Marquer comme payée
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => {
                                  const current = inv.paidDate || new Date().toISOString().split('T')[0];
                                  const date = prompt('Modifier la date de paiement (YYYY-MM-DD):', current);
                                  if (date) markAsPaid(inv.id, date);
                                }} className="text-blue-600">
                                  Modifier la date de paiement
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => { if (confirm('Supprimer cette facture ?')) deleteInvoice(inv.id); }}
                                className="text-red-600"
                              >
                                Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
        <ContactForm
          contact={editContact || undefined}
          companyId={companyId}
          onClose={() => { setShowContactForm(false); setEditContact(null); }}
        />
      )}
      {showInvoiceForm && (
        <InvoiceForm
          companyId={companyId}
          onClose={() => setShowInvoiceForm(false)}
        />
      )}
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

function ContactCard({ contact, onEdit, onDelete }: { contact: Contact; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3 w-full min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {contact.firstName.charAt(0)}{contact.lastName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-gray-900 truncate">{contact.firstName} {contact.lastName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${DEPT_COLORS[contact.department] || 'bg-gray-100 text-gray-600'}`}>
                  {getDepartmentLabel(contact.department)}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5 truncate">{contact.position}</p>
              <div className="flex flex-wrap gap-3 mt-1.5">
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 flex-shrink-0" /> <span className="truncate">{contact.email}</span>
                  </a>
                )}
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 whitespace-nowrap">
                    <Phone className="w-3 h-3 flex-shrink-0" /> {contact.phone}
                  </a>
                )}
                {contact.mobile && (
                  <a href={`tel:${contact.mobile}`} className="text-xs text-gray-500 flex items-center gap-1 whitespace-nowrap">
                    <Phone className="w-3 h-3 flex-shrink-0" /> {contact.mobile} (mob.)
                  </a>
                )}
              </div>
              {contact.notes && <p className="text-xs text-gray-400 mt-1 italic line-clamp-2">{contact.notes}</p>}
            </div>
          </div>
          <div className="flex gap-1 w-full sm:w-auto justify-end border-t border-gray-100 sm:border-0 pt-3 sm:pt-0">
            <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600">
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 w-8 p-0 text-gray-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
