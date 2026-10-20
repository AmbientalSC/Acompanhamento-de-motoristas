import React from 'react';
import type { IconName } from './iconNames';

interface IconProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  name: IconName;
  // Só para ícone sem texto ao lado (ex.: botão só de ícone usa aria-label no botão; aqui, ícone informativo)
  label?: string;
}

// Ícone Tabler (outline) via máscara CSS: herda `currentColor`. Tamanho por classes (h-4 w-4) ou `--ti-size`.
const Icon: React.FC<IconProps> = ({ name, label, className = '', ...props }) => (
  <span
    className={`ti ti-${name} ${className}`}
    role={label ? 'img' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
    {...props}
  />
);

export default Icon;
