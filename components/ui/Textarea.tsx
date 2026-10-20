import React, { useId } from 'react';
import { FIELD_CLASSES, LABEL_CLASSES } from './fieldStyles';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  // Classes do contêiner (label + campo); `className` vai para o <textarea>
  wrapperClassName?: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, name, id, className = '', wrapperClassName = '', ...props }) => {
  const generatedId = useId();
  const textareaId = id ?? name ?? generatedId;

  return (
    <div className={wrapperClassName}>
      <label htmlFor={textareaId} className={LABEL_CLASSES}>
        {label}
      </label>
      <textarea id={textareaId} name={name} className={`${FIELD_CLASSES} ${className}`} {...props} />
    </div>
  );
};

export default Textarea;
