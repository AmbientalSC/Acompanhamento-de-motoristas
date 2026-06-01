import React from 'react';
import { EvaluationCriterion } from '../../types';
import Input from './Input';
import RadioGroup from './RadioGroup';
import DateInput from './DateInput';
import Checkbox from './Checkbox';
import RatingSlider from '../RatingSlider';
import RatingSlider5 from './RatingSlider5';

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
  const { type, name, required, options, placeholder, description } = criterion;

  const renderField = () => {
    switch (type) {
      case 'rating':
        return (
          <div className="space-y-2">
            {description && (
              <p className="text-sm text-gray-500 mb-2">{description}</p>
            )}
            <RatingSlider
              label={name}
              value={value || 0}
              onChange={onChange}
            />
            {required && value === 0 && (
              <p className="text-sm text-red-600">Este campo é obrigatório</p>
            )}
          </div>
        );

      case 'rating-5':
        return (
          <div className="space-y-2">
            {description && (
              <p className="text-sm text-gray-500 mb-2">{description}</p>
            )}
            <RatingSlider5
              label={name}
              value={value || 1}
              onChange={onChange}
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
              <p className="text-sm text-gray-500">{description}</p>
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
    <div className="space-y-1">
      {renderField()}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default DynamicField;
