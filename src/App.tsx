import { useState } from 'react';
import { CRMProvider } from './context/CRMContext';
import Dashboard from './components/Dashboard';
import Companies from './components/Companies';
import Invoices from './components/Invoices';
import SettingsPage from './components/SettingsPage';
import { LayoutDashboard, Building2, FileText, Settings, Menu, X, Bell } from 'lucide-react';

type Page = 'dashboard' | 'companies' | 'invoices' | 'settings';

const NAV_ITEMS: { id: Page; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'companies', label: 'Entreprises', icon: <Building2 className="w-5 h-5" /> },
  { id: 'invoices', label: 'Factures', icon: <FileText className="w-5 h-5" /> },
  { id: 'settings', label: 'Paramètres', icon: <Settings className="w-5 h-5" /> },
];

function AppContent() {
  const [page, setPage] = useState<Page>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = (p: string) => {
    setPage(p as Page);
    setSidebarOpen(false);
  };

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />;
      case 'companies': return <Companies />;
      case 'invoices': return <Invoices />;
      case 'settings': return <SettingsPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-60 bg-white border-r border-gray-100 fixed top-0 left-0 h-full z-30">
        <SidebarContent page={page} navigate={navigate} />
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
            <SidebarContent page={page} navigate={navigate} />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-60 flex flex-col">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-sm">K</div>
            <span className="font-bold text-gray-900 text-sm">KATAMINE</span>
          </div>
          <div className="w-6" />
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 max-w-5xl w-full mx-auto">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

function SidebarContent({ page, navigate }: { page: Page; navigate: (p: string) => void }) {
  return (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white font-bold text-lg">
            K
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-tight">KATAMINE</p>
            <p className="text-[11px] text-gray-400 leading-tight">CRM Clients</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => navigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              page === item.id
                ? 'bg-blue-50 text-blue-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <span className={page === item.id ? 'text-blue-600' : 'text-gray-400'}>
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-50">
        <p className="text-[10px] text-gray-300 text-center">KATAMINE CRM v1.0</p>
      </div>
    </>
  );
}

export default function App() {
  return (
    <CRMProvider>
      <AppContent />
    </CRMProvider>
  );
}
