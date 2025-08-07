import React from 'react';

interface DateInputProps {
  label: string;
  name: string;
  value?: string;
  onChange: (value: string) => void;
  required?: boolean;
  description?: string;
  placeholder?: string;
  className?: string;
  min?: string;
  max?: string;
}

const DateInput: React.FC<DateInputProps> = ({
  label,
  name,
  value,
  onChange,
  required = false,
  description,
  placeholder,
  className = '',
  min,
  max
}) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {description && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      
      <input
        type="date"
        id={name}
        name={name}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        min={min}
        max={max}
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
      />
    </div>
  );
};

export default DateInput;
