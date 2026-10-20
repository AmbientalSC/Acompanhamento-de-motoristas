import React from 'react';
import Icon from '../ui/Icon';
import type { IconName } from '../ui/iconNames';
import type { EvaluationCriterion, FieldType } from '../../types';
import { TEMPLATE_IMAGE_ACCEPTED_TYPES, TEMPLATE_IMAGE_MAX_SIZE_MB } from '../../services/templateImageService';
import { supportsAnswerKey } from '../../utils/gradingUtils';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
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

interface ActionIconButtonProps {
  icon: IconName;
  label: string;
  tone?: 'neutral' | 'danger';
  disabled?: boolean;
  onClick: () => void;
}

// Botão só de ícone: alvo de 44px no celular, aria-label + title para leitores de tela e dica ao segurar.
const ACTION_TONES: Record<NonNullable<ActionIconButtonProps['tone']>, string> = {
  neutral: 'bg-brand-gray text-brand-primary hover:bg-brand-light',
  danger: 'bg-red-100 text-red-700 hover:bg-red-200',
};

const ActionIconButton: React.FC<ActionIconButtonProps> = ({ icon, label, tone = 'neutral', disabled, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    title={label}
    className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-brand transition-colors sm:h-9 sm:w-9 ${ACTION_TONES[tone]} focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary disabled:cursor-not-allowed disabled:opacity-40`}
  >
    <Icon name={icon} className="h-5 w-5" />
  </button>
);

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
    <div className="p-4 rounded-md border border-gray-200 bg-white">
      {/* Cabeçalho: posição do campo + ações (mover / remover) */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <h4 className="min-w-0 text-sm font-semibold text-brand-dark">
          Campo {index + 1} <span className="font-normal text-gray-500">de {total}</span>
        </h4>
        <div className="flex flex-shrink-0 items-center gap-1">
          <ActionIconButton
            icon="chevron-up"
            label="Mover campo para cima"
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
          />
          <ActionIconButton
            icon="chevron-down"
            label="Mover campo para baixo"
            onClick={() => onMoveDown(index)}
            disabled={index === total - 1}
          />
          <span className="ml-1 border-l border-gray-200 pl-2">
            <ActionIconButton
              icon="trash"
              label="Remover campo"
              tone="danger"
              onClick={() => onRemove(index)}
              disabled={total <= 1}
            />
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Nome e tipo do campo */}
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
                Aparecem em "Ver opções" e junto da imagem ampliada. O motorista digita o número correspondente à resposta.
              </p>
            )}
            <div className="space-y-3 sm:space-y-2">
              {(criterion.options || [{ label: '', value: '' }]).map((option, optionIndex) => (
                <div
                  key={optionIndex}
                  className="grid grid-cols-1 gap-3 rounded-brand border border-gray-200 bg-brand-gray p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0"
                >
                  <Input
                    label={`Opção ${optionIndex + 1} - Texto`}
                    value={option.label}
                    onChange={(e) => onOptionChange(index, optionIndex, 'label', e.target.value)}
                    placeholder={isNumber ? 'Ex: Freio de serviço' : 'Ex: Excelente'}
                    wrapperClassName="min-w-0"
                  />
                  <Input
                    label={isNumber ? `Opção ${optionIndex + 1} - Número` : `Opção ${optionIndex + 1} - Valor`}
                    value={option.value}
                    onChange={(e) => onOptionChange(index, optionIndex, 'value', e.target.value)}
                    placeholder={isNumber ? 'Ex: 1' : 'Ex: excelente'}
                    inputMode={isNumber ? 'decimal' : undefined}
                    wrapperClassName="min-w-0"
                  />
                  <Button
                    onClick={() => onOptionRemove(index, optionIndex)}
                    variant="danger"
                    size="sm"
                    className="w-full sm:h-11 sm:w-11 sm:px-0"
                    disabled={(criterion.options?.length || 0) <= 1}
                    aria-label={`Remover opção ${optionIndex + 1}`}
                    title="Remover opção"
                  >
                    <Icon name="trash" className="h-4 w-4" />
                    <span className="sm:hidden">Remover opção</span>
                  </Button>
                </div>
              ))}
              <Button
                onClick={() => onOptionAdd(index)}
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Icon name="circle-plus" className="h-4 w-4" />
                Adicionar opção
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
              className="mb-3 h-auto max-h-48 w-full rounded-brand border border-gray-200 bg-white object-contain sm:max-h-40 sm:w-auto sm:max-w-full"
            />
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="inline-flex min-h-11 w-full cursor-pointer select-none items-center justify-center gap-2 rounded-brand bg-brand-light px-3 py-1.5 text-sm font-semibold text-brand-primary transition-colors hover:bg-[#D9E3F5] focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2 sm:w-auto">
              <Icon name="photo-plus" className="h-4 w-4" />
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
                onClick={() => onImageRemove(index)}
                variant="danger"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Icon name="trash" className="h-4 w-4" />
                Remover imagem
              </Button>
            )}
          </div>
          {pendingImagePreview && (
            <p className="mt-2 text-xs text-gray-500">A imagem será enviada ao salvar o modelo.</p>
          )}
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
              <>
                <Input
                  label="Resposta correta (gabarito, opcional)"
                  type={isNumber ? 'number' : 'text'}
                  step={isNumber ? 'any' : undefined}
                  inputMode={isNumber ? 'decimal' : undefined}
                  value={criterion.correctAnswer || ''}
                  onChange={(e) => onChange(index, 'correctAnswer', e.target.value)}
                  placeholder={isNumber ? 'Ex: 3' : 'Ex: resposta esperada'}
                />
                {!isNumber && (
                  <p className="mt-1 text-xs text-gray-500">Não diferencia maiúsculas, minúsculas nem acentos.</p>
                )}
              </>
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
        <Checkbox
          label="Campo obrigatório"
          name={`required-${index}`}
          checked={criterion.required}
          onChange={(checked) => onChange(index, 'required', checked)}
        />
      </div>
    </div>
  );
};

export default CriterionEditor;
