import React from 'react';

interface CheckboxProps {
  label: string;
  name: string;
  checked?: boolean;
  onChange: (checked: boolean) => void;
  required?: boolean;
  description?: string;
  className?: string;
}

// A linha inteira é o <label>: o toque em qualquer ponto marca/desmarca (alvo >= 44px).
const Checkbox: React.FC<CheckboxProps> = ({
  label,
  name,
  checked = false,
  onChange,
  required = false,
  description,
  className = ''
}) => {
  return (
    <label htmlFor={name} className={`flex items-start gap-3 min-h-11 py-2 cursor-pointer ${className}`}>
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        required={required}
        className="mt-0.5 h-5 w-5 flex-shrink-0 accent-brand-primary"
      />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-700 break-words">
          {label}
          {required && <span className="text-red-600 ml-1" aria-hidden="true">*</span>}
        </span>
        {description && (
          <span className="block text-sm text-gray-500 mt-1">{description}</span>
        )}
      </span>
    </label>
  );
};

export default Checkbox;
