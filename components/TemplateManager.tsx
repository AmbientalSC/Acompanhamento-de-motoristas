import React, { useState, useEffect, useRef, useCallback } from 'react';
import Icon from './ui/Icon';
import type { IconName } from './ui/iconNames';
import type { EvaluationTemplate, EvaluationCriterion, FieldType, RadioOption, User } from '../types';
import { getTemplates, saveTemplate, updateTemplate, deleteTemplate, getBranches, saveBranch, deleteBranch, getUsers, saveUser, updateUser, deleteUser } from '../services/firebaseService';
import { deleteTemplateImage, uploadTemplateImage, validateTemplateImage } from '../services/templateImageService';
import { supportsAnswerKey } from '../utils/gradingUtils';
import { useAuth } from '../contexts/AuthContext';
import Card from './ui/Card';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import Checkbox from './ui/Checkbox';
import ConfirmDialog from './ui/ConfirmDialog';
import { FIELD_CLASSES } from './ui/fieldStyles';
import CriterionEditor from './templates/CriterionEditor';
import { exampleTemplates } from '../data/exampleTemplates';

type SubTab = 'models' | 'branches' | 'users' | 'forms';

// Confirmação pendente (substitui window.confirm): a ação roda ao confirmar e o diálogo mostra o carregamento.
interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'danger' | 'primary';
  action: () => Promise<void>;
}

interface SubTabButtonProps {
  label: string;
  icon: IconName;
  isActive: boolean;
  onSelect: () => void;
}

// Segmento de 44px+ (ícone sobre o rótulo no celular, lado a lado a partir de `sm`).
// Definido fora do TemplateManager para não remontar a cada render.
const SubTabButton: React.FC<SubTabButtonProps> = ({ label, icon, isActive, onSelect }) => (
  <button
    type="button"
    role="tab"
    aria-selected={isActive}
    onClick={onSelect}
    className={`flex min-h-[3.25rem] min-w-0 flex-col items-center justify-center gap-0.5 rounded-brand px-0.5 py-1.5 text-[11px] font-semibold leading-tight transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 sm:min-h-11 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${
      isActive ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-primary hover:bg-brand-light'
    }`}
  >
    <Icon name={icon} className="h-5 w-5 flex-shrink-0 sm:h-4 sm:w-4" />
    <span className="max-w-full truncate">{label}</span>
  </button>
);

type BadgeTone = 'green' | 'brand' | 'neutral' | 'solid' | 'amber' | 'red';

const BADGE_TONES: Record<BadgeTone, string> = {
  green: 'bg-green-100 text-green-800',
  brand: 'bg-brand-light text-brand-primary',
  neutral: 'bg-gray-100 text-gray-700',
  solid: 'bg-brand-primary text-white',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-800',
};

const Badge: React.FC<{ tone: BadgeTone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${BADGE_TONES[tone]}`}>
    {children}
  </span>
);

interface RowActionsProps {
  onEdit: () => void;
  onDelete: () => void;
  // Nome do item, usado nos rótulos de acessibilidade ("Editar Filial Norte")
  itemLabel: string;
}

// Editar/Excluir lado a lado em largura total no celular (44px) e compactos a partir de `sm`.
const RowActions: React.FC<RowActionsProps> = ({ onEdit, onDelete, itemLabel }) => (
  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-shrink-0 lg:ml-auto">
    <Button onClick={onEdit} variant="secondary" size="sm" aria-label={`Editar ${itemLabel}`}>
      <Icon name="pencil" className="h-4 w-4" />
      Editar
    </Button>
    <Button onClick={onDelete} variant="danger" size="sm" aria-label={`Excluir ${itemLabel}`}>
      <Icon name="trash" className="h-4 w-4" />
      Excluir
    </Button>
  </div>
);

// Tipo do modelo: `headerType` tem prioridade; `includeHeader` é o campo legado (sem nenhum dos dois = formulário)
const TemplateKindBadge: React.FC<{ template: EvaluationTemplate }> = ({ template }) => {
  if (template.headerType === 'evaluation') return <Badge tone="green">Avaliação</Badge>;
  if (template.headerType === 'rh') return <Badge tone="brand">RH</Badge>;
  if (template.includeHeader === true) return <Badge tone="green">Avaliação</Badge>;
  return <Badge tone="neutral">Formulário</Badge>;
};

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  rating: 'AVAL',
  'rating-5': 'AVAL 1-5',
  text: 'TEXTO',
  number: 'NÚMERO',
  radio: 'OPÇÃO',
  date: 'DATA',
  checkbox: 'CHECK',
};

const CHIP_CLASSES = 'inline-flex max-w-full items-center gap-1 text-xs bg-white px-2 py-1 rounded border';

// Resumo dos campos do modelo (formato atual `criteriaConfig`, com fallback para o legado `criteria`)
const CriteriaChips: React.FC<{ template: EvaluationTemplate; showType?: boolean }> = ({ template, showType = false }) => (
  <div className="flex flex-wrap gap-1">
    {template.criteriaConfig
      ? template.criteriaConfig.map((criterion, index) => (
          <span key={index} className={CHIP_CLASSES}>
            <span className="truncate max-w-[9.5rem]" title={criterion.name}>
              {criterion.name}
            </span>
            {criterion.required && <span className="text-red-500 font-bold">*</span>}
            {showType && (
              <span className="text-gray-500 uppercase text-xs">{FIELD_TYPE_LABELS[criterion.type || 'rating']}</span>
            )}
          </span>
        ))
      : template.criteria.map((criterion, index) => (
          <span key={index} className={CHIP_CLASSES} title={criterion}>
            <span className="truncate max-w-[9.5rem]">{criterion}</span>
          </span>
        ))}
  </div>
);

interface FormActionBarProps {
  isEditing: boolean;
  isSaving: boolean;
  saveLabel: string;
  onCancel: () => void;
}

// Barra de ações do formulário: fixa acima da navegação inferior no celular, comum a partir de `sm`.
// O -mx/-mb compensa o padding do <form> (p-4) para a barra encostar nas bordas do cartão.
const FormActionBar: React.FC<FormActionBarProps> = ({ isEditing, isSaving, saveLabel, onCancel }) => (
  <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 -mb-4 flex gap-2 rounded-b-lg border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:z-auto sm:mx-0 sm:mb-0 sm:justify-end sm:gap-4 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
    {isEditing && (
      <Button type="button" onClick={onCancel} variant="secondary" className="flex-1 sm:flex-none">
        Cancelar<span className="hidden sm:inline">&nbsp;edição</span>
      </Button>
    )}
    <Button type="submit" disabled={isSaving} className={isEditing ? 'flex-[2] sm:flex-none' : 'w-full sm:w-auto'}>
      {isSaving ? <Icon name="loader-2" className="h-5 w-5 animate-spin" /> : <Icon name="device-floppy" className="h-5 w-5" />}
      {isSaving ? 'Salvando...' : saveLabel}
    </Button>
  </div>
);

const LIST_ITEM_CLASSES = 'p-4 bg-gray-50 rounded-lg border border-gray-200';
const CARD_BODY_CLASSES = 'p-4 sm:p-6';
const SECTION_TITLE_CLASSES = 'text-xl font-bold text-brand-dark flex items-center gap-2 mb-4';

// Imagem escolhida no editor e ainda não enviada ao Storage (chave = id do critério)
interface PendingImage {
  file: File;
  previewUrl: string;
}

const isNumericText = (value: string): boolean => {
  const normalized = value.trim().replace(',', '.');
  return normalized.length > 0 && Number.isFinite(Number(normalized));
};

// Alternativas da múltipla escolha: o valor gravado é o texto, a menos que o modelo (legado) tenha um valor próprio
const getRadioOptions = (criterion: EvaluationCriterion): RadioOption[] =>
  (criterion.options || [])
    .map(option => ({ label: option.label.trim(), value: option.value.trim() || option.label.trim() }))
    .filter(option => option.label.length > 0);

// Retorna a primeira mensagem de erro encontrada nos critérios, ou null se estiverem válidos
const validateCriteria = (criteria: EvaluationCriterion[]): string | null => {
  for (const criterion of criteria) {
    const label = `"${criterion.name.trim()}"`;

    if (criterion.type === 'radio') {
      const values = getRadioOptions(criterion).map(option => option.value);
      if (new Set(values).size !== values.length) {
        return `Campo ${label}: há alternativas repetidas.`;
      }
    }

    if (criterion.type === 'number') {
      const invalidOption = (criterion.options || []).find(
        option => (option.label.trim() || option.value.trim()) && !isNumericText(option.value)
      );
      if (invalidOption) {
        return `Campo ${label}: informe um número em todas as opções da lista suspensa.`;
      }
    }

    const correctAnswer = (criterion.correctAnswer || '').trim();
    if (!correctAnswer || !supportsAnswerKey(criterion.type)) {
      continue;
    }
    if (criterion.type === 'number' && !isNumericText(correctAnswer)) {
      return `Campo ${label}: a resposta correta deve ser um número.`;
    }
    if (criterion.type === 'radio' && !getRadioOptions(criterion).some(option => option.value === correctAnswer)) {
      return `Campo ${label}: a resposta correta não corresponde a nenhuma opção.`;
    }
  }
  return null;
};

const TemplateManager: React.FC = () => {
  const { canManageSystem } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('models');
  
  // Estados para modelos
  const [templates, setTemplates] = useState<EvaluationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [criteriaConfig, setCriteriaConfig] = useState<EvaluationCriterion[]>([{ 
    id: Date.now().toString(), 
    name: '', 
    required: false, 
    type: 'rating' 
  }]);
  const [headerType, setHeaderType] = useState<'evaluation' | 'rh' | undefined>('evaluation');
  const [includeFinalConsiderations, setIncludeFinalConsiderations] = useState(true);
  const [pendingImages, setPendingImages] = useState<Record<string, PendingImage>>({});
  const pendingImagesRef = useRef(pendingImages);
  pendingImagesRef.current = pendingImages;
  const formRef = useRef<HTMLDivElement>(null);

  // Estados para filiais
  const [branches, setBranches] = useState<string[]>([]);
  const [newBranch, setNewBranch] = useState('');
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [editingBranchName, setEditingBranchName] = useState('');

  // Estados para usuários
  const [users, setUsers] = useState<User[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userPosition, setUserPosition] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'manager'>('manager');
  const [userBranches, setUserBranches] = useState<string[]>([]);
  const [userCanAccessMN10, setUserCanAccessMN10] = useState(false);
  const [userIsActive, setUserIsActive] = useState(true);

  // Confirmação de ações destrutivas/em lote
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const closeConfirm = useCallback(() => setConfirmRequest(null), []);

  const runConfirmedAction = async () => {
    if (!confirmRequest) return;
    setIsConfirming(true);
    try {
      await confirmRequest.action();
    } finally {
      setIsConfirming(false);
      setConfirmRequest(null);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'models' || activeSubTab === 'forms') {
      loadTemplates();
    } else if (activeSubTab === 'branches') {
      loadBranches();
    } else if (activeSubTab === 'users') {
      loadUsers();
      // Carregar filiais para seleção
      loadBranches();
    }
  }, [activeSubTab]);

  useEffect(() => {
    if (userRole === 'admin') {
      setUserCanAccessMN10(true);
    }
  }, [userRole]);

  // Libera as URLs de pré-visualização ao desmontar
  useEffect(() => {
    return () => {
      Object.values(pendingImagesRef.current).forEach(pending => URL.revokeObjectURL(pending.previewUrl));
    };
  }, []);
  
  const loadTemplates = async () => {
    setIsLoading(true);
    const fetchedTemplates = await getTemplates();
    setTemplates(fetchedTemplates);
    setIsLoading(false);
  };

  const loadBranches = async () => {
    setIsLoading(true);
    const fetchedBranches = await getBranches();
    setBranches(fetchedBranches);
    setIsLoading(false);
  };

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
    setIsLoading(false);
  };

  // Funções para modelos
  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  const handleCriterionChange = (index: number, field: keyof EvaluationCriterion, value: any) => {
    const updatedCriteria = [...criteriaConfig];
    updatedCriteria[index] = { ...updatedCriteria[index], [field]: value };

    if (field === 'type') {
      // Radio e número (legenda da lista suspensa) usam opções; os demais tipos não
      if (value === 'radio' || value === 'number') {
        if (!updatedCriteria[index].options) {
          updatedCriteria[index].options = [{ label: '', value: '' }];
        }
      } else {
        updatedCriteria[index].options = undefined;
      }

      // O gabarito depende do tipo: ao trocar, a resposta correta anterior deixa de valer
      updatedCriteria[index].correctAnswer = '';
    }

    setCriteriaConfig(updatedCriteria);
  };

  const addCriterion = () => {
    setCriteriaConfig([...criteriaConfig, { 
      id: generateId(),
      name: '', 
      required: false, 
      type: 'rating' 
    }]);
  };

  const removeCriterion = (index: number) => {
    if (criteriaConfig.length > 1) {
      discardPendingImage(criteriaConfig[index].id);
      const updatedCriteria = criteriaConfig.filter((_, i) => i !== index);
      setCriteriaConfig(updatedCriteria);
    }
  };

  // Opções são atualizadas sem mutar o array original (compartilhado com a lista de modelos)
  const updateCriterionOptions = (
    criterionIndex: number,
    update: (options: NonNullable<EvaluationCriterion['options']>) => NonNullable<EvaluationCriterion['options']>,
    correctAnswer?: string
  ) => {
    setCriteriaConfig(prev => prev.map((criterion, i) => {
      if (i !== criterionIndex) return criterion;
      const options = update(criterion.options || []);
      return correctAnswer === undefined ? { ...criterion, options } : { ...criterion, options, correctAnswer };
    }));
  };

  const addRadioOption = (criterionIndex: number) => {
    updateCriterionOptions(criterionIndex, options => [...options, { label: '', value: '' }]);
  };

  const removeRadioOption = (criterionIndex: number, optionIndex: number) => {
    const criterion = criteriaConfig[criterionIndex];
    if (!criterion.options || criterion.options.length <= 1) return;

    // Se a opção removida era a resposta correta, limpa o gabarito
    const removed = criterion.options[optionIndex];
    const clearedAnswer = criterion.type === 'radio' && removed && removed.value === criterion.correctAnswer ? '' : undefined;
    updateCriterionOptions(criterionIndex, options => options.filter((_, i) => i !== optionIndex), clearedAnswer);
  };

  const handleRadioOptionChange = (criterionIndex: number, optionIndex: number, field: 'label' | 'value', value: string) => {
    const criterion = criteriaConfig[criterionIndex];

    const previous = criterion.options?.[optionIndex];
    const isRadio = criterion.type === 'radio';

    // Múltipla escolha: o valor gravado acompanha o texto digitado (o campo "Valor" não é mais preenchido à mão)
    const valueFollowsLabel =
      isRadio && field === 'label' && previous !== undefined && (previous.value === '' || previous.value === previous.label);
    const nextValue = valueFollowsLabel || field === 'value' ? value : previous?.value;

    // Se a opção marcada como correta mudou de valor, o gabarito acompanha
    const hasAnswerKey = Boolean(criterion.correctAnswer);
    const followedAnswer =
      isRadio && hasAnswerKey && previous !== undefined && previous.value === criterion.correctAnswer && nextValue !== previous.value
        ? nextValue
        : undefined;

    updateCriterionOptions(
      criterionIndex,
      options => options.map((option, i) => {
        if (i !== optionIndex) return option;
        return valueFollowsLabel ? { ...option, label: value, value } : { ...option, [field]: value };
      }),
      followedAnswer
    );
  };

  // Imagens escolhidas ficam em memória e só vão ao Storage ao salvar o modelo (evita arquivos órfãos)
  const discardPendingImage = (criterionId: string) => {
    const pending = pendingImagesRef.current[criterionId];
    if (!pending) return;
    URL.revokeObjectURL(pending.previewUrl);
    setPendingImages(prev => {
      const { [criterionId]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const clearPendingImages = () => {
    Object.values(pendingImagesRef.current).forEach(pending => URL.revokeObjectURL(pending.previewUrl));
    setPendingImages({});
  };

  const handleImageSelect = (index: number, file: File) => {
    const validationError = validateTemplateImage(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    const criterionId = criteriaConfig[index].id;
    discardPendingImage(criterionId);
    setPendingImages(prev => ({ ...prev, [criterionId]: { file, previewUrl: URL.createObjectURL(file) } }));
  };

  // Remove a imagem escolhida e a já salva; o arquivo antigo sai do Storage quando o modelo é salvo
  const handleImageRemove = (index: number) => {
    discardPendingImage(criteriaConfig[index].id);
    setCriteriaConfig(prev => prev.map((criterion, i) => (
      i === index ? { ...criterion, imageUrl: '', imagePath: '' } : criterion
    )));
  };

  const resetForm = () => {
    clearPendingImages();
    setEditingTemplateId(null);
    setTemplateName('');
    setCriteriaConfig([{ 
      id: generateId(),
      name: '', 
      required: false, 
      type: 'rating' 
    }]);
    setHeaderType('evaluation');
    setIncludeFinalConsiderations(true);
  };

  const handleEdit = (template: EvaluationTemplate) => {
    clearPendingImages();
    // Definir o estado de edição primeiro
    setEditingTemplateId(template.id);
    setTemplateName(template.name);
    
    // Carregar configurações do template
    // Deriva headerType: novo campo tem prioridade, senão usa includeHeader como fallback
    if (template.headerType) {
      setHeaderType(template.headerType);
    } else if (template.includeHeader === false) {
      setHeaderType(undefined);
    } else {
      setHeaderType('evaluation');
    }
    setIncludeFinalConsiderations(template.includeFinalConsiderations === true);
    
    // Converter criteria antigas para nova estrutura se necessário
    if (template.criteriaConfig && template.criteriaConfig.length > 0) {
      // Garantir que todos os critérios tenham IDs e tipos
      const updatedCriteria = template.criteriaConfig.map(criterion => ({
        ...criterion,
        id: criterion.id || generateId(),
        type: criterion.type || 'rating'
      }));
      setCriteriaConfig(updatedCriteria);
    } else if (template.criteria && template.criteria.length > 0) {
      // Compatibilidade com templates antigos
      const convertedCriteria = template.criteria.map(name => ({ 
        id: generateId(),
        name, 
        required: false, 
        type: 'rating' as const 
      }));
      setCriteriaConfig(convertedCriteria);
    } else {
      // Fallback para templates vazios
      setCriteriaConfig([{ 
        id: generateId(),
        name: '', 
        required: false, 
        type: 'rating' 
      }]);
    }
    
    // Scroll para o formulário depois de um pequeno delay
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Funções para reordenar critérios
  const moveCriterionUp = (index: number) => {
    if (index === 0) return;
    const newCriteria = [...criteriaConfig];
    [newCriteria[index], newCriteria[index - 1]] = [newCriteria[index - 1], newCriteria[index]];
    setCriteriaConfig(newCriteria);
  };

  const moveCriterionDown = (index: number) => {
    if (index === criteriaConfig.length - 1) return;
    const newCriteria = [...criteriaConfig];
    [newCriteria[index], newCriteria[index + 1]] = [newCriteria[index + 1], newCriteria[index]];
    setCriteriaConfig(newCriteria);
  };

  const deleteTemplateById = async (templateId: string) => {
    try {
      const imagePaths = (templates.find(t => t.id === templateId)?.criteriaConfig || [])
        .map(criterion => criterion.imagePath)
        .filter((path): path is string => Boolean(path));

      await deleteTemplate(templateId);
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      await Promise.all(imagePaths.map(deleteTemplateImage));
    } catch (error) {
      console.error("Falha ao excluir modelo:", error);
      alert((error as Error).message || "Falha ao excluir o modelo. Tente novamente.");
    }
  };

  const handleDelete = (template: EvaluationTemplate) => {
    setConfirmRequest({
      title: 'Excluir modelo',
      message: `Tem certeza que deseja excluir o modelo "${template.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
      action: () => deleteTemplateById(template.id),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim() || criteriaConfig.some(c => !c.name.trim())) {
      alert('Por favor, preencha o nome do modelo e todos os critérios.');
      return;
    }

    const criteriaError = validateCriteria(criteriaConfig);
    if (criteriaError) {
      alert(criteriaError);
      return;
    }

    setIsSaving(true);
    const hasHeader = headerType !== undefined;
    const uploadedPaths: string[] = [];

    try {
      // Envia as imagens escolhidas e grava a URL/caminho no critério correspondente
      // allSettled: se um upload falhar, os demais terminam antes do rollback (sem arquivos órfãos)
      const uploadResults = await Promise.allSettled(criteriaConfig.map(async criterion => {
        const pending = pendingImages[criterion.id];
        if (!pending) return criterion;

        const uploaded = await uploadTemplateImage(pending.file);
        uploadedPaths.push(uploaded.path);
        return { ...criterion, imageUrl: uploaded.url, imagePath: uploaded.path };
      }));

      const failedUpload = uploadResults.find((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failedUpload) {
        throw failedUpload.reason;
      }
      const criteriaWithImages = uploadResults.map(result => (result as PromiseFulfilledResult<EvaluationCriterion>).value);

      const templateData = {
        name: templateName.trim(),
        criteria: criteriaWithImages.map(c => c.name.trim()).filter(Boolean), // Compatibilidade
        criteriaConfig: criteriaWithImages.map(c => {
          const type = c.type || 'rating';
          return {
            id: c.id || generateId(),
            name: c.name.trim(),
            required: c.required,
            type,
            options: type === 'number'
              ? (c.options || []).filter(option => option.label.trim() || option.value.trim())
              : type === 'radio'
                ? getRadioOptions(c)
                : (c.options || []),
            placeholder: c.placeholder || '',
            description: c.description || '',
            imageUrl: c.imageUrl || '',
            imagePath: c.imagePath || '',
            correctAnswer: supportsAnswerKey(type) ? (c.correctAnswer || '').trim() : '',
          };
        }).filter(c => c.name),
        includeHeader: hasHeader,
        headerType,
        includeFinalConsiderations,
        isFormOnly: !hasHeader,
      };

      const previousImagePaths = (templates.find(t => t.id === editingTemplateId)?.criteriaConfig || [])
        .map(criterion => criterion.imagePath)
        .filter((path): path is string => Boolean(path));

      if (editingTemplateId) {
        const updated = await updateTemplate(editingTemplateId, templateData);
        setTemplates(prev => prev.map(t => t.id === editingTemplateId ? updated : t));
      } else {
        const saved = await saveTemplate(templateData);
        setTemplates(prev => [...prev, saved]);
      }

      // Modelo salvo: remove do Storage as imagens que deixaram de ser usadas (trocadas ou removidas)
      const savedImagePaths = new Set(templateData.criteriaConfig.map(c => c.imagePath).filter(Boolean));
      await Promise.all(
        previousImagePaths.filter(path => !savedImagePaths.has(path)).map(deleteTemplateImage)
      );

      resetForm();
    } catch (error) {
      console.error("Falha ao salvar modelo:", error);
      // Desfaz os uploads desta tentativa para não deixar arquivos órfãos
      await Promise.all(uploadedPaths.map(deleteTemplateImage));
      alert(error instanceof Error && error.message ? error.message : "Falha ao salvar o modelo. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const runExampleImport = async () => {
    setIsSaving(true);
    try {
      const importedTemplates: EvaluationTemplate[] = [];
      for (const template of exampleTemplates) {
        const saved = await saveTemplate(template);
        importedTemplates.push(saved);
      }
      setTemplates(prev => [...prev, ...importedTemplates]);
      alert(`${importedTemplates.length} modelos de exemplo foram importados com sucesso!`);
    } catch (error) {
      console.error("Falha ao importar modelos:", error);
      alert("Falha ao importar os modelos de exemplo. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const importExampleTemplates = () => {
    setConfirmRequest({
      title: 'Importar modelos de exemplo',
      message: 'Isso criará novos modelos de formulário prontos para uso.',
      confirmLabel: 'Importar',
      variant: 'primary',
      action: runExampleImport,
    });
  };

  // Funções para filiais
  const handleAddBranch = async () => {
    if (newBranch.trim() && !branches.includes(newBranch.trim())) {
      try {
        await saveBranch(newBranch.trim());
        setBranches(prev => [...prev, newBranch.trim()]);
        setNewBranch('');
      } catch (error) {
        console.error('Erro ao adicionar filial:', error);
        alert('Erro ao adicionar filial. Tente novamente.');
      }
    }
  };

  const handleEditBranch = (branch: string) => {
    setEditingBranch(branch);
    setEditingBranchName(branch);
  };

  const handleSaveBranchEdit = () => {
    if (editingBranch && editingBranchName.trim()) {
      setBranches(prev => prev.map(b => b === editingBranch ? editingBranchName.trim() : b));
      setEditingBranch(null);
      setEditingBranchName('');
    }
  };

  const deleteBranchByName = async (branch: string) => {
    try {
      await deleteBranch(branch);
      setBranches(prev => prev.filter(b => b !== branch));
    } catch (error) {
      console.error('Erro ao excluir filial:', error);
      alert('Erro ao excluir filial. Tente novamente.');
    }
  };

  const handleDeleteBranch = (branch: string) => {
    setConfirmRequest({
      title: 'Excluir filial',
      message: `Tem certeza que deseja excluir a filial "${branch}"?`,
      confirmLabel: 'Excluir',
      variant: 'danger',
      action: () => deleteBranchByName(branch),
    });
  };

  // Funções para usuários
  const resetUserForm = () => {
    setEditingUserId(null);
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserPosition('');
    setUserRole('manager');
    setUserBranches([]);
    setUserCanAccessMN10(false);
    setUserIsActive(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUserId(user.id);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserPassword(''); // Não carregar senha existente por segurança
    setUserPosition(user.position);
    setUserRole(user.role);
    setUserBranches([...user.branches]);
    setUserCanAccessMN10(user.role === 'admin' ? true : user.canAccessMN10 === true);
    setUserIsActive(user.isActive);
    
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim() || !userPosition.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    // Validar senha apenas para novos usuários
    if (!editingUserId && !userPassword.trim()) {
      alert('Por favor, defina uma senha para o novo usuário.');
      return;
    }

    if (userRole === 'manager' && userBranches.length === 0) {
      alert('Gestores devem ter pelo menos uma filial associada.');
      return;
    }

    setIsSaving(true);
    const userData = {
      name: userName.trim(),
      email: userEmail.trim(),
      password: userPassword.trim(), // Incluir senha
      position: userPosition.trim(),
      role: userRole,
      branches: userRole === 'admin' ? [] : userBranches, // Admins têm acesso a todas
      canAccessMN10: userRole === 'admin' ? true : userCanAccessMN10,
      isActive: userIsActive,
    };
    
    try {
      if (editingUserId) {
        const updated = await updateUser(editingUserId, userData);
        setUsers(prev => prev.map(u => u.id === editingUserId ? updated : u));
      } else {
        const saved = await saveUser(userData);
        setUsers(prev => [...prev, saved]);
      }
      resetUserForm();
    } catch (error) {
      console.error("Falha ao salvar usuário:", error);
      alert("Falha ao salvar o usuário. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteUserById = async (userId: string) => {
    try {
      await deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      console.error("Falha ao excluir usuário:", error);
      alert((error as Error).message || "Falha ao excluir o usuário. Tente novamente.");
    }
  };

  const handleDeleteUser = (user: User) => {
    setConfirmRequest({
      title: 'Excluir usuário',
      message: `Tem certeza que deseja excluir o usuário "${user.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      variant: 'danger',
      action: () => deleteUserById(user.id),
    });
  };

  const handleBranchToggle = (branch: string) => {
    setUserBranches(prev => 
      prev.includes(branch) 
        ? prev.filter(b => b !== branch)
        : [...prev, branch]
    );
  };

  const formTitle = editingTemplateId ? 'Editando Modelo' : 'Criar Novo Modelo de Avaliação';
  const saveButtonText = editingTemplateId ? 'Salvar Alterações' : 'Salvar Novo Modelo';
  const userFormTitle = editingUserId ? 'Editando Usuário' : 'Criar Novo Usuário';
  const userSaveButtonText = editingUserId ? 'Salvar Alterações' : 'Salvar Novo Usuário';

  // Abre o editor de modelos já carregado com o formulário escolhido (usado pela aba Formulários)
  const handleEditFromForms = (template: EvaluationTemplate) => {
    setActiveSubTab('models');
    handleEdit(template);
  };

  const simpleForms = templates.filter(t => !t.headerType && t.includeHeader === false);

  const subTabs: Array<{ tab: SubTab; label: string; icon: IconName }> = [
    { tab: 'models', label: 'Modelos', icon: 'clipboard-list' },
    { tab: 'forms', label: 'Formulários', icon: 'file-text' },
    { tab: 'branches', label: 'Filiais', icon: 'building' },
    ...(canManageSystem ? [{ tab: 'users' as const, label: 'Usuários', icon: 'users' as const }] : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header com sub-abas */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center">
        <h2 className="text-2xl font-bold text-brand-dark flex items-center gap-2">
          <Icon name="settings" className="h-6 w-6 text-brand-primary" />
          Gerenciar Sistema
        </h2>
        <div
          role="tablist"
          aria-label="Seções de gerenciamento"
          className={`grid gap-1 rounded-brand bg-brand-gray p-1 lg:flex lg:w-auto ${
            subTabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'
          }`}
        >
          {subTabs.map(({ tab, label, icon }) => (
            <SubTabButton
              key={tab}
              label={label}
              icon={icon}
              isActive={activeSubTab === tab}
              onSelect={() => setActiveSubTab(tab)}
            />
          ))}
        </div>
      </div>

      {/* Conteúdo da aba Modelos */}
      {activeSubTab === 'models' && (
        <div className="space-y-6 sm:space-y-8">
          <div ref={formRef} className="scroll-mt-20" />
          {/* overflow visível: o overflow-hidden padrão do Card quebraria a barra sticky de ações */}
          <Card className="!overflow-visible">
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
              <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2">
                {editingTemplateId ? <Icon name="pencil" className="h-6 w-6 text-brand-primary" /> : <Icon name="circle-plus" className="h-6 w-6 text-brand-primary" />}
                {formTitle}
              </h2>
              
              <Input 
                label="Nome do Modelo" 
                name="templateName"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Ex: Avaliação de Veículo Leve"
                required 
              />

              {/* Configurações do Template */}
              <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                <h3 className="text-lg font-semibold text-brand-dark mb-3">Configurações do Formulário</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Tipo de Cabeçalho</p>
                    <div className="space-y-2">
                      <label className={`flex items-start p-3 min-h-11 rounded-brand border cursor-pointer transition-colors ${
                        headerType === undefined
                          ? 'border-brand-primary bg-brand-light'
                          : 'border-gray-200 hover:bg-gray-100'
                      }`}>
                        <input
                          type="radio"
                          name="headerType"
                          checked={headerType === undefined}
                          onChange={() => setHeaderType(undefined)}
                          className="mt-0.5 h-5 w-5 flex-shrink-0 accent-brand-primary"
                        />
                        <div className="ml-3 min-w-0">
                          <span className="text-sm font-medium text-gray-700">Sem cabeçalho</span>
                          <span className="block text-xs text-gray-500">
                            Apenas os campos do formulário, sem dados de identificação. Ideal para pesquisas e formulários simples.
                          </span>
                        </div>
                      </label>
                      <label className={`flex items-start p-3 min-h-11 rounded-brand border cursor-pointer transition-colors ${
                        headerType === 'evaluation'
                          ? 'border-brand-primary bg-brand-light'
                          : 'border-gray-200 hover:bg-gray-100'
                      }`}>
                        <input
                          type="radio"
                          name="headerType"
                          checked={headerType === 'evaluation'}
                          onChange={() => setHeaderType('evaluation')}
                          className="mt-0.5 h-5 w-5 flex-shrink-0 accent-brand-primary"
                        />
                        <div className="ml-3 min-w-0">
                          <span className="text-sm font-medium text-gray-700">Cabeçalho de Avaliação</span>
                          <span className="block text-xs text-gray-500">
                            Campos: Matrícula, Motorista, Setor, Turno, Filial, VT, Data e Média Geral.
                          </span>
                        </div>
                      </label>
                      <label className={`flex items-start p-3 min-h-11 rounded-brand border cursor-pointer transition-colors ${
                        headerType === 'rh'
                          ? 'border-brand-primary bg-brand-light'
                          : 'border-gray-200 hover:bg-gray-100'
                      }`}>
                        <input
                          type="radio"
                          name="headerType"
                          checked={headerType === 'rh'}
                          onChange={() => setHeaderType('rh')}
                          className="mt-0.5 h-5 w-5 flex-shrink-0 accent-brand-primary"
                        />
                        <div className="ml-3 min-w-0">
                          <span className="text-sm font-medium text-gray-700">Cabeçalho de RH</span>
                          <span className="block text-xs text-gray-500">
                            Campos: Nome do Colaborador, Função, Turno Principal, Equipe/Setor, Filial, Data e Média Geral.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <Checkbox
                    label="Incluir campo de considerações finais"
                    name="includeFinalConsiderations"
                    checked={includeFinalConsiderations}
                    onChange={setIncludeFinalConsiderations}
                    description="Campo para observações, pontos positivos e melhorias."
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-brand-dark mb-3">Campos do Formulário</h3>
                <p className="text-sm text-gray-600 mb-3">Configure os campos que aparecerão no formulário de avaliação</p>
                <div className="space-y-4">
                  {criteriaConfig.map((criterion, index) => (
                    <CriterionEditor
                      key={criterion.id || index}
                      criterion={criterion}
                      index={index}
                      total={criteriaConfig.length}
                      pendingImagePreview={pendingImages[criterion.id]?.previewUrl}
                      onChange={handleCriterionChange}
                      onOptionAdd={addRadioOption}
                      onOptionRemove={removeRadioOption}
                      onOptionChange={handleRadioOptionChange}
                      onImageSelect={handleImageSelect}
                      onImageRemove={handleImageRemove}
                      onMoveUp={moveCriterionUp}
                      onMoveDown={moveCriterionDown}
                      onRemove={removeCriterion}
                    />
                  ))}
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <Button type="button" onClick={addCriterion} variant="secondary" className="w-full sm:w-auto">
                    <Icon name="circle-plus" className="h-4 w-4" />
                    Adicionar Campo
                  </Button>
                  <Button
                    type="button"
                    onClick={importExampleTemplates}
                    variant="secondary"
                    className="w-full sm:w-auto"
                    disabled={isSaving}
                  >
                    <Icon name="download" className="h-4 w-4" />
                    Importar Modelos de Exemplo
                  </Button>
                </div>
              </div>

              <FormActionBar
                isEditing={editingTemplateId !== null}
                isSaving={isSaving}
                saveLabel={saveButtonText}
                onCancel={resetForm}
              />
            </form>
          </Card>

          <Card>
            <div className={CARD_BODY_CLASSES}>
              <h2 className={SECTION_TITLE_CLASSES}>
                <Icon name="file-text" className="h-6 w-6 text-brand-primary" />
                Modelos Existentes
              </h2>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Icon name="loader-2" className="h-8 w-8 animate-spin text-brand-primary" />
                </div>
              ) : templates.length > 0 ? (
                <ul className="space-y-4">
                  {templates.map(template => (
                    <li key={template.id} className={LIST_ITEM_CLASSES}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-grow">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <p className="min-w-0 break-words font-semibold text-brand-dark">{template.name}</p>
                            <TemplateKindBadge template={template} />
                          </div>
                          <CriteriaChips template={template} />
                        </div>
                        <RowActions
                          itemLabel={`modelo ${template.name}`}
                          onEdit={() => handleEdit(template)}
                          onDelete={() => handleDelete(template)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum modelo customizado foi criado ainda.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Conteúdo da aba Filiais */}
      {activeSubTab === 'branches' && (
        <div className="space-y-6">
          <Card>
            <div className={CARD_BODY_CLASSES}>
              <h2 className={SECTION_TITLE_CLASSES}>
                <Icon name="circle-plus" className="h-6 w-6 text-brand-primary" />
                Adicionar Nova Filial
              </h2>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <Input
                  label="Nome da Filial"
                  value={newBranch}
                  onChange={(e) => setNewBranch(e.target.value)}
                  placeholder="Ex: Unidade Leste"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddBranch()}
                  wrapperClassName="min-w-0 flex-1"
                />
                <Button onClick={handleAddBranch} disabled={!newBranch.trim()} className="w-full sm:w-auto">
                  <Icon name="circle-plus" className="h-4 w-4" />
                  Adicionar
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className={CARD_BODY_CLASSES}>
              <h2 className={SECTION_TITLE_CLASSES}>
                <Icon name="building" className="h-6 w-6 text-brand-primary" />
                Filiais Existentes
              </h2>
              {branches.length > 0 ? (
                <ul className="space-y-4">
                  {branches.map(branch => (
                    <li key={branch} className={LIST_ITEM_CLASSES}>
                      {editingBranch === branch ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <input
                            type="text"
                            aria-label={`Novo nome da filial ${branch}`}
                            value={editingBranchName}
                            onChange={(e) => setEditingBranchName(e.target.value)}
                            className={`${FIELD_CLASSES} min-w-0 sm:flex-1`}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveBranchEdit()}
                            autoFocus
                          />
                          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-shrink-0">
                            <Button onClick={handleSaveBranchEdit} variant="secondary" size="sm">
                              <Icon name="device-floppy" className="h-4 w-4" />
                              Salvar
                            </Button>
                            <Button onClick={() => setEditingBranch(null)} variant="ghost" size="sm">
                              <Icon name="x" className="h-4 w-4" />
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="min-w-0 break-words font-semibold text-brand-dark">{branch}</p>
                          <RowActions
                            itemLabel={`filial ${branch}`}
                            onEdit={() => handleEditBranch(branch)}
                            onDelete={() => handleDeleteBranch(branch)}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhuma filial foi criada ainda.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Conteúdo da aba Usuários */}
      {activeSubTab === 'users' && canManageSystem && (
        <div className="space-y-6">
          <div ref={formRef} className="scroll-mt-20" />
          {/* overflow visível: o overflow-hidden padrão do Card quebraria a barra sticky de ações */}
          <Card className="!overflow-visible">
            <form onSubmit={handleSubmitUser} className="p-4 sm:p-6 space-y-6">
              <h2 className="text-xl font-bold text-brand-dark flex items-center gap-2">
                {editingUserId ? <Icon name="pencil" className="h-6 w-6 text-brand-primary" /> : <Icon name="circle-plus" className="h-6 w-6 text-brand-primary" />}
                {userFormTitle}
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Nome Completo"
                    name="userName"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Ex: João Silva"
                    autoComplete="off"
                    required
                  />

                  <Input
                    label="Email"
                    name="userEmail"
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="joao.silva@empresa.com"
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label={editingUserId ? "Nova Senha (deixe vazio para manter)" : "Senha"}
                    name="userPassword"
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Senha do usuário"
                    autoComplete="new-password"
                    required={!editingUserId}
                  />

                  <Input
                    label="Cargo"
                    name="userPosition"
                    value={userPosition}
                    onChange={(e) => setUserPosition(e.target.value)}
                    placeholder="Ex: Supervisor"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Nível de Acesso"
                    name="userRole"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value as 'admin' | 'manager')}
                    required
                  >
                    <option value="manager">Gestor</option>
                    <option value="admin">Administrador</option>
                  </Select>
                </div>

                <label
                  htmlFor="userCanAccessMN10"
                  className={`flex min-h-11 items-center gap-3 py-2 ${userRole === 'admin' ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                >
                  <input
                    id="userCanAccessMN10"
                    type="checkbox"
                    checked={userRole === 'admin' ? true : userCanAccessMN10}
                    onChange={(e) => setUserCanAccessMN10(e.target.checked)}
                    disabled={userRole === 'admin'}
                    className="h-5 w-5 flex-shrink-0 accent-brand-primary"
                  />
                  <span className="min-w-0 text-sm font-medium text-gray-700">
                    Acesso ao MN10 {userRole === 'admin' ? '(sempre habilitado para admin)' : ''}
                  </span>
                </label>
              </div>

              {userRole === 'manager' && (
                <div>
                  <h3 className="text-lg font-semibold text-brand-dark mb-3">Filiais de Acesso</h3>
                  <p className="text-sm text-gray-600 mb-3">Selecione as filiais que este gestor pode acessar</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {branches.map((branch, branchIndex) => {
                      const isSelected = userBranches.includes(branch);
                      return (
                        <Checkbox
                          key={branch}
                          label={branch}
                          name={`userBranch-${branchIndex}`}
                          checked={isSelected}
                          onChange={() => handleBranchToggle(branch)}
                          className={`px-3 border rounded-brand transition-colors ${
                            isSelected ? 'border-brand-primary bg-brand-light' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <Checkbox
                label="Usuário Ativo"
                name="userIsActive"
                checked={userIsActive}
                onChange={setUserIsActive}
              />

              <FormActionBar
                isEditing={editingUserId !== null}
                isSaving={isSaving}
                saveLabel={userSaveButtonText}
                onCancel={resetUserForm}
              />
            </form>
          </Card>

          <Card>
            <div className={CARD_BODY_CLASSES}>
              <h2 className={SECTION_TITLE_CLASSES}>
                <Icon name="users" className="h-6 w-6 text-brand-primary" />
                Usuários do Sistema
              </h2>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Icon name="loader-2" className="h-8 w-8 animate-spin text-brand-primary" />
                </div>
              ) : users.length > 0 ? (
                <ul className="space-y-4">
                  {users.map(user => (
                    <li key={user.id} className={LIST_ITEM_CLASSES}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-grow">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <p className="min-w-0 break-words font-semibold text-brand-dark">{user.name}</p>
                            <Badge tone={user.role === 'admin' ? 'solid' : 'brand'}>
                              {user.role === 'admin' ? 'Administrador' : 'Gestor'}
                            </Badge>
                            {!user.isActive && <Badge tone="red">Inativo</Badge>}
                            {(user.role === 'admin' || user.canAccessMN10) && <Badge tone="amber">MN10</Badge>}
                          </div>
                          <p className="break-all text-sm text-gray-600">{user.email}</p>
                          <p className="break-words text-sm text-gray-600">{user.position}</p>
                          {user.role === 'manager' && user.branches.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {user.branches.map(branch => (
                                <span key={branch} className="inline-block max-w-full break-words text-xs bg-white px-2 py-1 rounded border">
                                  {branch}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <RowActions
                          itemLabel={`usuário ${user.name}`}
                          onEdit={() => handleEditUser(user)}
                          onDelete={() => handleDeleteUser(user)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-center py-4">Nenhum usuário foi criado ainda.</p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Conteúdo da aba Formulários */}
      {activeSubTab === 'forms' && (
        <div className="space-y-6">
          <Card>
            <div className={CARD_BODY_CLASSES}>
              <h2 className={SECTION_TITLE_CLASSES}>
                <Icon name="file-text" className="h-6 w-6 text-brand-primary" />
                Formulários Simples
              </h2>
              <p className="text-gray-600 mb-4">
                Formulários sem cabeçalho de avaliação - ideais para coleta de dados, pesquisas e relatórios simples.
              </p>
              {isLoading ? (
                <div className="flex justify-center items-center h-24">
                  <Icon name="loader-2" className="h-8 w-8 animate-spin text-brand-primary" />
                </div>
              ) : simpleForms.length > 0 ? (
                <ul className="space-y-4">
                  {simpleForms.map(template => (
                    <li key={template.id} className={LIST_ITEM_CLASSES}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="min-w-0 flex-grow">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <p className="min-w-0 break-words font-semibold text-brand-dark">{template.name}</p>
                            <Badge tone="neutral">Formulário</Badge>
                          </div>
                          <CriteriaChips template={template} showType />
                        </div>
                        <RowActions
                          itemLabel={`formulário ${template.name}`}
                          onEdit={() => handleEditFromForms(template)}
                          onDelete={() => handleDelete(template)}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <Icon name="file-text" className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">Nenhum formulário simples foi criado ainda.</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Para criar um formulário simples, vá em "Modelos" e, em "Tipo de Cabeçalho", escolha "Sem cabeçalho".
                  </p>
                  <Button onClick={() => setActiveSubTab('models')} variant="secondary" className="w-full sm:w-auto">
                    <Icon name="circle-plus" className="h-4 w-4" />
                    Criar Formulário
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmRequest !== null}
        title={confirmRequest?.title ?? ''}
        message={confirmRequest?.message}
        confirmLabel={confirmRequest?.confirmLabel}
        variant={confirmRequest?.variant}
        isLoading={isConfirming}
        onConfirm={runConfirmedAction}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default TemplateManager;
