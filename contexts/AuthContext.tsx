import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  AuthError 
} from 'firebase/auth';
import { auth } from '../firebase';
import type { User } from '../types';
import { getUsers } from '../services/firebaseService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  systemUser: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
  isAdmin: boolean;
  isManager: boolean;
  canAccessBranch: (branch: string) => boolean;
  canManageSystem: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [systemUser, setSystemUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Funções utilitárias para verificar permissões
  const isAdmin = systemUser?.role === 'admin';
  const isManager = systemUser?.role === 'manager';
  const canManageSystem = isAdmin;
  const canAccessBranch = (branch: string) => {
    if (isAdmin) return true;
    return systemUser?.branches.includes(branch) || false;
  };

  // Carregar dados do usuário do sistema quando há autenticação
  const loadSystemUser = async (firebaseUser: FirebaseUser) => {
    try {
      const users = await getUsers();
      const user = users.find(u => u.email === firebaseUser.email && u.isActive);
      setSystemUser(user || null);
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      setSystemUser(null);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      const authError = error as AuthError;
      let errorMessage = 'Erro ao fazer login';
      
      switch (authError.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Muitas tentativas. Tente novamente mais tarde';
          break;
        default:
          errorMessage = authError.message || 'Erro ao fazer login';
      }
      
      setError(errorMessage);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setSystemUser(null);
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadSystemUser(user);
      } else {
        setSystemUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    systemUser,
    login,
    logout,
    loading,
    error,
    isAdmin,
    isManager,
    canAccessBranch,
    canManageSystem
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 