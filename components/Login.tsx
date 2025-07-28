import React, { useState } from 'react';
import { LogIn, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, error } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      // Error is handled by the AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <img 
                src="./ambiental.svg" 
                alt="Logo Ambiental" 
                className="h-16 w-auto"
              />
            </div>
            <h1 className="text-2xl font-bold text-brand-dark mb-2">
              Acompanhamento de Motoristas
            </h1>
            <p className="text-gray-600">
              Faça login para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <div className="relative">
                <Input
                  label="Senha"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="h-5 w-5 mr-2" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Apenas usuários autorizados podem acessar este sistema
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login; 