import React from 'react';
import Icon from './Icon';
import type { IconName } from './iconNames';

interface ActionIconButtonProps {
  icon: IconName;
  label: string;
  tone?: 'neutral' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}

// Botão só de ícone: alvo de 44px no celular, aria-label + title para leitores de tela e dica ao segurar.
const ACTION_TONES: Record<NonNullable<ActionIconButtonProps['tone']>, string> = {
  neutral: 'bg-brand-gray text-brand-primary hover:bg-brand-light',
  danger: 'bg-red-100 text-red-700 hover:bg-red-200',
};

const ActionIconButton: React.FC<ActionIconButtonProps> = ({ icon, label, tone = 'neutral', disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-brand transition-colors sm:h-9 sm:w-9 ${ACTION_TONES[tone]} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-40`}
  >
    <Icon name={icon} className="h-5 w-5" />
  </button>
);

export default ActionIconButton;
