import React from 'react';
import { RadioOption } from '../../types';

interface RadioGroupProps {
  label: string;
  name: string;
  options: RadioOption[];
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  description?: string;
  className?: string;
}

const RadioGroup: React.FC<RadioGroupProps> = ({
  label,
  name,
  options,
  value,
  onChange,
  required = false,
  description,
  className = ''
}) => {
  // Filtrar opções vazias
  const validOptions = options.filter(option =>
    option.value && option.label && option.value.trim() !== '' && option.label.trim() !== ''
  );

  const handleChange = (optionValue: string) => {
    // Só chamar onChange se o valor realmente mudou
    if (value !== optionValue) {
      onChange(optionValue);
    }
  };

  return (
    <fieldset className={`space-y-2 min-w-0 ${className}`}>
      <legend className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-600 ml-1" aria-hidden="true">*</span>}
      </legend>

      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}

      <div className="space-y-2">
        {validOptions.map((option, index) => {
          const uniqueId = `radio-${name}-${index}`;
          const isSelected = value === option.value;

          return (
            <label
              key={`${name}-${index}`}
              htmlFor={uniqueId}
              className={`flex items-center gap-3 min-h-11 px-3 py-2 rounded-brand border cursor-pointer transition-colors ${
                isSelected
                  ? 'border-brand-primary bg-brand-light'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                id={uniqueId}
                name={`radiogroup-${name}`}
                value={option.value}
                checked={isSelected}
                onChange={() => handleChange(option.value)}
                className="h-5 w-5 flex-shrink-0 accent-brand-primary"
                required={required}
              />
              <span className="text-sm text-gray-700 break-words min-w-0">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
};

export default RadioGroup;
