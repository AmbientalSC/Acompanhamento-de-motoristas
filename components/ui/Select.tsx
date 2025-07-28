
import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ label, name, children, ...props }) => {
  return (
    <div>
      <label htmlFor={name} className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <select
        id={name}
        name={name}
        className="block w-full px-2 sm:px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-brand-accent focus:border-brand-accent text-xs sm:text-sm"
        {...props}
      >
        {children}
      </select>
    </div>
  );
};

export default Select;
