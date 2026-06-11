import { useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import { CRMProvider, useCRM } from './context/CRMContext';
import Dashboard from './components/Dashboard';
import Companies from './components/Companies';

import Pipeline from './components/Pipeline';
import Products from './components/Products';
import Tasks from './components/Tasks';
import Team from './components/Team';
import SettingsPage from './components/SettingsPage';
import Documents from './components/Documents';
import Payments from './components/Payments';
import Login from './components/Login';
import NotificationPopup from './components/NotificationPopup';
import { LayoutDashboard, Building2, FileText, Settings, Menu, X, Package, Target, CheckSquare, FileSignature, Users, LogOut, Bell, Truck, CreditCard } from 'lucide-react';

type Page = 'dashboard' | 'companies' | 'pipeline' | 'products' | 'tasks' | 'team' | 'settings' | 'documents' | 'suppliers' | 'payments';

function AppLayout() {
  const { currentUser, currentTenant, setCurrentUserId, setCurrentTenant } = useCRM();
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(true);

  // If no user is logged in, show Login screen
  if (!currentUser) {
    return <Login />;
  }

  const navigate = (p: string) => {
    setPage(p as Page);
    setSidebarOpen(false);
  };

  const handleLogout = () => {
    setCurrentUserId(null);
    setCurrentTenant(null);
  };

  const isAdmin = currentUser?.role === 'admin';
  const permissions = currentUser?.permissions || [];

  const ALL_NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode; adminOnly?: boolean }[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'companies', label: 'Entreprises', icon: <Building2 className="w-5 h-5" /> },
    { id: 'pipeline', label: 'Opportunités', icon: <Target className="w-5 h-5" /> },
    { id: 'documents', label: 'Ventes & Achats', icon: <FileText className="w-5 h-5" /> },
    { id: 'payments', label: 'Créances & Paiements', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'suppliers', label: 'Fournisseurs', icon: <Truck className="w-5 h-5" /> },
    { id: 'products', label: 'Catalogue', icon: <Package className="w-5 h-5" /> },
    { id: 'tasks', label: 'Tâches', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'team', label: 'Mon Équipe', icon: <Users className="w-5 h-5" />, adminOnly: true },
    { id: 'settings', label: 'Paramètres', icon: <Settings className="w-5 h-5" />, adminOnly: true },
  ];

  const visibleNavItems = ALL_NAV_ITEMS.filter(item => {
    if (isAdmin) return true;
    if (item.adminOnly) return false;
    return permissions.includes(item.id);
  });

  const renderPage = () => {
    if (!isAdmin && !permissions.includes(page) && page !== 'dashboard') {
      return <Dashboard onNavigate={navigate} />;
    }

    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />;
      case 'companies': return <Companies role="client" />;
      case 'pipeline': return <Pipeline />;
      case 'documents': return <Documents />;
      case 'payments': return <Payments />;
      case 'suppliers': return <Companies role="supplier" />;
      case 'products': return <Products />;
      case 'tasks': return <Tasks />;
      case 'team': return isAdmin ? <Team /> : <Dashboard onNavigate={navigate} />;
      case 'settings': return isAdmin ? <SettingsPage /> : <Dashboard onNavigate={navigate} />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  const theme = currentTenant === 'katamine' 
    ? {
        name: 'KATAMINE',
        short: 'KTM',
        gradient: 'from-blue-600 to-blue-800',
        text: 'text-blue-600',
        textActive: 'text-blue-700',
        bgSubtle: 'bg-blue-50',
        avatarBg: 'bg-blue-100'
      }
    : {
        name: 'KL TOOLS',
        short: 'KLT',
        gradient: 'from-yellow-500 to-yellow-600',
        text: 'text-yellow-600',
        textActive: 'text-yellow-700',
        bgSubtle: 'bg-yellow-50',
        avatarBg: 'bg-yellow-100'
      };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-60 bg-white border-r border-gray-100 fixed top-0 left-0 h-full z-30">
        <SidebarContent page={page} navigate={navigate} navItems={visibleNavItems} theme={theme} />
      </aside>

      {/* Sidebar - Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 h-full bg-white shadow-xl flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent page={page} navigate={navigate} navItems={visibleNavItems} theme={theme} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900">
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              {theme.name === 'KATAMINE' ? (
                <img src="/logo-katamine.png" alt="Katamine Logo" className="h-6 w-auto object-contain" />
              ) : (
                <>
                  <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white font-bold text-sm`}>
                    {theme.short}
                  </div>
                  <span className="font-bold text-gray-900 text-sm">{theme.name}</span>
                </>
              )}
            </div>
          </div>
          <div className="hidden lg:block" /> {/* Spacer */}
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-900">{currentUser.firstName} {currentUser.lastName}</p>
              <p className="text-xs text-gray-500">{isAdmin ? 'Gérant' : 'Employé'}</p>
            </div>
            <div className={`w-10 h-10 rounded-full ${theme.avatarBg} ${theme.textActive} flex items-center justify-center font-bold`}>
              {(currentUser.firstName || 'U').charAt(0)}{(currentUser.lastName || '').charAt(0)}
            </div>
            <button 
              onClick={() => setShowPopup(true)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 max-w-6xl w-full mx-auto">
          {renderPage()}
        </div>
      </main>

      {showPopup && (
        <NotificationPopup onClose={() => setShowPopup(false)} />
      )}
    </div>
  );
}

function SidebarContent({ page, navigate, navItems, theme }: { page: Page; navigate: (p: string) => void, navItems: any[], theme: any }) {
  return (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-gray-50">
        <div className="flex items-center gap-3">
          {theme.name === 'KATAMINE' ? (
            <img src="/logo-katamine.png" alt="Katamine Logo" className="h-8 w-auto object-contain" />
          ) : (
            <>
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${theme.gradient} flex items-center justify-center text-white font-bold text-lg shadow-sm`}>
                {theme.short}
              </div>
              <div>
                <p className="font-bold text-gray-900 leading-tight">{theme.name}</p>
                <p className="text-[11px] text-gray-400 leading-tight">CRM Clients</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              page === item.id
                ? `${theme.bgSubtle} ${theme.textActive} shadow-sm`
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <span className={page === item.id ? theme.text : 'text-gray-400'}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-50">
        <p className="text-[10px] text-gray-300 text-center">CRM Multi-Entités v2.1</p>
      </div>
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <CRMProvider>
        <AppLayout />
      </CRMProvider>
    </ErrorBoundary>
  );
}
