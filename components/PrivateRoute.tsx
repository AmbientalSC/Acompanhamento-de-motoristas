import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';
import Icon from './ui/Icon';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-dvh bg-brand-gray flex items-center justify-center p-4">
        <div className="text-center" role="status" aria-live="polite">
          <Icon name="loader-2" className="h-12 w-12 animate-spin text-brand-primary mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return <>{children}</>;
};

export default PrivateRoute; 