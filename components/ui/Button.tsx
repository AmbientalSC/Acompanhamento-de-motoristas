
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'text-white bg-brand-primary hover:bg-brand-secondary focus:ring-brand-accent',
    secondary: 'text-brand-primary bg-blue-100 hover:bg-blue-200 focus:ring-brand-accent',
  };

  return (
    <button
      type="button"
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
