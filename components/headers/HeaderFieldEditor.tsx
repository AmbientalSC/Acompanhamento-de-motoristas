import React from 'react';
import type { HeaderField, HeaderFieldRole, HeaderFieldType } from '../../types';
import {
  CUSTOM_FIELD_TYPES,
  HEADER_FIELD_TYPE_LABELS,
  HEADER_ROLES,
  HEADER_ROLE_ORDER,
  REQUIRED_ROLES,
} from '../../utils/headerUtils';
import ActionIconButton from '../ui/ActionIconButton';
import Checkbox from '../ui/Checkbox';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';

interface HeaderFieldEditorProps {
  field: HeaderField;
  index: number;
  total: number;
  onChange: (index: number, field: HeaderField) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
}

// Trocar o papel ajusta tipo, opções e obrigatoriedade; o rótulo só muda se ainda era o rótulo padrão do papel anterior
const changeRole = (field: HeaderField, role: HeaderFieldRole): HeaderField => {
  const config = HEADER_ROLES[role];
  const previous = HEADER_ROLES[field.role];
  const keepsLabel = field.label.trim() !== '' && field.label !== previous.label;
  const type = config.type ?? (CUSTOM_FIELD_TYPES.includes(field.type) ? field.type : 'text');
  return {
    ...field,
    role,
    type,
    label: keepsLabel ? field.label : role === 'custom' ? '' : config.label,
    options: type === 'select' ? (config.defaultOptions ?? field.options) : [],
    required: REQUIRED_ROLES.includes(role) || field.required,
  };
};

const ROLE_HINTS: Partial<Record<HeaderFieldRole, string>> = {
  person: 'Nome usado para agrupar as avaliações na Análise por Motorista. Sempre obrigatório.',
  date: 'Data da avaliação, usada nos filtros e na ordenação. Sempre obrigatória.',
  branch: 'Lista das filiais cadastradas; alimenta o filtro e o gráfico por filial.',
  custom: 'Aparece no formulário, nos detalhes e no PDF, mas não entra nos filtros dos dashboards.',
};

const HeaderFieldEditor: React.FC<HeaderFieldEditorProps> = ({ field, index, total, onChange, onMoveUp, onMoveDown, onRemove }) => {
  const isAlwaysRequired = REQUIRED_ROLES.includes(field.role);
  const isCustom = field.role === 'custom';
  const update = (patch: Partial<HeaderField>) => onChange(index, { ...field, ...patch });

  return (
    <div className="p-4 rounded-md border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h4 className="min-w-0 text-sm font-semibold text-brand-dark">
          Campo {index + 1} <span className="font-normal text-gray-500">de {total}</span>
        </h4>
        <div className="flex flex-shrink-0 items-center gap-1">
          <ActionIconButton icon="chevron-up" label="Mover campo para cima" onClick={() => onMoveUp(index)} disabled={index === 0} />
          <ActionIconButton icon="chevron-down" label="Mover campo para baixo" onClick={() => onMoveDown(index)} disabled={index === total - 1} />
          <span className="ml-1 border-l border-gray-200 pl-2">
            <ActionIconButton icon="trash" label="Remover campo" tone="danger" onClick={() => onRemove(index)} disabled={total <= 1} />
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Rótulo do campo"
            value={field.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Ex: Nome do Candidato"
            required
          />
          <Select
            label="Papel"
            value={field.role}
            onChange={(e) => onChange(index, changeRole(field, e.target.value as HeaderFieldRole))}
          >
            {HEADER_ROLE_ORDER.map(role => (
              <option key={role} value={role}>{HEADER_ROLES[role].label}</option>
            ))}
          </Select>
          <Select
            label="Tipo"
            value={field.type}
            onChange={(e) => {
              const type = e.target.value as HeaderFieldType;
              update({ type, options: type === 'select' ? field.options : [] });
            }}
            disabled={!isCustom}
            title={isCustom ? undefined : 'O tipo é definido pelo papel do campo'}
          >
            {(isCustom ? CUSTOM_FIELD_TYPES : [field.type]).map(type => (
              <option key={type} value={type}>{HEADER_FIELD_TYPE_LABELS[type]}</option>
            ))}
          </Select>
        </div>

        {ROLE_HINTS[field.role] && <p className="text-xs text-gray-500">{ROLE_HINTS[field.role]}</p>}

        {field.type === 'select' && (
          <Textarea
            label="Opções (uma por linha)"
            value={field.options.join('\n')}
            onChange={(e) => update({ options: e.target.value.split('\n') })}
            rows={3}
            required
          />
        )}

        {!isAlwaysRequired && (
          <Checkbox
            label="Campo obrigatório"
            name={`header-field-required-${field.id}`}
            checked={field.required}
            onChange={(required) => update({ required })}
          />
        )}
      </div>
    </div>
  );
};

export default HeaderFieldEditor;
