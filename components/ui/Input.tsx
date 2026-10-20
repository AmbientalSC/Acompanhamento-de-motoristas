import React, { useId } from 'react';
import { FIELD_CLASSES, LABEL_CLASSES } from './fieldStyles';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  // Classes do contêiner (label + campo); `className` vai para o <input>
  wrapperClassName?: string;
}

const Input: React.FC<InputProps> = ({ label, name, id, className = '', wrapperClassName = '', ...props }) => {
  const generatedId = useId();
  const inputId = id ?? name ?? generatedId;

  return (
    <div className={wrapperClassName}>
      <label htmlFor={inputId} className={LABEL_CLASSES}>
        {label}
      </label>
      <input id={inputId} name={name} className={`${FIELD_CLASSES} ${className}`} {...props} />
    </div>
  );
};

export default Input;
