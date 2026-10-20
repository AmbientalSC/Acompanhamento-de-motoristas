import React from 'react';
import { ChevronDown, ChevronUp, GripVertical, ImagePlus, PlusCircle, Trash2 } from 'lucide-react';
import type { EvaluationCriterion, FieldType } from '../../types';
import { TEMPLATE_IMAGE_ACCEPTED_TYPES, TEMPLATE_IMAGE_MAX_SIZE_MB } from '../../services/templateImageService';
import { supportsAnswerKey } from '../../utils/gradingUtils';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';

export interface CriterionEditorProps {
  criterion: EvaluationCriterion;
  index: number;
  total: number;
  // Pré-visualização de uma imagem escolhida e ainda não enviada ao Storage
  pendingImagePreview?: string;
  onChange: (index: number, field: keyof EvaluationCriterion, value: any) => void;
  onOptionAdd: (index: number) => void;
  onOptionRemove: (index: number, optionIndex: number) => void;
  onOptionChange: (index: number, optionIndex: number, field: 'label' | 'value', value: string) => void;
  onImageSelect: (index: number, file: File) => void;
  onImageRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
}

const hasOptions = (type: FieldType | undefined): boolean => type === 'radio' || type === 'number';

const CriterionEditor: React.FC<CriterionEditorProps> = ({
  criterion,
  index,
  total,
  pendingImagePreview,
  onChange,
  onOptionAdd,
  onOptionRemove,
  onOptionChange,
  onImageSelect,
  onImageRemove,
  onMoveUp,
  onMoveDown,
  onRemove,
}) => {
  const type = criterion.type || 'rating';
  const isNumber = type === 'number';
  const imagePreview = pendingImagePreview || criterion.imageUrl || '';
  const radioOptionsWithValue = (criterion.options || []).filter(option => option.value.trim());

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (file) {
      onImageSelect(index, file);
    }
  };

  return (
    <div className="p-4 rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-3 mb-4">
        <div className="flex items-center justify-center w-8 h-8 text-gray-400 mt-1">
          <GripVertical className="h-5 w-5" />
        </div>
        <div className="flex-grow space-y-4">
          {/* Nome do Campo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome do Campo"
              value={criterion.name}
              onChange={(e) => onChange(index, 'name', e.target.value)}
              placeholder="Ex: Estado do veículo"
              required
            />
            <Select
              label="Tipo do Campo"
              value={type}
              onChange={(e) => onChange(index, 'type', e.target.value as FieldType)}
              required
            >
              <option value="rating">Avaliação (1-10)</option>
              <option value="rating-5">Avaliação (1-5)</option>
              <option value="text">Texto</option>
              <option value="number">Número</option>
              <option value="radio">Múltipla Escolha</option>
              <option value="date">Data</option>
              <option value="checkbox">Checkbox</option>
            </Select>
          </div>

          {/* Configurações específicas por tipo */}
          {(type === 'text' || type === 'date' || type === 'number') && (
            <Input
              label="Placeholder"
              value={criterion.placeholder || ''}
              onChange={(e) => onChange(index, 'placeholder', e.target.value)}
              placeholder="Texto de exemplo para o usuário"
            />
          )}

          {hasOptions(type) && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-1">
                {isNumber ? 'Opções da lista suspensa (legenda)' : 'Opções de Múltipla Escolha'}
              </h4>
              {isNumber && (
                <p className="text-xs text-gray-500 mb-2">
                  Aparecem ao clicar na imagem. O motorista digita o número correspondente à resposta.
                </p>
              )}
              <div className="space-y-2">
                {(criterion.options || [{ label: '', value: '' }]).map((option, optionIndex) => (
                  <div key={optionIndex} className="flex gap-2">
                    <Input
                      label={`Opção ${optionIndex + 1} - Texto`}
                      value={option.label}
                      onChange={(e) => onOptionChange(index, optionIndex, 'label', e.target.value)}
                      placeholder={isNumber ? 'Ex: Freio de serviço' : 'Ex: Excelente'}
                      className="flex-1"
                    />
                    <Input
                      label={isNumber ? `Opção ${optionIndex + 1} - Número` : `Opção ${optionIndex + 1} - Valor`}
                      value={option.value}
                      onChange={(e) => onOptionChange(index, optionIndex, 'value', e.target.value)}
                      placeholder={isNumber ? 'Ex: 1' : 'Ex: excelente'}
                      inputMode={isNumber ? 'decimal' : undefined}
                      className="flex-1"
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={() => onOptionRemove(index, optionIndex)}
                        variant="secondary"
                        className="!py-2 !px-3 !bg-red-100 !text-red-700 hover:!bg-red-200"
                        disabled={(criterion.options?.length || 0) <= 1}
                        aria-label="Remover opção"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  onClick={() => onOptionAdd(index)}
                  variant="secondary"
                  className="!py-1 !px-3 text-sm"
                >
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Adicionar Opção
                </Button>
              </div>
            </div>
          )}

          {/* Imagem da pergunta */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">Imagem da pergunta (opcional)</h4>
            <p className="text-xs text-gray-500 mb-2">
              Exibida acima do campo. JPG, PNG ou WebP, até {TEMPLATE_IMAGE_MAX_SIZE_MB} MB.
            </p>
            {imagePreview && (
              <img
                src={imagePreview}
                alt={`Imagem da pergunta ${criterion.name || index + 1}`}
                className="max-h-40 mb-2 rounded-md border border-gray-200 object-contain bg-white"
              />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md cursor-pointer text-brand-primary bg-blue-100 hover:bg-blue-200 focus-within:ring-2 focus-within:ring-brand-accent">
                <ImagePlus className="h-4 w-4 mr-1" />
                {imagePreview ? 'Trocar imagem' : 'Escolher imagem'}
                <input
                  type="file"
                  accept={TEMPLATE_IMAGE_ACCEPTED_TYPES.join(',')}
                  onChange={handleImageChange}
                  className="sr-only"
                />
              </label>
              {imagePreview && (
                <Button
                  type="button"
                  onClick={() => onImageRemove(index)}
                  variant="secondary"
                  className="!py-1.5 !px-3 text-sm !bg-red-100 !text-red-700 hover:!bg-red-200"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remover imagem
                </Button>
              )}
              {pendingImagePreview && (
                <span className="text-xs text-gray-500">A imagem será enviada ao salvar o modelo.</span>
              )}
            </div>
          </div>

          {/* Gabarito */}
          {supportsAnswerKey(type) && (
            <div>
              {type === 'radio' ? (
                <Select
                  label="Resposta correta (gabarito, opcional)"
                  value={criterion.correctAnswer || ''}
                  onChange={(e) => onChange(index, 'correctAnswer', e.target.value)}
                >
                  <option value="">Sem gabarito</option>
                  {radioOptionsWithValue.map((option, optionIndex) => (
                    <option key={`${option.value}-${optionIndex}`} value={option.value}>
                      {option.label || option.value}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  label="Resposta correta (gabarito, opcional)"
                  type={isNumber ? 'number' : 'text'}
                  step={isNumber ? 'any' : undefined}
                  value={criterion.correctAnswer || ''}
                  onChange={(e) => onChange(index, 'correctAnswer', e.target.value)}
                  placeholder={isNumber ? 'Ex: 3' : 'Ex: resposta esperada (sem diferenciar maiúsculas/acentos)'}
                />
              )}
            </div>
          )}

          {/* Descrição/Ajuda */}
          <Input
            label="Descrição (opcional)"
            value={criterion.description || ''}
            onChange={(e) => onChange(index, 'description', e.target.value)}
            placeholder="Texto de ajuda para orientar o avaliador"
          />

          {/* Campo obrigatório */}
          <div className="flex items-center">
            <input
              id={`required-${index}`}
              type="checkbox"
              checked={criterion.required}
              onChange={(e) => onChange(index, 'required', e.target.checked)}
              className="h-4 w-4 text-brand-primary focus:ring-brand-accent border-gray-300 rounded"
            />
            <label htmlFor={`required-${index}`} className="ml-2 block text-sm text-gray-700">
              Campo obrigatório
            </label>
          </div>
        </div>

        {/* Botões de ação */}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Mover para cima"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
            className="p-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Mover para baixo"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Remover campo"
            disabled={total <= 1}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CriterionEditor;
