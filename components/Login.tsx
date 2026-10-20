import React, { useState } from 'react';
import Icon from './ui/Icon';
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
    <div className="min-h-dvh bg-brand-primary flex items-start sm:items-center justify-center px-4 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md">
        {/* O logo tem texto branco: fica sobre o azul da marca, fora do cartão */}
        <div className="flex justify-center mb-6">
          <img
            src={`${import.meta.env.BASE_URL}ambiental.svg`}
            alt="Ambiental"
            className="h-14 sm:h-16 w-auto"
          />
        </div>

        <Card className="p-5 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-bold text-brand-dark mb-2 break-words">
              Acompanhamento de Motoristas
            </h1>
            <p className="text-gray-600">
              Faça login para acessar o sistema
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <Input
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              disabled={isLoading}
            />

            {/* O botão do olho ancora no rodapé do contêiner (o <input> é o último filho do campo): alinha ao input, não ao label */}
            <div className="relative">
              <Input
                label="Senha"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
                disabled={isLoading}
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                disabled={isLoading}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                className="absolute bottom-0 right-0 inline-flex h-11 w-11 items-center justify-center rounded-brand text-gray-500 hover:text-brand-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent disabled:opacity-50"
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-brand">
                <Icon name="alert-circle" className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
                <p className="min-w-0 break-words text-red-700 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Icon name="loader-2" className="h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <Icon name="login" className="h-5 w-5" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Apenas usuários autorizados podem acessar este sistema
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Login; 