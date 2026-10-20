import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'onDark';
type ButtonSize = 'md' | 'sm';

interface ButtonProps extends React.ComponentPropsWithRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

// Alvo de toque >= 44px no celular (min-h-11); a partir de `sm` o botão volta ao tamanho do conteúdo.
const BASE_CLASSES =
  'inline-flex items-center justify-center gap-2 border border-transparent rounded-brand font-semibold ' +
  'min-h-11 sm:min-h-0 select-none transition-colors duration-150 active:scale-[0.98] ' +
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary ' +
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

const SIZE_CLASSES: Record<ButtonSize, string> = {
  md: 'px-4 py-2 sm:py-2.5 text-base',
  sm: 'px-3 py-1.5 text-sm',
};

// O CTA principal é verde lima (identidade Ambiental) com texto azul escuro: branco sobre #A8C950 não passa no contraste.
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-green text-brand-secondary hover:bg-brand-green-dark',
  secondary: 'bg-brand-light text-brand-primary hover:bg-[#D9E3F5]',
  danger: 'bg-red-100 text-red-700 hover:bg-red-200',
  ghost: 'bg-transparent text-brand-primary hover:bg-brand-light',
  onDark: 'bg-white text-brand-primary hover:bg-brand-light',
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) => (
  <button
    type={type}
    className={`${BASE_CLASSES} ${SIZE_CLASSES[size]} ${VARIANT_CLASSES[variant]} ${className}`}
    {...props}
  >
    {children}
  </button>
);

export default Button;
