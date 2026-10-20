import React, { useId } from 'react';
import { FIELD_CLASSES, LABEL_CLASSES } from './fieldStyles';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: React.ReactNode;
  // Classes do contêiner (label + campo); `className` vai para o <select>
  wrapperClassName?: string;
}

const Select: React.FC<SelectProps> = ({ label, name, id, children, className = '', wrapperClassName = '', ...props }) => {
  const generatedId = useId();
  const selectId = id ?? name ?? generatedId;

  return (
    <div className={wrapperClassName}>
      <label htmlFor={selectId} className={LABEL_CLASSES}>
        {label}
      </label>
      <select id={selectId} name={name} className={`${FIELD_CLASSES} ${className}`} {...props}>
        {children}
      </select>
    </div>
  );
};

export default Select;
