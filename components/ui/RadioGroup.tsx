import React, { useId } from 'react';
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
  // Usar useId para garantir nome único estável para o grupo
  const groupId = useId();
  const uniqueName = `radiogroup-${name}-${groupId}`;
  
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
        {options.map((option, index) => {
          const inputId = `${uniqueName}-option-${index}`;
          return (
            <label key={`${name}-${option.value}-${index}`} htmlFor={inputId} className="flex items-center space-x-2 cursor-pointer">
              <input
                id={inputId}
                type="radio"
                name={uniqueName}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange(e.target.value)}
                className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300"
                required={required}
              />
              <span className="text-sm text-gray-700">{option.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

export default RadioGroup;
