import React, { useEffect, useState } from 'react';
import EvaluationForm from './components/EvaluationForm';
import DriverDashboard from './components/DriverDashboard';
import TemplateManager from './components/TemplateManager';
import GeneralDashboard from './components/GeneralDashboard';
import MN10Dashboard from './components/mn10/MN10Dashboard';
import { useAuth } from './contexts/AuthContext';
import Button from './components/ui/Button';
import Icon from './components/ui/Icon';
import type { IconName } from './components/ui/iconNames';

type Tab = 'form' | 'driver-dashboard' | 'general-dashboard' | 'templates' | 'mn10';

interface NavItem {
  tab: Tab;
  label: string; // rótulo completo (abas do desktop)
  shortLabel: string; // rótulo curto (barra inferior do celular)
  icon: IconName;
  requires?: 'manage' | 'mn10';
}

const NAV_ITEMS: NavItem[] = [
  { tab: 'form', label: 'Formulário de Avaliação', shortLabel: 'Avaliar', icon: 'clipboard-list' },
  { tab: 'general-dashboard', label: 'Dashboard Geral', shortLabel: 'Geral', icon: 'chart-pie' },
  { tab: 'driver-dashboard', label: 'Análise por Motorista', shortLabel: 'Motoristas', icon: 'user-search' },
  { tab: 'templates', label: 'Gerenciar', shortLabel: 'Gerenciar', icon: 'settings', requires: 'manage' },
  { tab: 'mn10', label: 'MN10', shortLabel: 'MN10', icon: 'medal', requires: 'mn10' },
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('general-dashboard');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { currentUser, logout, canManageSystem, canAccessMN10 } = useAuth();

  const visibleItems = NAV_ITEMS.filter(item => {
    if (item.requires === 'manage') return canManageSystem;
    if (item.requires === 'mn10') return canAccessMN10;
    return true;
  });

  useEffect(() => {
    if (!isUserMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isUserMenuOpen]);

  const handleTabClick = (tab: Tab) => {
    setActiveTab(tab);
    setIsUserMenuOpen(false);
    window.scrollTo({ top: 0 });
  };

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
      case 'mn10':
        return <MN10Dashboard />;
      default:
        return <GeneralDashboard />;
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 font-sans text-brand-text pb-[calc(4.25rem+env(safe-area-inset-bottom))] sm:pb-0">
      <header className="sticky top-0 z-30 bg-brand-primary shadow-md pt-[env(safe-area-inset-top)]">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 h-16 sm:h-20">
            <img
              src={`${import.meta.env.BASE_URL}ambiental.svg`}
              alt="Ambiental"
              className="h-9 w-auto sm:h-12 flex-shrink-0"
            />
            <h1 className="flex-1 min-w-0 text-sm leading-tight sm:text-xl font-bold text-white sm:text-center">
              Acompanhamento de Motoristas
            </h1>

            {/* Desktop: e-mail e sair */}
            <div className="hidden sm:flex items-center gap-3 text-white">
              <span className="flex items-center gap-2 text-sm">
                <Icon name="user" aria-hidden />
                <span className="max-w-[220px] truncate">{currentUser?.email}</span>
              </span>
              <Button onClick={logout} variant="onDark" size="sm">
                <Icon name="logout" aria-hidden />
                Sair
              </Button>
            </div>

            {/* Celular: menu da conta */}
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(open => !open)}
              aria-expanded={isUserMenuOpen}
              aria-controls="user-menu"
              aria-label={isUserMenuOpen ? 'Fechar menu da conta' : 'Abrir menu da conta'}
              title={isUserMenuOpen ? 'Fechar menu da conta' : 'Abrir menu da conta'}
              className="sm:hidden flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-brand text-white hover:bg-white/10 active:bg-white/20"
            >
              <Icon name={isUserMenuOpen ? 'x' : 'menu-2'} className="h-6 w-6" />
            </button>
          </div>
        </div>

        {isUserMenuOpen && (
          <div id="user-menu" className="sm:hidden bg-white border-b border-gray-200 shadow-lg">
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center gap-2 text-gray-600 min-w-0">
                <Icon name="user" aria-hidden />
                <span className="text-sm truncate">{currentUser?.email}</span>
              </div>
              <Button onClick={logout} variant="secondary" className="w-full">
                <Icon name="logout" aria-hidden />
                Sair
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Desktop: abas */}
      <nav className="hidden sm:block bg-white border-b border-gray-200" aria-label="Navegação principal">
        <div className="w-full px-6 lg:px-8 flex gap-2">
          {visibleItems.map(item => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => handleTabClick(item.tab)}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-4 whitespace-nowrap transition-colors focus:outline-none focus-visible:bg-brand-light ${
                  isActive
                    ? 'border-brand-green text-brand-primary'
                    : 'border-transparent text-gray-500 hover:text-brand-primary hover:bg-brand-light'
                }`}
              >
                <Icon name={item.icon} className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {renderContent()}
      </main>

      <footer className="text-center py-4 text-brand-gray-mid text-xs sm:text-sm">
        <p>&copy; {new Date().getFullYear()} Ambiental · Acompanhamento de motoristas</p>
      </footer>

      {/* Celular: barra de navegação inferior */}
      <nav
        className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]"
        aria-label="Navegação principal"
      >
        <div className="flex">
          {visibleItems.map(item => {
            const isActive = activeTab === item.tab;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => handleTabClick(item.tab)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex-1 min-w-0 min-h-[4rem] flex flex-col items-center justify-center gap-1 px-1 text-[11px] font-semibold leading-none transition-colors active:bg-brand-light ${
                  isActive ? 'text-brand-primary' : 'text-gray-500'
                }`}
              >
                {isActive && <span className="absolute top-0 inset-x-3 h-1 rounded-b bg-brand-green" aria-hidden="true" />}
                <Icon name={item.icon} className="h-6 w-6" />
                <span className="max-w-full truncate">{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default App;
