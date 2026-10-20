import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import type {
  MN10AnswerValue,
  MN10Form,
  MN10FormStatus,
  MN10Question,
  MN10QuestionType,
  MN10Response,
} from '../../types';
import {
  createMn10Form,
  deleteMn10Form,
  deleteMn10Response,
  duplicateMn10Form,
  getMn10AttachmentDownloadUrl,
  getMn10Response,
  listMn10Forms,
  listMn10Responses,
  updateMn10InternalAnswers,
  updateMn10FormMeta,
  updateMn10FormStructure,
} from '../../services/mn10Service';
import { MN10PdfService } from '../../services/mn10PdfService';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import ConfirmDialog from '../ui/ConfirmDialog';
import { FIELD_CLASSES } from '../ui/fieldStyles';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import {
  applyDateMask,
  applyPhoneMask,
  isCompleteMaskedDate,
  isCompleteMaskedPhone,
  isoDateToMasked,
  maskedDateToIso,
} from '../../utils/mn10FieldUtils';

type Tab = 'forms' | 'responses';

const QUESTION_TYPES: Array<{ value: MN10QuestionType; label: string }> = [
  { value: 'short_text', label: 'Texto curto' },
  { value: 'long_text', label: 'Parágrafo' },
  { value: 'single_choice', label: 'Escolha única' },
  { value: 'multiple_choice', label: 'Múltipla escolha' },
  { value: 'dropdown', label: 'Lista suspensa' },
  { value: 'date', label: 'Data' },
  { value: 'phone', label: 'Telefone' },
  { value: 'boolean', label: 'Sim/não' },
  { value: 'file_upload', label: 'Upload' },
];

// Duração dos avisos (toast) fixos
const SUCCESS_TOAST_MS = 3000;
const ERROR_TOAST_MS = 8000;
// Breakpoint `xl` do Tailwind: a partir dele lista e detalhe/editor aparecem lado a lado
const XL_MEDIA_QUERY = '(min-width: 1280px)';

interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  action: () => Promise<void>;
}

const STATUS_LABEL: Record<MN10FormStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  closed: 'Fechado',
};

const needsOptions = (type: MN10QuestionType): boolean =>
  type === 'single_choice' || type === 'multiple_choice' || type === 'dropdown';

const isInternalQuestion = (question: MN10Question): boolean => question.visibility === 'internal';

const countInternalQuestions = (form: MN10Form): number =>
  (form.questions || []).filter(isInternalQuestion).length;

const createId = (prefix: string): string => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const createQuestion = (type: MN10QuestionType, order: number): MN10Question => ({
  id: createId('q'),
  title: '',
  type,
  required: false,
  visibility: 'public',
  helpText: '',
  options: needsOptions(type) ? [{ id: createId('o'), label: '' }] : undefined,
  order,
  uploadConfig:
    type === 'file_upload'
      ? {
          allowedTypes: ['image', 'pdf'],
          maxSizeMB: 10,
          maxFiles: 1,
        }
      : undefined,
});

const getAnswerValue = (question: MN10Question, response: MN10Response): MN10AnswerValue => {
  const source = isInternalQuestion(question) ? response.internalAnswers || {} : response.answers;
  return source[question.id];
};

const formatAnswer = (question: MN10Question, response: MN10Response): string => {
  const value = getAnswerValue(question, response);
  if (question.type === 'file_upload') {
    const files = response.attachments.filter(item => item.questionId === question.id);
    return files.length > 0 ? files.map(item => item.fileName).join(', ') : 'Sem arquivo';
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'Sem resposta';
  }
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  if (value === undefined || value === null || value === '') {
    return 'Sem resposta';
  }
  return String(value);
};

const formatResponseTitleValue = (value: MN10AnswerValue): string => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '';
  }
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não';
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
};

const statusClass: Record<MN10FormStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-700',
};

const buildPublicLink = (form: MN10Form): string =>
  new URL(`${import.meta.env.BASE_URL}mn10/f/${form.publicId}`, window.location.origin).toString();

interface CheckRowProps {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

// A linha inteira é o <label>: toque em qualquer ponto marca/desmarca (alvo >= 44px).
const CheckRow: React.FC<CheckRowProps> = ({ id, label, checked, disabled = false, onChange }) => (
  <label
    htmlFor={id}
    className={`flex min-h-11 items-center gap-3 py-2 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
  >
    <input
      id={id}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={e => onChange(e.target.checked)}
      className="h-5 w-5 flex-shrink-0 accent-brand-primary"
    />
    <span className="min-w-0 break-words text-sm font-medium text-gray-700">{label}</span>
  </label>
);

interface ViewTabButtonProps {
  label: string;
  icon: 'file-text' | 'clipboard-list';
  isActive: boolean;
  onSelect: () => void;
}

// Aba do módulo (44px). Definida fora do componente para não remontar a cada render.
const ViewTabButton: React.FC<ViewTabButtonProps> = ({ label, icon, isActive, onSelect }) => (
  <button
    type="button"
    role="tab"
    aria-selected={isActive}
    onClick={onSelect}
    className={`flex min-h-11 items-center justify-center gap-2 rounded-brand px-4 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-1 ${
      isActive ? 'bg-brand-primary text-white shadow-sm' : 'text-brand-primary hover:bg-brand-light'
    }`}
  >
    <Icon name={icon} className="h-4 w-4" />
    {label}
  </button>
);

// Barra de ações colada acima da navegação inferior no celular; comum a partir de `sm`.
// O -mx/-mb compensa o padding do contêiner (p-4) para a barra encostar nas bordas do cartão.
const STICKY_ACTIONS_CLASSES =
  'sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 -mb-4 flex gap-2 rounded-b-lg border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur ' +
  'sm:static sm:z-auto sm:mx-0 sm:mb-0 sm:justify-end sm:gap-3 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none';

const MN10Dashboard: React.FC = () => {
  const { currentUser } = useAuth();

  const [tab, setTab] = useState<Tab>('forms');
  const [forms, setForms] = useState<MN10Form[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [publicIdCode, setPublicIdCode] = useState('');
  const [status, setStatus] = useState<MN10FormStatus>('draft');
  const [questions, setQuestions] = useState<MN10Question[]>([createQuestion('short_text', 0)]);
  const [responseTitleQuestionId, setResponseTitleQuestionId] = useState('');

  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [responses, setResponses] = useState<MN10Response[]>([]);
  const [selectedResponseId, setSelectedResponseId] = useState<string>('');
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [attachmentLinks, setAttachmentLinks] = useState<Record<string, string>>({});
  const [internalAnswersDraft, setInternalAnswersDraft] = useState<Record<string, MN10AnswerValue>>({});
  const [savingInternalAnswers, setSavingInternalAnswers] = useState(false);
  const [openInternalCalendarQuestionId, setOpenInternalCalendarQuestionId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Abaixo de `xl` o módulo alterna entre lista e editor/detalhe (uma coluna por vez)
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showResponseDetail, setShowResponseDetail] = useState(false);

  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const closeConfirm = useCallback(() => setConfirmRequest(null), []);

  const rootRef = useRef<HTMLDivElement>(null);
  const previousViewRef = useRef({ isEditorOpen, showResponseDetail });

  // Compartilhar pelo menu nativo só faz sentido em dispositivos de toque; no desktop o link é copiado
  const canNativeShare = useMemo(
    () =>
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      window.matchMedia('(pointer: coarse)').matches,
    []
  );

  const selectedForm = useMemo(() => forms.find(item => item.id === selectedFormId) || null, [forms, selectedFormId]);
  const selectedResponse = useMemo(
    () => responses.find(item => item.id === selectedResponseId) || null,
    [responses, selectedResponseId]
  );
  const selectedResponseQuestions = useMemo(() => {
    if (!selectedResponse) {
      return [] as MN10Question[];
    }

    const baseQuestions =
      selectedResponse.questionSnapshot && selectedResponse.questionSnapshot.length > 0
        ? selectedResponse.questionSnapshot
        : selectedForm?.questions || [];

    const sortedBaseQuestions = baseQuestions.slice().sort((a, b) => a.order - b.order);
    const knownQuestionIds = new Set(sortedBaseQuestions.map(question => question.id));

    const answerQuestionIds = Object.keys(selectedResponse.answers).filter(questionId => !knownQuestionIds.has(questionId));
    const internalAnswerQuestionIds = Object.keys(selectedResponse.internalAnswers || {}).filter(
      questionId => !knownQuestionIds.has(questionId)
    );
    const attachmentQuestionIds = selectedResponse.attachments
      .map(attachment => attachment.questionId)
      .filter(questionId => !knownQuestionIds.has(questionId));

    const extraQuestionIds = Array.from(
      new Set([...answerQuestionIds, ...internalAnswerQuestionIds, ...attachmentQuestionIds])
    );
    const extraQuestions: MN10Question[] = extraQuestionIds.map((questionId, index) => {
      const answerValue =
        selectedResponse.answers[questionId] ??
        (selectedResponse.internalAnswers ? selectedResponse.internalAnswers[questionId] : undefined);
      const hasAttachment = selectedResponse.attachments.some(attachment => attachment.questionId === questionId);
      const hasInternalAnswer =
        selectedResponse.internalAnswers && selectedResponse.internalAnswers[questionId] !== undefined;

      let inferredType: MN10QuestionType = 'short_text';
      if (hasAttachment) {
        inferredType = 'file_upload';
      } else if (Array.isArray(answerValue)) {
        inferredType = 'multiple_choice';
      } else if (typeof answerValue === 'boolean') {
        inferredType = 'boolean';
      }

      return {
        id: questionId,
        title: `Pergunta removida (${questionId})`,
        type: inferredType,
        required: false,
        visibility: hasInternalAnswer ? 'internal' : 'public',
        order: sortedBaseQuestions.length + index,
      };
    });

    return [...sortedBaseQuestions, ...extraQuestions];
  }, [selectedResponse, selectedForm]);

  const selectedResponsePublicQuestions = useMemo(
    () => selectedResponseQuestions.filter(question => !isInternalQuestion(question)),
    [selectedResponseQuestions]
  );

  const selectedResponseInternalQuestions = useMemo(
    () => selectedResponseQuestions.filter(isInternalQuestion),
    [selectedResponseQuestions]
  );

  const responseTitleQuestionOptions = useMemo(
    () =>
      questions.filter(question => question.type !== 'file_upload').map((question, index) => ({
        id: question.id,
        label: question.title.trim() || `Pergunta ${index + 1}`,
        isInternal: isInternalQuestion(question),
      })),
    [questions]
  );

  const resolveResponseCardTitle = useCallback(
    (response: MN10Response): string => {
      const fallback = `Resposta ${response.id.slice(-6)}`;
      const titleQuestionId = selectedForm?.responseTitleQuestionId;
      if (!selectedForm || !titleQuestionId) {
        return fallback;
      }

      const titleQuestion =
        selectedForm.questions.find(question => question.id === titleQuestionId) ||
        (response.questionSnapshot || []).find(question => question.id === titleQuestionId);
      if (!titleQuestion) {
        return fallback;
      }

      const rawValue = getAnswerValue(titleQuestion, response);
      const formatted = formatResponseTitleValue(rawValue);
      if (!formatted) {
        return fallback;
      }

      return formatted.length > 72 ? `${formatted.slice(0, 69)}...` : formatted;
    },
    [selectedForm]
  );

  const clearEditor = () => {
    setEditingFormId(null);
    setTitle('');
    setDescription('');
    setPublicIdCode('');
    setStatus('draft');
    setQuestions([createQuestion('short_text', 0)]);
    setResponseTitleQuestionId('');
  };

  const notify = (text: string) => setMessage(text);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(''), SUCCESS_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!error) {
      return;
    }
    const timer = window.setTimeout(() => setError(''), ERROR_TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [error]);

  // Ao trocar entre lista e editor/detalhe no celular, volta ao topo do módulo (a tela inteira muda de conteúdo)
  useEffect(() => {
    const previous = previousViewRef.current;
    previousViewRef.current = { isEditorOpen, showResponseDetail };
    if (previous.isEditorOpen === isEditorOpen && previous.showResponseDetail === showResponseDetail) {
      return;
    }
    if (window.matchMedia(XL_MEDIA_QUERY).matches) {
      return;
    }
    rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [isEditorOpen, showResponseDetail]);

  const loadForms = useCallback(async () => {
    setLoadingForms(true);
    try {
      const data = await listMn10Forms();
      setForms(data);
      if (!selectedFormId && data.length > 0) {
        setSelectedFormId(data[0].id);
      }
    } catch (loadError) {
      console.error(loadError);
      setError('Falha ao carregar formulários MN10.');
    } finally {
      setLoadingForms(false);
    }
  }, [selectedFormId]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const loadResponses = useCallback(async (formId: string) => {
    setLoadingResponses(true);
    try {
      const data = await listMn10Responses(formId);
      setResponses(data);
      setSelectedResponseId(data[0]?.id || '');
    } catch (loadError) {
      console.error(loadError);
      setError('Falha ao carregar respostas do formulário.');
    } finally {
      setLoadingResponses(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'responses' && selectedFormId) {
      loadResponses(selectedFormId);
    }
  }, [tab, selectedFormId, loadResponses]);

  useEffect(() => {
    const hydrateAttachmentLinks = async () => {
      if (!selectedResponse) {
        setAttachmentLinks({});
        return;
      }

      const links: Record<string, string> = {};
      await Promise.all(
        selectedResponse.attachments.map(async attachment => {
          try {
            links[attachment.path] = await getMn10AttachmentDownloadUrl(attachment.path);
          } catch (linkError) {
            console.error('Falha no anexo:', linkError);
          }
        })
      );
      setAttachmentLinks(links);
    };

    hydrateAttachmentLinks();
  }, [selectedResponse]);

  useEffect(() => {
    if (!selectedResponse) {
      setInternalAnswersDraft({});
      setOpenInternalCalendarQuestionId(null);
      return;
    }
    setInternalAnswersDraft({ ...(selectedResponse.internalAnswers || {}) });
    setOpenInternalCalendarQuestionId(null);
  }, [selectedResponse]);

  useEffect(() => {
    if (!responseTitleQuestionId) {
      return;
    }

    const hasSelectedQuestion = questions.some(
      question => question.id === responseTitleQuestionId && question.type !== 'file_upload'
    );
    if (!hasSelectedQuestion) {
      setResponseTitleQuestionId('');
    }
  }, [questions, responseTitleQuestionId]);

  const updateQuestion = (index: number, patch: Partial<MN10Question>) => {
    setQuestions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const setQuestionType = (index: number, type: MN10QuestionType) => {
    setQuestions(prev => {
      const next = [...prev];
      const current = next[index];
      if (!current) {
        return prev;
      }
      next[index] = {
        ...current,
        type,
        visibility: type === 'file_upload' ? 'public' : current.visibility || 'public',
        options: needsOptions(type)
          ? current.options && current.options.length > 0
            ? current.options
            : [{ id: createId('o'), label: '' }]
          : undefined,
        uploadConfig:
          type === 'file_upload'
            ? {
                allowedTypes: ['image', 'pdf'],
                maxSizeMB: 10,
                maxFiles: 1,
              }
            : undefined,
      };
      return next;
    });
  };

  const addQuestion = () => setQuestions(prev => [...prev, createQuestion('short_text', prev.length)]);

  const removeQuestion = (index: number) => {
    setQuestions(prev => {
      if (prev.length <= 1) {
        return prev;
      }
      const next = prev.filter((_, idx) => idx !== index);
      return next.map((item, idx) => ({ ...item, order: idx }));
    });
  };

  const addOption = (questionIndex: number) => {
    setQuestions(prev => {
      const question = prev[questionIndex];
      if (!question || !needsOptions(question.type)) {
        return prev;
      }
      const options = [...(question.options || []), { id: createId('o'), label: '' }];
      return prev.map((item, idx) => (idx === questionIndex ? { ...item, options } : item));
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(prev => {
      const question = prev[questionIndex];
      if (!question || !question.options) {
        return prev;
      }
      const options = question.options.map((item, idx) => (idx === optionIndex ? { ...item, label: value } : item));
      return prev.map((item, idx) => (idx === questionIndex ? { ...item, options } : item));
    });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(prev => {
      const question = prev[questionIndex];
      if (!question || !question.options || question.options.length <= 1) {
        return prev;
      }
      const options = question.options.filter((_, idx) => idx !== optionIndex);
      return prev.map((item, idx) => (idx === questionIndex ? { ...item, options } : item));
    });
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setError('Informe um título para o formulário.');
      return false;
    }

    if (questions.length === 0) {
      setError('Adicione ao menos uma pergunta.');
      return false;
    }

    for (const question of questions) {
      if (!question.title.trim()) {
        setError('Todas as perguntas precisam ter título.');
        return false;
      }
      if (needsOptions(question.type)) {
        const validOptions = (question.options || []).filter(item => item.label.trim());
        if (validOptions.length < 2) {
          setError(`A pergunta "${question.title}" precisa de pelo menos 2 opções.`);
          return false;
        }
      }
    }

    return true;
  };

  const saveForm = async () => {
    setError('');
    if (!validateForm()) {
      return;
    }

    const payloadQuestions = questions.map((question, index) => ({
      ...question,
      title: question.title.trim(),
      visibility: question.type === 'file_upload' ? 'public' : question.visibility || 'public',
      helpText: question.helpText?.trim() || '',
      order: index,
      options: needsOptions(question.type)
        ? (question.options || [])
            .map(item => ({ ...item, label: item.label.trim() }))
            .filter(item => item.label.length > 0)
        : undefined,
    }));

    const validResponseTitleQuestionId = payloadQuestions.some(
      question => question.id === responseTitleQuestionId && question.type !== 'file_upload'
    )
      ? responseTitleQuestionId
      : '';

    setSaving(true);
    try {
      if (editingFormId) {
        await updateMn10FormMeta(editingFormId, {
          title,
          description,
          status,
          responseTitleQuestionId: validResponseTitleQuestionId || null,
        });
        await updateMn10FormStructure(editingFormId, payloadQuestions);
        notify('Formulário atualizado com sucesso.');
      } else {
        if (!currentUser) {
          throw new Error('Sessão inválida para criar formulário.');
        }
        await createMn10Form({
          title,
          description,
          status,
          publicId: publicIdCode.trim() || undefined,
          questions: payloadQuestions,
          responseTitleQuestionId: validResponseTitleQuestionId || undefined,
          createdByUid: currentUser.uid,
          createdByEmail: currentUser.email || 'usuario@local',
        });
        notify('Formulário criado com sucesso.');
      }

      clearEditor();
      setIsEditorOpen(false);
      await loadForms();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar formulário.');
    } finally {
      setSaving(false);
    }
  };

  const openNewForm = () => {
    clearEditor();
    setIsEditorOpen(true);
  };

  const closeEditor = () => setIsEditorOpen(false);

  const editForm = (form: MN10Form) => {
    setIsEditorOpen(true);
    setEditingFormId(form.id);
    setTitle(form.title);
    setDescription(form.description || '');
    setPublicIdCode(form.publicId || '');
    setStatus(form.status);
    setResponseTitleQuestionId(form.responseTitleQuestionId || '');
    setQuestions(
      form.questions.length > 0
        ? form.questions
            .slice()
            .sort((a, b) => a.order - b.order)
            .map(question => ({
              ...question,
              visibility: question.type === 'file_upload' ? 'public' : question.visibility || 'public',
              options: question.options || (needsOptions(question.type) ? [{ id: createId('o'), label: '' }] : undefined),
              uploadConfig:
                question.type === 'file_upload'
                  ? {
                      allowedTypes: question.uploadConfig?.allowedTypes || ['image', 'pdf'],
                      maxSizeMB: question.uploadConfig?.maxSizeMB || 10,
                      maxFiles: question.uploadConfig?.maxFiles || 1,
                    }
                  : undefined,
            }))
        : [createQuestion('short_text', 0)]
    );
  };

  // Celular: menu nativo de compartilhamento; demais casos (ou falha do menu): copia o link
  const shareLink = async (form: MN10Form) => {
    const link = buildPublicLink(form);

    if (canNativeShare) {
      try {
        await navigator.share({ title: form.title, url: link });
        return;
      } catch (shareError) {
        if (shareError instanceof DOMException && shareError.name === 'AbortError') {
          return; // usuário fechou o menu de compartilhamento
        }
      }
    }

    try {
      await navigator.clipboard.writeText(link);
      notify('Link público copiado.');
    } catch (copyError) {
      console.error(copyError);
      setError('Falha ao copiar o link público.');
    }
  };

  const updateStatus = async (formId: string, nextStatus: MN10FormStatus) => {
    try {
      await updateMn10FormMeta(formId, { status: nextStatus });
      await loadForms();
      notify('Status atualizado.');
    } catch (statusError) {
      console.error(statusError);
      setError('Falha ao atualizar status.');
    }
  };

  const duplicate = async (formId: string) => {
    try {
      await duplicateMn10Form(formId);
      await loadForms();
      notify('Formulário duplicado em rascunho.');
    } catch (duplicateError) {
      console.error(duplicateError);
      setError('Falha ao duplicar formulário.');
    }
  };

  const deleteFormById = async (formId: string) => {
    try {
      await deleteMn10Form(formId);
      if (editingFormId === formId) {
        clearEditor();
      }
      if (selectedFormId === formId) {
        setSelectedFormId('');
      }
      await loadForms();
      notify('Formulário excluído.');
    } catch (deleteError) {
      console.error(deleteError);
      setError('Falha ao excluir formulário.');
    }
  };

  const removeForm = (form: MN10Form) => {
    setConfirmRequest({
      title: 'Excluir formulário',
      message: `Deseja excluir o formulário "${form.title}" e as respostas associadas?`,
      confirmLabel: 'Excluir',
      action: () => deleteFormById(form.id),
    });
  };

  const deleteResponseById = async (formId: string, responseId: string) => {
    try {
      await deleteMn10Response(formId, responseId);
      setShowResponseDetail(false);
      await loadForms();
      await loadResponses(formId);
      notify('Resposta excluída.');
    } catch (deleteError) {
      console.error(deleteError);
      setError('Falha ao excluir resposta.');
    }
  };

  const removeResponse = (formId: string, responseId: string) => {
    setConfirmRequest({
      title: 'Excluir resposta',
      message: 'Deseja excluir esta resposta? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      action: () => deleteResponseById(formId, responseId),
    });
  };

  const runConfirmedAction = async () => {
    if (!confirmRequest) {
      return;
    }
    setIsConfirming(true);
    try {
      await confirmRequest.action();
    } finally {
      setIsConfirming(false);
      setConfirmRequest(null);
    }
  };

  const selectResponse = (responseId: string) => {
    setSelectedResponseId(responseId);
    setShowResponseDetail(true);
  };

  const selectResponsesForm = (formId: string) => {
    setSelectedFormId(formId);
    setShowResponseDetail(false);
  };

  const updateInternalAnswerValue = (questionId: string, value: MN10AnswerValue) => {
    setInternalAnswersDraft(prev => ({ ...prev, [questionId]: value }));
  };

  const toggleInternalMultipleOption = (questionId: string, optionLabel: string, checked: boolean) => {
    setInternalAnswersDraft(prev => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      const next = checked ? [...current, optionLabel] : current.filter(item => item !== optionLabel);
      return { ...prev, [questionId]: next };
    });
  };

  const validateInternalAnswerFormats = (): string | null => {
    for (const question of selectedResponseInternalQuestions) {
      const value = internalAnswersDraft[question.id];
      if (typeof value !== 'string' || !value.trim()) {
        continue;
      }

      if (question.type === 'date' && !isCompleteMaskedDate(value)) {
        return `Data inválida em "${question.title}". Use dd/mm/aaaa.`;
      }

      if (question.type === 'phone' && !isCompleteMaskedPhone(value)) {
        return `Telefone inválido em "${question.title}". Use (xx)xxxxxxxxx.`;
      }
    }
    return null;
  };

  const saveInternalData = async () => {
    if (!selectedForm || !selectedResponse) {
      return;
    }

    const formatError = validateInternalAnswerFormats();
    if (formatError) {
      setError(formatError);
      return;
    }

    setSavingInternalAnswers(true);
    try {
      await updateMn10InternalAnswers({
        formId: selectedForm.id,
        responseId: selectedResponse.id,
        answers: internalAnswersDraft,
      });

      const freshResponse = await getMn10Response(selectedForm.id, selectedResponse.id);
      if (freshResponse) {
        setResponses(prev =>
          prev.map(item => (item.id === freshResponse.id ? freshResponse : item))
        );
        setInternalAnswersDraft({ ...(freshResponse.internalAnswers || {}) });
      }

      notify('Complemento interno salvo.');
    } catch (updateError) {
      console.error(updateError);
      setError(updateError instanceof Error ? updateError.message : 'Falha ao salvar complemento interno.');
    } finally {
      setSavingInternalAnswers(false);
    }
  };

  const exportPdf = async () => {
    if (!selectedForm || !selectedResponse) {
      return;
    }
    const freshResponse = await getMn10Response(selectedForm.id, selectedResponse.id);
    if (!freshResponse) {
      return;
    }
    MN10PdfService.generateMn10ResponsePDF(selectedForm, freshResponse);
  };

  return (
    <div ref={rootRef} className="scroll-mt-20 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-brand-dark">MN10 - Formulários Públicos</h2>
        <div
          role="tablist"
          aria-label="Seções do MN10"
          className="grid grid-cols-2 gap-1 rounded-brand bg-brand-gray p-1 sm:w-auto"
        >
          <ViewTabButton label="Formulários" icon="file-text" isActive={tab === 'forms'} onSelect={() => { setTab('forms'); setShowResponseDetail(false); }} />
          <ViewTabButton label="Respostas" icon="clipboard-list" isActive={tab === 'responses'} onSelect={() => { setTab('responses'); setShowResponseDetail(false); }} />
        </div>
      </div>

      {/* Avisos fixos: ficam visíveis onde o usuário está, acima da navegação inferior no celular */}
      {(message || error) && (
        <div className="pointer-events-none fixed inset-x-4 top-[calc(4.5rem+env(safe-area-inset-top))] z-40 flex flex-col gap-2 sm:bottom-6 sm:top-auto sm:left-auto sm:right-6 sm:w-full sm:max-w-sm">
          {message && (
            <div
              role="status"
              className="pointer-events-auto flex items-start gap-3 rounded-brand border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 shadow-lg"
            >
              <Icon name="circle-check" className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p className="min-w-0 flex-1 break-words">{message}</p>
              <button
                type="button"
                onClick={() => setMessage('')}
                aria-label="Fechar aviso"
                title="Fechar aviso"
                className="-my-2 -mr-2 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-brand hover:bg-green-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="pointer-events-auto flex items-start gap-3 rounded-brand border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-lg"
            >
              <Icon name="alert-circle" className="mt-0.5 h-5 w-5 flex-shrink-0" />
              <p className="min-w-0 flex-1 break-words">{error}</p>
              <button
                type="button"
                onClick={() => setError('')}
                aria-label="Fechar aviso"
                title="Fechar aviso"
                className="-my-2 -mr-2 inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-brand hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
              >
                <Icon name="x" className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'forms' ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
          {/* Editor: abaixo de xl só aparece depois de Editar/Novo; a lista vem primeiro */}
          <div className={`${isEditorOpen ? 'block' : 'hidden'} xl:col-span-2 xl:block`}>
            {/* overflow visível: o overflow-hidden padrão do Card quebraria a barra sticky de ações */}
            <Card className="!overflow-visible">
              <div className="space-y-5 p-4 sm:p-6">
                <div className="space-y-3">
                  <div className="xl:hidden">
                    <Button variant="ghost" size="sm" onClick={closeEditor} className="-ml-3">
                      <Icon name="arrow-left" className="h-4 w-4" />
                      Voltar à lista
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-brand-dark">{editingFormId ? 'Editar formulário' : 'Novo formulário'}</h3>
                    {editingFormId && (
                      <Button variant="secondary" size="sm" onClick={clearEditor}>
                        <Icon name="circle-plus" className="h-4 w-4" />
                        Novo
                      </Button>
                    )}
                  </div>
                </div>

                <Input label="Título" name="mn10Title" value={title} onChange={e => setTitle(e.target.value)} />
                <Textarea label="Descrição" name="mn10Description" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
                <div>
                  <Input
                    label="Código público do link"
                    name="mn10PublicId"
                    value={publicIdCode}
                    onChange={e => setPublicIdCode(e.target.value)}
                    placeholder="Ex: 012026"
                    disabled={Boolean(editingFormId)}
                  />
                  <p className="mt-1 break-all text-xs text-gray-500">
                    {editingFormId
                      ? `Link atual: /mn10/f/${publicIdCode}`
                      : 'Se vazio, o sistema gera automaticamente no formato MMyyyy (ex.: 022026).'}
                  </p>
                </div>

                <Select label="Status" name="mn10Status" value={status} onChange={e => setStatus(e.target.value as MN10FormStatus)}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="closed">Fechado</option>
                </Select>

                <div>
                  <Select
                    label="Campo título das respostas"
                    name="mn10ResponseTitleQuestion"
                    value={responseTitleQuestionId}
                    onChange={e => setResponseTitleQuestionId(e.target.value)}
                  >
                    <option value="">Padrão: ID da resposta</option>
                    {responseTitleQuestionOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.label}{option.isInternal ? ' (Interno)' : ''}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-gray-500">
                    Define qual resposta será usada como título na lista de respostas.
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-brand-dark">Perguntas</h4>

                  {questions.map((question, index) => (
                    <div key={question.id} className="space-y-3 rounded-lg border border-gray-200 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-brand-dark">Pergunta {index + 1}</p>
                        <Button variant="danger" size="sm" onClick={() => removeQuestion(index)} disabled={questions.length <= 1}>
                          <Icon name="trash" className="h-4 w-4" />
                          Remover
                        </Button>
                      </div>

                      <Input label="Título da pergunta" name={`q-title-${question.id}`} value={question.title} onChange={e => updateQuestion(index, { title: e.target.value })} />
                      <Select label="Tipo" name={`q-type-${question.id}`} value={question.type} onChange={e => setQuestionType(index, e.target.value as MN10QuestionType)}>
                        {QUESTION_TYPES.map(item => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </Select>
                      <Textarea label="Texto de ajuda" name={`q-help-${question.id}`} rows={2} value={question.helpText || ''} onChange={e => updateQuestion(index, { helpText: e.target.value })} />

                      <div>
                        <CheckRow
                          id={`q-required-${question.id}`}
                          label="Pergunta obrigatória"
                          checked={question.required}
                          onChange={checked => updateQuestion(index, { required: checked })}
                        />
                        <CheckRow
                          id={`q-internal-${question.id}`}
                          label="Campo interno (visível apenas para equipe MN10/Admin)"
                          checked={(question.visibility || 'public') === 'internal'}
                          onChange={checked => updateQuestion(index, { visibility: checked ? 'internal' : 'public' })}
                          disabled={question.type === 'file_upload'}
                        />
                      </div>
                      {question.type === 'file_upload' && (
                        <p className="text-xs text-gray-500">Campos de upload são sempre públicos.</p>
                      )}

                      {needsOptions(question.type) && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-gray-700">Opções</p>

                          {(question.options || []).map((option, optionIndex) => (
                            <div key={option.id} className="flex items-center gap-2">
                              <input
                                className={`${FIELD_CLASSES} min-w-0 flex-1`}
                                aria-label={`Opção ${optionIndex + 1}`}
                                placeholder={`Opção ${optionIndex + 1}`}
                                value={option.label}
                                onChange={e => updateOption(index, optionIndex, e.target.value)}
                              />
                              <Button
                                variant="danger"
                                size="sm"
                                className="h-11 w-11 flex-shrink-0 px-0"
                                onClick={() => removeOption(index, optionIndex)}
                                disabled={(question.options || []).length <= 1}
                                aria-label={`Remover opção ${optionIndex + 1}`}
                                title="Remover opção"
                              >
                                <Icon name="trash" className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}

                          <Button variant="secondary" size="sm" className="w-full sm:w-auto" onClick={() => addOption(index)}>
                            <Icon name="plus" className="h-4 w-4" />
                            Adicionar opção
                          </Button>
                        </div>
                      )}

                      {question.type === 'file_upload' && (
                        <div className="flex items-start gap-2 rounded-brand border border-brand-primary/20 bg-brand-light px-3 py-2 text-xs text-brand-primary">
                          <Icon name="info-circle" className="mt-0.5 h-4 w-4 flex-shrink-0" />
                          <span>Upload aceito: imagens e PDF, até 10 MB por arquivo.</span>
                        </div>
                      )}
                    </div>
                  ))}

                  <Button variant="secondary" className="w-full sm:w-auto" onClick={addQuestion}>
                    <Icon name="plus" className="h-4 w-4" />
                    Adicionar pergunta
                  </Button>
                </div>

                <div className={STICKY_ACTIONS_CLASSES}>
                  <Button variant="secondary" onClick={clearEditor} className="flex-1 sm:flex-none">Limpar</Button>
                  <Button onClick={saveForm} disabled={saving} className="flex-[2] sm:flex-none">
                    {saving ? <Icon name="loader-2" className="h-4 w-4 animate-spin" /> : <Icon name="device-floppy" className="h-4 w-4" />}
                    {editingFormId ? 'Salvar alterações' : 'Criar formulário'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Lista de formulários: primeira coisa no celular */}
          <div className={`${isEditorOpen ? 'hidden' : 'block'} xl:block`}>
            <Card>
              <div className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-brand-dark">Formulários</h3>
                  {loadingForms && <Icon name="loader-2" className="h-4 w-4 animate-spin text-brand-primary" />}
                </div>

                <Button className="w-full xl:hidden" onClick={openNewForm}>
                  <Icon name="circle-plus" className="h-4 w-4" />
                  Novo formulário
                </Button>

                {forms.length === 0 && !loadingForms ? (
                  <p className="text-sm text-gray-500">Nenhum formulário cadastrado.</p>
                ) : (
                  <div className="space-y-3 xl:max-h-[420px] xl:overflow-y-auto">
                    {forms.map(form => (
                      <div key={form.id} className="space-y-3 rounded-md border border-gray-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-semibold text-brand-dark">{form.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <p className="text-xs text-gray-500">{form.responseCount} resposta(s)</p>
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                Internos: {countInternalQuestions(form)}
                              </span>
                            </div>
                          </div>
                          <span className={`flex-shrink-0 rounded-full px-2 py-1 text-xs font-medium ${statusClass[form.status]}`}>{STATUS_LABEL[form.status]}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="secondary" size="sm" onClick={() => editForm(form)}>
                            <Icon name="pencil" className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => shareLink(form)}>
                            <Icon name={canNativeShare ? 'share' : 'copy'} className="h-4 w-4" />
                            {canNativeShare ? 'Compartilhar' : 'Copiar link'}
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {form.status !== 'published' && (
                            <Button variant="primary" size="sm" onClick={() => updateStatus(form.id, 'published')}>
                              <Icon name="send" className="h-4 w-4" />
                              Publicar
                            </Button>
                          )}
                          {form.status !== 'closed' && (
                            <Button variant="danger" size="sm" onClick={() => updateStatus(form.id, 'closed')}>
                              <Icon name="lock" className="h-4 w-4" />
                              Fechar
                            </Button>
                          )}
                          {form.status !== 'draft' && (
                            <Button variant="secondary" size="sm" onClick={() => updateStatus(form.id, 'draft')}>
                              <Icon name="file-text" className="h-4 w-4" />
                              Rascunho
                            </Button>
                          )}
                          <Button variant="secondary" size="sm" onClick={() => duplicate(form.id)}>
                            <Icon name="file-plus" className="h-4 w-4" />
                            Duplicar
                          </Button>
                          <Button variant="danger" size="sm" onClick={() => removeForm(form)}>
                            <Icon name="trash" className="h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
          {/* Master: lista de respostas (abaixo de xl some ao abrir um detalhe) */}
          <div className={`${showResponseDetail ? 'hidden' : 'block'} xl:col-span-1 xl:block`}>
            <Card>
              <div className="space-y-4 p-4">
                <Select label="Formulário" name="mn10ResponsesForm" value={selectedFormId} onChange={e => selectResponsesForm(e.target.value)}>
                  <option value="">Selecione...</option>
                  {forms.map(form => (
                    <option key={form.id} value={form.id}>{form.title} ({form.responseCount})</option>
                  ))}
                </Select>

                {loadingResponses ? (
                  <div className="flex items-center justify-center py-8"><Icon name="loader-2" className="h-6 w-6 animate-spin text-brand-primary" /></div>
                ) : (
                  <div className="space-y-2 xl:max-h-[500px] xl:overflow-y-auto">
                    {responses.map(response => {
                      const isSelected = selectedResponseId === response.id;
                      return (
                        <button
                          key={response.id}
                          type="button"
                          onClick={() => selectResponse(response.id)}
                          aria-current={isSelected ? 'true' : undefined}
                          className={`flex min-h-11 w-full items-center gap-2 rounded-md border p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary ${
                            isSelected ? 'border-brand-primary bg-brand-light' : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-sm font-semibold text-brand-dark">{resolveResponseCardTitle(response)}</span>
                            <span className="block text-xs text-gray-500">{new Date(response.submittedAt).toLocaleString('pt-BR')}</span>
                          </span>
                          <Icon name="chevron-right" className="h-4 w-4 flex-shrink-0 text-gray-500 xl:hidden" />
                        </button>
                      );
                    })}
                    {responses.length === 0 && <p className="text-sm text-gray-500">Nenhuma resposta.</p>}
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Detalhe da resposta: abaixo de xl ocupa a tela com botão para voltar à lista */}
          <div className={`${showResponseDetail ? 'block' : 'hidden'} xl:col-span-2 xl:block`}>
            <div className="mb-3 xl:hidden">
              <Button variant="secondary" size="sm" onClick={() => setShowResponseDetail(false)}>
                <Icon name="arrow-left" className="h-4 w-4" />
                Voltar às respostas
              </Button>
            </div>
            {/* overflow visível: o overflow-hidden padrão do Card quebraria a barra sticky de ações */}
            <Card className="!overflow-visible">
              <div className="space-y-4 p-4 sm:p-6">
                {!selectedForm || !selectedResponse ? (
                  <p className="text-sm text-gray-500">Selecione um formulário e uma resposta para ver os detalhes.</p>
                ) : (
                  <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-bold text-brand-dark">{selectedForm.title}</h3>
                        <p className="break-all text-sm text-gray-500">Resposta {selectedResponse.id} - {new Date(selectedResponse.submittedAt).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-shrink-0">
                        <Button variant="secondary" size="sm" onClick={exportPdf}>
                          <Icon name="file-text" className="h-4 w-4" />
                          Gerar PDF
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => removeResponse(selectedForm.id, selectedResponse.id)}>
                          <Icon name="trash" className="h-4 w-4" />
                          Excluir
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-brand-dark">Resposta pública</h4>
                        {selectedResponsePublicQuestions.length === 0 && (
                          <p className="text-sm text-gray-500">Nenhum campo público respondido.</p>
                        )}
                        {selectedResponsePublicQuestions.map(question => {
                          const files = selectedResponse.attachments.filter(item => item.questionId === question.id);
                          return (
                            <div key={question.id} className="rounded-md border border-gray-200 p-3">
                              <p className="break-words text-sm font-semibold text-brand-dark">{question.title}</p>
                              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">{formatAnswer(question, selectedResponse)}</p>
                              {files.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {files.map(file => (
                                    <div key={file.path} className="flex flex-wrap items-center gap-x-3 text-xs text-gray-600">
                                      {attachmentLinks[file.path] ? (
                                        <a
                                          className="inline-flex min-h-11 min-w-0 items-center gap-2 break-all text-sm font-medium text-brand-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                          href={attachmentLinks[file.path]}
                                          target="_blank"
                                          rel="noreferrer"
                                        >
                                          <Icon name="download" className="h-4 w-4 flex-shrink-0" />
                                          {file.fileName}
                                        </a>
                                      ) : (
                                        <span className="break-all">{file.fileName}</span>
                                      )}
                                      <span className="text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-3 border-t border-gray-200 pt-4">
                        <div>
                          <h4 className="font-semibold text-brand-dark">Complemento interno (MN10/Admin)</h4>
                          {selectedResponse.internalUpdatedAt && (
                            <p className="text-xs text-gray-500">
                              Última atualização interna: {new Date(selectedResponse.internalUpdatedAt).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>

                        {selectedResponseInternalQuestions.length === 0 && (
                          <p className="text-sm text-gray-500">Este formulário não possui campos internos.</p>
                        )}

                        {selectedResponseInternalQuestions.map(question => {
                          const currentValue = internalAnswersDraft[question.id];

                          return (
                            <div key={question.id} className="space-y-2 rounded-md border border-gray-200 p-3">
                              <p className="break-words text-sm font-semibold text-brand-dark">
                                {question.title}
                                {question.required && <span className="ml-1 text-red-600">*</span>}
                              </p>
                              {question.helpText && <p className="break-words text-xs text-gray-500">{question.helpText}</p>}

                              {question.type === 'short_text' && (
                                <input
                                  type="text"
                                  aria-label={question.title}
                                  className={FIELD_CLASSES}
                                  value={String(currentValue || '')}
                                  onChange={e => updateInternalAnswerValue(question.id, e.target.value)}
                                />
                              )}

                              {question.type === 'long_text' && (
                                <textarea
                                  rows={4}
                                  aria-label={question.title}
                                  className={FIELD_CLASSES}
                                  value={String(currentValue || '')}
                                  onChange={e => updateInternalAnswerValue(question.id, e.target.value)}
                                />
                              )}

                              {question.type === 'date' && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      aria-label={question.title}
                                      placeholder="dd/mm/aaaa"
                                      className={`${FIELD_CLASSES} min-w-0 flex-1`}
                                      value={String(currentValue || '')}
                                      onChange={e => updateInternalAnswerValue(question.id, applyDateMask(e.target.value))}
                                    />
                                    <button
                                      type="button"
                                      aria-label="Abrir calendário"
                                      title="Abrir calendário"
                                      className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-brand border border-gray-300 bg-white text-brand-primary hover:bg-brand-light focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary"
                                      onClick={() =>
                                        setOpenInternalCalendarQuestionId(prev => (prev === question.id ? null : question.id))
                                      }
                                    >
                                      <Icon name="calendar-event" className="h-5 w-5" />
                                    </button>
                                  </div>
                                  {openInternalCalendarQuestionId === question.id && (
                                    <div className="rounded-md border border-gray-200 bg-white p-2">
                                      <input
                                        type="date"
                                        aria-label={`Escolher data para ${question.title}`}
                                        className={FIELD_CLASSES}
                                        value={maskedDateToIso(String(currentValue || '')) || ''}
                                        onChange={e => {
                                          updateInternalAnswerValue(question.id, isoDateToMasked(e.target.value));
                                          setOpenInternalCalendarQuestionId(null);
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {question.type === 'phone' && (
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  aria-label={question.title}
                                  placeholder="(xx)xxxxxxxxx"
                                  className={FIELD_CLASSES}
                                  value={String(currentValue || '')}
                                  onChange={e => updateInternalAnswerValue(question.id, applyPhoneMask(e.target.value))}
                                />
                              )}

                              {(question.type === 'single_choice' || question.type === 'dropdown') && (
                                <select
                                  aria-label={question.title}
                                  className={FIELD_CLASSES}
                                  value={String(currentValue || '')}
                                  onChange={e => updateInternalAnswerValue(question.id, e.target.value)}
                                >
                                  <option value="">Selecione...</option>
                                  {(question.options || []).map(option => (
                                    <option key={option.id} value={option.label}>{option.label}</option>
                                  ))}
                                </select>
                              )}

                              {question.type === 'multiple_choice' && (
                                <div>
                                  {(question.options || []).map(option => {
                                    const selectedValues = Array.isArray(currentValue) ? (currentValue as string[]) : [];
                                    return (
                                      <CheckRow
                                        key={option.id}
                                        id={`internal-${question.id}-${option.id}`}
                                        label={option.label}
                                        checked={selectedValues.includes(option.label)}
                                        onChange={checked => toggleInternalMultipleOption(question.id, option.label, checked)}
                                      />
                                    );
                                  })}
                                </div>
                              )}

                              {question.type === 'boolean' && (
                                <CheckRow
                                  id={`internal-bool-${question.id}`}
                                  label="Sim"
                                  checked={Boolean(currentValue)}
                                  onChange={checked => updateInternalAnswerValue(question.id, checked)}
                                />
                              )}

                              {question.type === 'file_upload' && (
                                <p className="text-xs text-gray-500">
                                  Upload interno não está habilitado neste modo.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {selectedResponseInternalQuestions.length > 0 && (
                      <div className={STICKY_ACTIONS_CLASSES}>
                        <Button onClick={saveInternalData} disabled={savingInternalAnswers} className="w-full sm:w-auto">
                          {savingInternalAnswers ? <Icon name="loader-2" className="h-4 w-4 animate-spin" /> : <Icon name="device-floppy" className="h-4 w-4" />}
                          Salvar complemento
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmRequest !== null}
        title={confirmRequest?.title ?? ''}
        message={confirmRequest?.message}
        confirmLabel={confirmRequest?.confirmLabel}
        isLoading={isConfirming}
        onConfirm={runConfirmedAction}
        onCancel={closeConfirm}
      />
    </div>
  );
};

export default MN10Dashboard;
