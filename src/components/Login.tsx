import React, { useState } from 'react';
import { useCRM } from '@/context/CRMContext';
import { Button } from '@/components/ui/button';
import { Lock, Mail } from 'lucide-react';

export default function Login() {
  const { data, setCurrentUserId, setCurrentTenant } = useCRM();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = (data.employees || []).find(
      emp => emp.email.toLowerCase() === email.toLowerCase() && emp.password === password
    );

    if (user) {
      let tenant: 'katamine' | 'kltools' | null = null;
      if (email.toLowerCase().includes('@katamine.dz')) {
        tenant = 'katamine';
      } else if (email.toLowerCase().includes('@kltools.dz')) {
        tenant = 'kltools';
      }
      
      setCurrentTenant(tenant);
      setCurrentUserId(user.id);
    } else {
      setError('Email ou mot de passe incorrect.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            KTM
          </div>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
            KLT
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Portail CRM
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Connectez-vous à l'espace Katamine ou KL Tools
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center font-medium">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Adresse Email</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  className="pl-10 block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  placeholder="vous@katamine.dz ou vous@kltools.dz"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  className="pl-10 block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-gray-500 focus:border-gray-500 sm:text-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <a href="#" className="font-medium text-gray-600 hover:text-gray-900">
                  Mot de passe oublié ?
                </a>
              </div>
            </div>

            <div>
              <Button type="submit" className="w-full bg-gray-900 hover:bg-gray-800 text-white py-2.5 text-base">
                Se connecter
              </Button>
            </div>
          </form>
          
        </div>
      </div>
    </div>
  );
}
