import React from 'react';
import type { EvaluationHeader } from '../../types';
import { SUBJECT_LABELS } from '../../utils/headerUtils';

interface HeaderSelectorProps {
  headers: EvaluationHeader[];
  // '' = sem cabeçalho
  value: string;
  onChange: (headerId: string) => void;
}

interface OptionCardProps {
  isSelected: boolean;
  title: string;
  description: string;
  onSelect: () => void;
}

const OptionCard: React.FC<OptionCardProps> = ({ isSelected, title, description, onSelect }) => (
  <label className={`flex items-start p-3 min-h-11 rounded-brand border cursor-pointer transition-colors ${
    isSelected ? 'border-brand-primary bg-brand-light' : 'border-gray-200 hover:bg-gray-100'
  }`}>
    <input
      type="radio"
      name="headerId"
      checked={isSelected}
      onChange={onSelect}
      className="mt-0.5 h-5 w-5 flex-shrink-0 accent-brand-primary"
    />
    <div className="ml-3 min-w-0">
      <span className="text-sm font-medium text-gray-700 break-words">{title}</span>
      <span className="block text-xs text-gray-500 break-words">{description}</span>
    </div>
  </label>
);

const describeHeader = (header: EvaluationHeader): string => {
  const fields = header.fields.map(field => field.label).join(', ');
  const average = header.computesAverage ? 'com média geral' : 'sem média geral';
  return `${SUBJECT_LABELS[header.subject]}, ${average}. Campos: ${fields}.`;
};

// Escolha do cabeçalho do modelo; os cabeçalhos são criados e editados na aba "Cabeçalhos"
const HeaderSelector: React.FC<HeaderSelectorProps> = ({ headers, value, onChange }) => (
  <div>
    <p className="text-sm font-medium text-gray-700 mb-1">Cabeçalho</p>
    <p className="text-xs text-gray-500 mb-3">Para criar ou alterar um cabeçalho, use a aba "Cabeçalhos".</p>
    <div className="space-y-2">
      <OptionCard
        isSelected={value === ''}
        title="Sem cabeçalho"
        description="Apenas os campos do formulário, sem dados de identificação. Ideal para pesquisas e formulários simples."
        onSelect={() => onChange('')}
      />
      {headers.map(header => (
        <OptionCard
          key={header.id}
          isSelected={value === header.id}
          title={header.name}
          description={describeHeader(header)}
          onSelect={() => onChange(header.id)}
        />
      ))}
    </div>
  </div>
);

export default HeaderSelector;
