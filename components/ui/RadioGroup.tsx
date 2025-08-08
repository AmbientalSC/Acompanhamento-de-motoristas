import React, { useState, useEffect } from 'react';
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
  // Estado interno para controlar o valor selecionado
  const [selectedValue, setSelectedValue] = useState<string>(value || '');
  
  // Sincronizar com prop value quando mudada externamente
  useEffect(() => {
    setSelectedValue(value || '');
  }, [value]);

  // Filtrar opções vazias
  const validOptions = options.filter(option => 
    option.value && option.label && option.value.trim() !== '' && option.label.trim() !== ''
  );

  const handleOptionClick = (optionValue: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Atualizar estado interno imediatamente
    setSelectedValue(optionValue);
    
    // Notificar componente pai
    onChange(optionValue);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSelectedValue(newValue);
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
          const uniqueId = `${name}-${index}-${option.value.replace(/[^a-zA-Z0-9]/g, '')}`;
          const isSelected = selectedValue === option.value;
          
          return (
            <div 
              key={index} 
              className="flex items-center space-x-2 cursor-pointer"
              onClick={(e) => handleOptionClick(option.value, e)}
            >
              <input
                type="radio"
                id={uniqueId}
                name={`radiogroup-${name}`}
                value={option.value}
                checked={isSelected}
                onChange={handleInputChange}
                className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 cursor-pointer"
                required={required}
              />
              <label 
                htmlFor={uniqueId} 
                className="text-sm text-gray-700 cursor-pointer flex-1"
                onClick={(e) => e.preventDefault()}
              >
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
