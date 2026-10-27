import React from 'react';
import type { EvaluationHeader, HeaderField } from '../../types';
import { applyPhoneMask } from '../../utils/mn10FieldUtils';
import { PHONE_PATTERN } from '../../utils/headerUtils';
import Input from '../ui/Input';
import Select from '../ui/Select';

interface HeaderFormFieldsProps {
  header: EvaluationHeader;
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
  branches: string[];
  isLoadingBranches: boolean;
}

// Mais de 4 campos: grade de 4 colunas no desktop (como o antigo cabeçalho de avaliação); senão 3
const gridColumns = (count: number): string =>
  count > 4 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3';

interface HeaderInputProps {
  field: HeaderField;
  value: string;
  onChange: (value: string) => void;
  branches: string[];
  isLoadingBranches: boolean;
}

const HeaderInput: React.FC<HeaderInputProps> = ({ field, value, onChange, branches, isLoadingBranches }) => {
  // Prefixo evita colisão de ids com os campos do formulário (ex.: "data")
  const name = `header-${field.id}`;

  if (field.type === 'branch' || field.type === 'select') {
    const options = field.type === 'branch' ? branches : field.options;
    return (
      <Select
        label={field.label}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={field.required}
        disabled={field.type === 'branch' && isLoadingBranches}
      >
        <option value="">{field.type === 'branch' ? 'Selecione a filial' : 'Selecione...'}</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </Select>
    );
  }

  if (field.type === 'phone') {
    return (
      <Input
        label={field.label}
        name={name}
        type="tel"
        inputMode="numeric"
        autoComplete="off"
        placeholder="(xx)xxxxxxxxx"
        pattern={PHONE_PATTERN}
        title="Telefone com DDD, no formato (48)999999999"
        value={value}
        onChange={(e) => onChange(applyPhoneMask(e.target.value))}
        required={field.required}
      />
    );
  }

  const isPerson = field.role === 'person';
  return (
    <Input
      label={field.label}
      name={name}
      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
      inputMode={field.type === 'number' ? 'decimal' : undefined}
      autoComplete="off"
      autoCapitalize={isPerson ? 'characters' : undefined}
      className={isPerson ? 'uppercase' : ''}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={field.required}
    />
  );
};

// Cabeçalho do formulário de avaliação montado a partir da configuração do cabeçalho do modelo
const HeaderFormFields: React.FC<HeaderFormFieldsProps> = ({ header, values, onChange, branches, isLoadingBranches }) => (
  <div className="p-4 sm:p-6">
    <h3 className="text-lg sm:text-xl font-bold text-brand-dark mb-4 sm:mb-6">{header.name}</h3>
    <div className={`grid grid-cols-1 ${gridColumns(header.fields.length)} gap-4 sm:gap-6`}>
      {header.fields.map(field => (
        <HeaderInput
          key={field.id}
          field={field}
          value={values[field.id] ?? ''}
          onChange={(value) => onChange(field.id, value)}
          branches={branches}
          isLoadingBranches={isLoadingBranches}
        />
      ))}
    </div>
  </div>
);

export default HeaderFormFields;
