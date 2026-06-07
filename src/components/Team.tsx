import { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ShieldAlert, Edit, X } from 'lucide-react';
import { formatDate } from '@/lib/storage';
import type { Employee } from '@/types';

const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'companies', label: 'Entreprises' },
  { id: 'pipeline', label: 'Opportunités' },
  { id: 'quotes', label: 'Devis' },
  { id: 'invoices', label: 'Factures' },
  { id: 'products', label: 'Catalogue' },
  { id: 'tasks', label: 'Tâches' },
];

export default function Team() {
  const { data, addEmployee, updateEmployee, deleteEmployee, currentUser } = useCRM();
  const [showForm, setShowForm] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  if (currentUser?.role !== 'admin') {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
        <ShieldAlert className="w-12 h-12 text-red-200 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-gray-900">Accès refusé</h2>
        <p className="text-gray-500 mt-2">Vous devez être gérant pour voir l'équipe.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mon Équipe</h1>
          <p className="text-gray-500 text-sm mt-0.5">{(data.employees || []).length} collaborateur(s)</p>
        </div>
        <Button onClick={() => { setEditingEmp(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Ajouter
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(data.employees || []).map(emp => (
          <Card key={emp.id} className="border border-gray-100 shadow-sm relative group">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 truncate">{emp.firstName} {emp.lastName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                    emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {emp.role === 'admin' ? 'Gérant' : 'Employé'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5 truncate">{emp.email}</p>
                <p className="text-xs text-gray-400 mt-1">Ajouté le {formatDate(emp.createdAt)}</p>
                <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                  Accès : {emp.role === 'admin' ? 'Total' : (emp.permissions || []).map(p => AVAILABLE_MODULES.find(m => m.id === p)?.label).filter(Boolean).join(', ')}
                </p>
              </div>
              
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setEditingEmp(emp); setShowForm(true); }}
                  className="text-gray-400 hover:text-blue-600 h-8 w-8 p-0"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                {emp.id !== currentUser.id && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { if(confirm(`Supprimer ${emp.firstName} de l'équipe ?`)) deleteEmployee(emp.id); }}
                    className="text-gray-400 hover:text-red-600 h-8 w-8 p-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showForm && (
        <EmployeeForm 
          employee={editingEmp} 
          onClose={() => setShowForm(false)} 
          onSave={(empData) => {
            if (editingEmp) {
              updateEmployee(editingEmp.id, empData);
            } else {
              addEmployee(empData as Omit<Employee, 'id' | 'createdAt'>);
            }
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}

function EmployeeForm({ employee, onClose, onSave }: { employee: Employee | null, onClose: () => void, onSave: (data: any) => void }) {
  const [firstName, setFirstName] = useState(employee?.firstName || '');
  const [lastName, setLastName] = useState(employee?.lastName || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [password, setPassword] = useState(employee?.password || '12345');
  const [role, setRole] = useState<'admin' | 'employee'>(employee?.role || 'employee');
  const [permissions, setPermissions] = useState<string[]>(employee?.permissions || ['dashboard']);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      firstName,
      lastName,
      email,
      password,
      role,
      permissions: role === 'admin' ? AVAILABLE_MODULES.map(m => m.id) : permissions
    });
  };

  const togglePermission = (id: string) => {
    if (permissions.includes(id)) {
      setPermissions(permissions.filter(p => p !== id));
    } else {
      setPermissions([...permissions, id]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{employee ? 'Modifier le profil' : 'Nouveau collaborateur'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input required className="w-full border border-gray-300 rounded-lg p-2" value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input required className="w-full border border-gray-300 rounded-lg p-2" value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" required className="w-full border border-gray-300 rounded-lg p-2" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input required className="w-full border border-gray-300 rounded-lg p-2" value={password} onChange={e => setPassword(e.target.value)} />
            <p className="text-xs text-gray-500 mt-1">Sera utilisé pour la connexion à la plateforme.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
            <select className="w-full border border-gray-300 rounded-lg p-2 bg-white" value={role} onChange={e => setRole(e.target.value as 'admin'|'employee')}>
              <option value="employee">Employé (Accès restreint)</option>
              <option value="admin">Gérant (Accès total)</option>
            </select>
          </div>

          {role === 'employee' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions (Modules autorisés)</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                {AVAILABLE_MODULES.map(mod => (
                  <label key={mod.id} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={permissions.includes(mod.id)}
                      onChange={() => togglePermission(mod.id)}
                    />
                    <span className="text-sm text-gray-700">{mod.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
