import React, { useState } from 'react';
import { Lock, Mail, AlertCircle, Building2 } from 'lucide-react';
import { API_URL } from '../lib/api';
import { useCRM } from '../context/CRMContext';
import type { TenantType } from '../types';

export default function Login() {
  const { setCurrentUserId, setCurrentTenant } = useCRM();
  const [tenant, setTenant] = useState<TenantType>('katamine');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Identifiants incorrects');
      }

      localStorage.setItem('token', data.token);
      
      setCurrentTenant(tenant);
      setCurrentUserId(data.user.id, data.user);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setTenant('katamine')}
            className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm transition-all ${
              tenant === 'katamine' ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110' : 'bg-white text-blue-600 hover:bg-gray-50'
            }`}
          >
            KTM
          </button>
          <button
            onClick={() => setTenant('kltools')}
            className={`w-16 h-16 rounded-xl flex items-center justify-center font-bold text-lg shadow-sm transition-all ${
              tenant === 'kltools' ? 'bg-amber-500 text-white ring-4 ring-amber-100 scale-110' : 'bg-white text-amber-500 hover:bg-gray-50'
            }`}
          >
            KLT
          </button>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Portail CRM
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Connectez-vous à l'espace {tenant === 'katamine' ? 'Katamine' : 'KL Tools'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <p className="ml-3 text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Adresse Email
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  placeholder="admin@katamine.dz"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 px-3 border"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                  isLoading ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isLoading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
