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
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-start space-x-2">
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required={required}
          className="mt-1 h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded"
        />
        <div className="flex-1">
          <label htmlFor={name} className="block text-sm font-medium text-gray-700 cursor-pointer">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          
          {description && (
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Checkbox;
