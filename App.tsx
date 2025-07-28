
import React, { useState } from 'react';
import { ClipboardList, LayoutDashboard, Truck, FileText, PieChart, LogOut, User } from 'lucide-react';
import EvaluationForm from './components/EvaluationForm';
import DriverDashboard from './components/DriverDashboard';
import TemplateManager from './components/TemplateManager';
import GeneralDashboard from './components/GeneralDashboard';
import { useAuth } from './contexts/AuthContext';
import Button from './components/ui/Button';

type Tab = 'form' | 'driver-dashboard' | 'general-dashboard' | 'templates';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('general-dashboard');
  const { currentUser, logout } = useAuth();

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

  const TabButton: React.FC<{ tabName: Tab; label: string; icon: React.ReactNode }> = ({ tabName, label, icon }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-t-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent ${
        activeTab === tabName
          ? 'bg-white text-brand-primary border-b-2 border-brand-primary'
          : 'bg-transparent text-gray-500 hover:bg-blue-100 hover:text-brand-secondary'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-brand-primary shadow-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img 
                src="./ambiental.svg" 
                alt="Logo Ambiental" 
                className="h-12 w-auto"
              />
            </div>
            <div className="flex-1 flex justify-center">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Acompanhamento de Motoristas
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-white">
                <User className="h-4 w-4" />
                <span className="text-sm">{currentUser?.email}</span>
              </div>
              <Button
                onClick={logout}
                variant="secondary"
                className="!bg-white !text-brand-primary hover:!bg-gray-100 !py-1 !px-3 text-sm"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <TabButton tabName="form" label="Formulário de Avaliação" icon={<ClipboardList className="h-5 w-5" />} />
            <TabButton tabName="general-dashboard" label="Dashboard Geral" icon={<PieChart className="h-5 w-5" />} />
            <TabButton tabName="driver-dashboard" label="Análise por Motorista" icon={<LayoutDashboard className="h-5 w-5" />} />
            <TabButton tabName="templates" label="Gerenciar" icon={<FileText className="h-5 w-5" />} />
          </nav>
        </div>
        
        <div>
          {renderContent()}
        </div>
      </main>

       <footer className="text-center py-4 mt-8 text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Driver Performance Tracker. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default App;
