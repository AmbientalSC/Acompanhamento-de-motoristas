
import React, { useState } from 'react';
import { ClipboardList, LayoutDashboard, FileText, PieChart, LogOut, User, Menu, X } from 'lucide-react';
import EvaluationForm from './components/EvaluationForm';
import DriverDashboard from './components/DriverDashboard';
import TemplateManager from './components/TemplateManager';
import GeneralDashboard from './components/GeneralDashboard';
import { useAuth } from './contexts/AuthContext';
import Button from './components/ui/Button';

type Tab = 'form' | 'driver-dashboard' | 'general-dashboard' | 'templates';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('general-dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logout, canManageSystem } = useAuth();

  const renderContent = () => {
    switch (activeTab) {
      case 'general-dashboard':
        return <GeneralDashboard />;
      case 'driver-dashboard':
        return <DriverDashboard />;
      case 'form':
        return <EvaluationForm />;
      case 'templates':
        return <TemplateManager />;
      default:
        return <GeneralDashboard />;
    }
  };

  const TabButton: React.FC<{ tabName: Tab; label: string; icon: React.ReactNode; onClick?: () => void }> = ({ 
    tabName, 
    label, 
    icon, 
    onClick 
  }) => (
    <button
      onClick={onClick || (() => setActiveTab(tabName))}
      className={`flex items-center justify-center gap-2 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold rounded-t-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent whitespace-nowrap ${
        activeTab === tabName
          ? 'bg-white text-brand-primary border-b-2 border-brand-primary'
          : 'bg-transparent text-gray-500 hover:bg-blue-100 hover:text-brand-secondary'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{label.split(' ')[0]}</span>
    </button>
  );

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-brand-primary shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            <div className="flex items-center gap-2 sm:gap-3">
              <img 
                src="./ambiental.svg" 
                alt="Logo Ambiental" 
                className="h-8 w-auto sm:h-12"
              />
            </div>
            <div className="flex-1 flex justify-center">
              <h1 className="text-lg sm:text-2xl font-bold text-white tracking-tight text-center">
                Acompanhamento de Motoristas
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Desktop User Info */}
              <div className="hidden sm:flex items-center gap-2 text-white">
                <User className="h-4 w-4" />
                <span className="text-sm">{currentUser?.email}</span>
              </div>
              
              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden text-white p-2"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              {/* Desktop Logout Button */}
              <Button
                onClick={logout}
                variant="secondary"
                className="hidden sm:flex !bg-white !text-brand-primary hover:!bg-gray-100 !py-1 !px-3 text-sm"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-white border-b border-gray-200 shadow-lg">
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 text-gray-600 mb-3">
              <User className="h-4 w-4" />
              <span className="text-sm truncate">{currentUser?.email}</span>
            </div>
            <Button
              onClick={logout}
              variant="secondary"
              className="w-full !bg-gray-100 !text-gray-700 hover:!bg-gray-200 !py-2 text-sm"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      )}

      <main className="container mx-auto p-2 sm:p-4 lg:p-6">
        <div className="border-b border-gray-200 mb-4 sm:mb-6">
          <nav className="-mb-px flex flex-wrap gap-1 sm:gap-4 overflow-x-auto" aria-label="Tabs">
            <TabButton 
              tabName="form" 
              label="Formulário de Avaliação" 
              icon={<ClipboardList className="h-4 w-4 sm:h-5 sm:w-5" />}
              onClick={() => handleTabClick('form')}
            />
            <TabButton 
              tabName="general-dashboard" 
              label="Dashboard Geral" 
              icon={<PieChart className="h-4 w-4 sm:h-5 sm:w-5" />}
              onClick={() => handleTabClick('general-dashboard')}
            />
            <TabButton 
              tabName="driver-dashboard" 
              label="Análise por Motorista" 
              icon={<LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5" />}
              onClick={() => handleTabClick('driver-dashboard')}
            />
            {canManageSystem && (
              <TabButton 
                tabName="templates" 
                label="Gerenciar" 
                icon={<FileText className="h-4 w-4 sm:h-5 sm:w-5" />}
                onClick={() => handleTabClick('templates')}
              />
            )}
          </nav>
        </div>
        
        <div>
          {renderContent()}
        </div>
      </main>

       <footer className="text-center py-4 mt-8 text-gray-500 text-xs sm:text-sm">
        <p>&copy; {new Date().getFullYear()} Acompanhamento de motoristas.</p>
      </footer>
    </div>
  );
};

export default App;
