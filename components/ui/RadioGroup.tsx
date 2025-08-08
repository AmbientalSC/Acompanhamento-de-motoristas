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
  // Filtrar opções vazias que podem causar problemas
  const validOptions = options.filter(option => 
    option.value !== '' && option.label !== '' && option.value !== undefined && option.label !== undefined
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    console.log(`RadioGroup [${name}] input changed to:`, newValue);
    onChange(newValue);
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
          const inputId = `${name}_${index}_${option.value}`;
          const isSelected = value === option.value;
          
          return (
            <div key={`${name}_${index}`} className="flex items-center space-x-2">
              <input
                type="radio"
                id={inputId}
                name={`radio_${name}`}
                value={option.value}
                checked={isSelected}
                onChange={handleInputChange}
                className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300"
                required={required}
              />
              <label htmlFor={inputId} className="text-sm text-gray-700 cursor-pointer">
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
