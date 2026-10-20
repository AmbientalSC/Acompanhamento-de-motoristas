import React from 'react';
import { EvaluationCriterion } from '../../types';
import Input from './Input';
import RadioGroup from './RadioGroup';
import DateInput from './DateInput';
import Checkbox from './Checkbox';
import RatingSlider from '../RatingSlider';
import RatingSlider5 from './RatingSlider5';
import QuestionImage from './QuestionImage';
import Icon from './Icon';

interface DynamicFieldProps {
  criterion: EvaluationCriterion;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

const DynamicField: React.FC<DynamicFieldProps> = ({
  criterion,
  value,
  onChange,
  error
}) => {
  const { type, name, required, options, placeholder, description, imageUrl } = criterion;
  const hasNumberLegend = type === 'number' && (options ?? []).some(option => option.label.trim() || option.value.trim());

  const renderField = () => {
    switch (type) {
      case 'rating':
        return (
          <div className="space-y-2">
            {description && (
              <p className="text-sm text-gray-500 break-words">{description}</p>
            )}
            <RatingSlider
              label={name}
              value={value ?? null}
              onChange={onChange}
              required={required}
            />
          </div>
        );

      case 'rating-5':
        return (
          <div className="space-y-2">
            {description && (
              <p className="text-sm text-gray-500 break-words">{description}</p>
            )}
            <RatingSlider5
              label={name}
              value={value ?? null}
              onChange={onChange}
              required={required}
            />
          </div>
        );

      case 'text':
        return (
          <div className="space-y-2">
            <Input
              label={name}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              required={required}
              placeholder={placeholder}
            />
            {description && (
              <p className="text-sm text-gray-500 break-words">{description}</p>
            )}
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Input
              label={name}
              name={criterion.id}
              type="number"
              inputMode="decimal"
              step="any"
              value={value ?? ''}
              onChange={(e) => onChange(e.target.value)}
              required={required}
              placeholder={placeholder || 'Digite o número'}
            />
            {description && (
              <p className="text-sm text-gray-500 break-words">{description}</p>
            )}
          </div>
        );

      case 'radio':
        return (
          <RadioGroup
            label={name}
            name={criterion.id}
            options={options || []}
            value={value || ''}
            onChange={(newValue) => {
              onChange(newValue);
            }}
            required={required}
            description={description}
          />
        );

      case 'date':
        return (
          <DateInput
            label={name}
            name={criterion.id}
            value={value || ''}
            onChange={onChange}
            required={required}
            placeholder={placeholder}
            description={description}
          />
        );

      case 'checkbox':
        return (
          <Checkbox
            label={name}
            name={criterion.id}
            checked={value || false}
            onChange={onChange}
            required={required}
            description={description}
          />
        );

      default:
        return null;
    }
  };

  return (
    // scroll-mt: ao rolar até o campo com erro, o cabeçalho fixo do App não pode cobri-lo
    <div id={`field-${criterion.id}`} className="min-w-0 scroll-mt-20 space-y-2">
      {(imageUrl || hasNumberLegend) && (
        <QuestionImage
          src={imageUrl || undefined}
          alt={name}
          options={type === 'number' ? options : undefined}
        />
      )}
      {renderField()}
      {error && (
        <p role="alert" className="flex items-start gap-1.5 text-sm font-medium text-red-700">
          <Icon name="alert-circle" className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </p>
      )}
    </div>
  );
};

export default DynamicField;
