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
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      
      <div className="space-y-2">
        {validOptions.map((option, index) => {
          const uniqueId = `radio-${name}-${index}`;
          const isSelected = value === option.value;
          
          return (
            <div key={`${name}-${index}`} className="flex items-center space-x-2">
              <input
                type="radio"
                id={uniqueId}
                name={`radiogroup-${name}`}
                value={option.value}
                checked={isSelected}
                onChange={() => handleChange(option.value)}
                className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300"
                required={required}
              />
              <label htmlFor={uniqueId} className="text-sm text-gray-700 cursor-pointer">
                {option.label}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RadioGroup;
