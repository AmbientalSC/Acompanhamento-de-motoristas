import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Copy, FilePlus2, FileText, Loader2, Plus, Save, Trash2 } from 'lucide-react';
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
  { value: 'long_text', label: 'Paragrafo' },
  { value: 'single_choice', label: 'Escolha unica' },
  { value: 'multiple_choice', label: 'Multipla escolha' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'date', label: 'Data' },
  { value: 'phone', label: 'Telefone' },
  { value: 'boolean', label: 'Sim/nao' },
  { value: 'file_upload', label: 'Upload' },
];

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
    return value ? 'Sim' : 'Nao';
  }
  if (value === undefined || value === null || value === '') {
    return 'Sem resposta';
  }
  return String(value);
};

const statusClass: Record<MN10FormStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  published: 'bg-green-100 text-green-700',
  closed: 'bg-red-100 text-red-700',
};

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

  const clearEditor = () => {
    setEditingFormId(null);
    setTitle('');
    setDescription('');
    setPublicIdCode('');
    setStatus('draft');
    setQuestions([createQuestion('short_text', 0)]);
  };

  const notify = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 2800);
  };

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
      setError('Falha ao carregar formularios MN10.');
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
      setError('Falha ao carregar respostas do formulario.');
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
      const next = [...prev];
      const question = next[questionIndex];
      if (!question || !needsOptions(question.type)) {
        return prev;
      }
      question.options = [...(question.options || []), { id: createId('o'), label: '' }];
      return next;
    });
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    setQuestions(prev => {
      const next = [...prev];
      const question = next[questionIndex];
      if (!question || !question.options) {
        return prev;
      }
      question.options = question.options.map((item, idx) => (idx === optionIndex ? { ...item, label: value } : item));
      return next;
    });
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(prev => {
      const next = [...prev];
      const question = next[questionIndex];
      if (!question || !question.options || question.options.length <= 1) {
        return prev;
      }
      question.options = question.options.filter((_, idx) => idx !== optionIndex);
      return next;
    });
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      setError('Informe um titulo para o formulario.');
      return false;
    }

    if (questions.length === 0) {
      setError('Adicione ao menos uma pergunta.');
      return false;
    }

    for (const question of questions) {
      if (!question.title.trim()) {
        setError('Todas as perguntas precisam ter titulo.');
        return false;
      }
      if (needsOptions(question.type)) {
        const validOptions = (question.options || []).filter(item => item.label.trim());
        if (validOptions.length < 2) {
          setError(`A pergunta "${question.title}" precisa de pelo menos 2 opcoes.`);
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

    setSaving(true);
    try {
      if (editingFormId) {
        await updateMn10FormMeta(editingFormId, { title, description, status });
        await updateMn10FormStructure(editingFormId, payloadQuestions);
        notify('Formulario atualizado com sucesso.');
      } else {
        if (!currentUser) {
          throw new Error('Sessao invalida para criar formulario.');
        }
        await createMn10Form({
          title,
          description,
          status,
          publicId: publicIdCode.trim() || undefined,
          questions: payloadQuestions,
          createdByUid: currentUser.uid,
          createdByEmail: currentUser.email || 'usuario@local',
        });
        notify('Formulario criado com sucesso.');
      }

      clearEditor();
      await loadForms();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Falha ao salvar formulario.');
    } finally {
      setSaving(false);
    }
  };

  const editForm = (form: MN10Form) => {
    setEditingFormId(form.id);
    setTitle(form.title);
    setDescription(form.description || '');
    setPublicIdCode(form.publicId || '');
    setStatus(form.status);
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

  const copyLink = async (form: MN10Form) => {
    try {
      const link = new URL(`${import.meta.env.BASE_URL}mn10/f/${form.publicId}`, window.location.origin).toString();
      await navigator.clipboard.writeText(link);
      notify('Link publico copiado.');
    } catch (copyError) {
      console.error(copyError);
      setError('Falha ao copiar o link publico.');
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
      notify('Formulario duplicado em rascunho.');
    } catch (duplicateError) {
      console.error(duplicateError);
      setError('Falha ao duplicar formulario.');
    }
  };

  const removeForm = async (formId: string) => {
    if (!window.confirm('Deseja excluir este formulario e as respostas associadas?')) {
      return;
    }
    try {
      await deleteMn10Form(formId);
      if (editingFormId === formId) {
        clearEditor();
      }
      if (selectedFormId === formId) {
        setSelectedFormId('');
      }
      await loadForms();
      notify('Formulario excluido.');
    } catch (deleteError) {
      console.error(deleteError);
      setError('Falha ao excluir formulario.');
    }
  };

  const removeResponse = async (formId: string, responseId: string) => {
    if (!window.confirm('Deseja excluir esta resposta?')) {
      return;
    }
    try {
      await deleteMn10Response(formId, responseId);
      await loadForms();
      await loadResponses(formId);
      notify('Resposta excluida.');
    } catch (deleteError) {
      console.error(deleteError);
      setError('Falha ao excluir resposta.');
    }
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
        return `Data invalida em "${question.title}". Use dd/mm/aaaa.`;
      }

      if (question.type === 'phone' && !isCompleteMaskedPhone(value)) {
        return `Telefone invalido em "${question.title}". Use (xx)xxxxxxxxx.`;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-brand-dark">MN10 - Formularios Publicos</h2>
        <div className="flex gap-2">
          <Button variant={tab === 'forms' ? 'primary' : 'secondary'} onClick={() => setTab('forms')} className="!py-2 !px-4 text-sm">
            Formularios
          </Button>
          <Button variant={tab === 'responses' ? 'primary' : 'secondary'} onClick={() => setTab('responses')} className="!py-2 !px-4 text-sm">
            Respostas
          </Button>
        </div>
      </div>

      {message && <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</div>}
      {error && <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {tab === 'forms' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Card>
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-lg font-bold text-brand-dark">{editingFormId ? 'Editar formulario' : 'Novo formulario'}</h3>
                  <div className="flex gap-2">
                    {editingFormId && <Button variant="secondary" className="!py-1 !px-3 text-sm" onClick={clearEditor}>Novo</Button>}
                  </div>
                </div>

                <Input label="Titulo" name="mn10Title" value={title} onChange={e => setTitle(e.target.value)} />
                <Textarea label="Descricao" name="mn10Description" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
                <Input
                  label="Codigo publico do link"
                  name="mn10PublicId"
                  value={publicIdCode}
                  onChange={e => setPublicIdCode(e.target.value)}
                  placeholder="Ex: 012026"
                  disabled={Boolean(editingFormId)}
                />
                <p className="text-xs text-gray-500">
                  {editingFormId
                    ? `Link atual: /mn10/f/${publicIdCode}`
                    : 'Se vazio, o sistema gera automaticamente no formato MMyyyy (ex.: 022026).'}
                </p>

                <Select label="Status" name="mn10Status" value={status} onChange={e => setStatus(e.target.value as MN10FormStatus)}>
                  <option value="draft">Rascunho</option>
                  <option value="published">Publicado</option>
                  <option value="closed">Fechado</option>
                </Select>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-brand-dark">Perguntas</h4>
                  </div>

                  {questions.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-gray-700">Pergunta {index + 1}</p>
                        <Button variant="secondary" className="!py-1 !px-2 text-xs !bg-red-100 !text-red-700 hover:!bg-red-200" onClick={() => removeQuestion(index)} disabled={questions.length <= 1}>
                          <Trash2 className="h-3 w-3 mr-1" />
                          Remover
                        </Button>
                      </div>

                      <Input label="Titulo da pergunta" name={`q-title-${question.id}`} value={question.title} onChange={e => updateQuestion(index, { title: e.target.value })} />
                      <Select label="Tipo" name={`q-type-${question.id}`} value={question.type} onChange={e => setQuestionType(index, e.target.value as MN10QuestionType)}>
                        {QUESTION_TYPES.map(item => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </Select>
                      <Textarea label="Texto de ajuda" name={`q-help-${question.id}`} rows={2} value={question.helpText || ''} onChange={e => updateQuestion(index, { helpText: e.target.value })} />

                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" checked={question.required} onChange={e => updateQuestion(index, { required: e.target.checked })} />
                        Pergunta obrigatoria
                      </label>

                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={(question.visibility || 'public') === 'internal'}
                          onChange={e => updateQuestion(index, { visibility: e.target.checked ? 'internal' : 'public' })}
                          disabled={question.type === 'file_upload'}
                        />
                        Campo interno (visivel apenas para equipe MN10/Admin)
                      </label>
                      {question.type === 'file_upload' && (
                        <p className="text-xs text-gray-500">Campos de upload sao sempre publicos.</p>
                      )}

                      {needsOptions(question.type) && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-700">Opcoes</p>
                            <Button variant="secondary" className="!py-1 !px-2 text-xs" onClick={() => addOption(index)}>
                              <Plus className="h-3 w-3 mr-1" />
                              Opcao
                            </Button>
                          </div>

                          {(question.options || []).map((option, optionIndex) => (
                            <div key={option.id} className="flex items-center gap-2">
                              <input className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" value={option.label} onChange={e => updateOption(index, optionIndex, e.target.value)} />
                              <Button variant="secondary" className="!py-1 !px-2 text-xs !bg-red-100 !text-red-700 hover:!bg-red-200" onClick={() => removeOption(index, optionIndex)} disabled={(question.options || []).length <= 1}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'file_upload' && (
                        <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                          Upload aceito: imagens e PDF, ate 10 MB por arquivo.
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex justify-start">
                    <Button variant="secondary" className="!py-2 !px-4 text-sm" onClick={addQuestion}>
                      <Plus className="h-4 w-4 mr-1" />
                      + Adicionar
                    </Button>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={clearEditor}>Limpar</Button>
                  <Button onClick={saveForm} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    {editingFormId ? 'Salvar alteracoes' : 'Criar formulario'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <Card>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-brand-dark">Formularios</h3>
                  {loadingForms && <Loader2 className="h-4 w-4 animate-spin text-brand-primary" />}
                </div>

                {forms.length === 0 && !loadingForms ? (
                  <p className="text-sm text-gray-500">Nenhum formulario cadastrado.</p>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto">
                    {forms.map(form => (
                      <div key={form.id} className="border border-gray-200 rounded-md p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm text-gray-800">{form.title}</p>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <p className="text-xs text-gray-500">{form.responseCount} resposta(s)</p>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 text-amber-800">
                                Internos: {countInternalQuestions(form)}
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass[form.status]}`}>{STATUS_LABEL[form.status]}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button variant="secondary" className="!py-1 !px-2 text-xs" onClick={() => editForm(form)}>Editar</Button>
                          <Button variant="secondary" className="!py-1 !px-2 text-xs" onClick={() => duplicate(form.id)}><FilePlus2 className="h-3 w-3 mr-1" />Duplicar</Button>
                          <Button variant="secondary" className="!py-1 !px-2 text-xs" onClick={() => copyLink(form)}><Copy className="h-3 w-3 mr-1" />Link</Button>
                          {form.status !== 'published' && <Button variant="secondary" className="!py-1 !px-2 text-xs !bg-green-100 !text-green-700 hover:!bg-green-200" onClick={() => updateStatus(form.id, 'published')}>Publicar</Button>}
                          {form.status !== 'closed' && <Button variant="secondary" className="!py-1 !px-2 text-xs !bg-red-100 !text-red-700 hover:!bg-red-200" onClick={() => updateStatus(form.id, 'closed')}>Fechar</Button>}
                          {form.status !== 'draft' && <Button variant="secondary" className="!py-1 !px-2 text-xs" onClick={() => updateStatus(form.id, 'draft')}>Rascunho</Button>}
                          <Button variant="secondary" className="!py-1 !px-2 text-xs !bg-red-100 !text-red-700 hover:!bg-red-200" onClick={() => removeForm(form.id)}><Trash2 className="h-3 w-3 mr-1" />Excluir</Button>
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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1">
            <Card>
              <div className="p-4 space-y-4">
                <Select label="Formulario" name="mn10ResponsesForm" value={selectedFormId} onChange={e => setSelectedFormId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {forms.map(form => (
                    <option key={form.id} value={form.id}>{form.title} ({form.responseCount})</option>
                  ))}
                </Select>

                {loadingResponses ? (
                  <div className="flex justify-center items-center py-8"><Loader2 className="h-6 w-6 animate-spin text-brand-primary" /></div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {responses.map(response => (
                      <button key={response.id} type="button" onClick={() => setSelectedResponseId(response.id)} className={`w-full text-left p-3 rounded-md border ${selectedResponseId === response.id ? 'border-brand-primary bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <p className="text-sm font-semibold text-gray-800">Resposta {response.id.slice(-6)}</p>
                        <p className="text-xs text-gray-500">{new Date(response.submittedAt).toLocaleString('pt-BR')}</p>
                      </button>
                    ))}
                    {responses.length === 0 && <p className="text-sm text-gray-500">Nenhuma resposta.</p>}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="xl:col-span-2">
            <Card>
              <div className="p-6 space-y-4">
                {!selectedForm || !selectedResponse ? (
                  <p className="text-sm text-gray-500">Selecione um formulario e uma resposta para ver os detalhes.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="text-lg font-bold text-brand-dark">{selectedForm.title}</h3>
                        <p className="text-sm text-gray-500">Resposta {selectedResponse.id} - {new Date(selectedResponse.submittedAt).toLocaleString('pt-BR')}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="secondary" className="!py-2 !px-3 text-sm" onClick={exportPdf}><FileText className="h-4 w-4 mr-1" />Gerar PDF</Button>
                        <Button variant="secondary" className="!py-2 !px-3 text-sm !bg-red-100 !text-red-700 hover:!bg-red-200" onClick={() => removeResponse(selectedForm.id, selectedResponse.id)}><Trash2 className="h-4 w-4 mr-1" />Excluir</Button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-3">
                        <h4 className="font-semibold text-brand-dark">Resposta publica</h4>
                        {selectedResponsePublicQuestions.length === 0 && (
                          <p className="text-sm text-gray-500">Nenhum campo publico respondido.</p>
                        )}
                        {selectedResponsePublicQuestions.map(question => {
                          const files = selectedResponse.attachments.filter(item => item.questionId === question.id);
                          return (
                            <div key={question.id} className="border border-gray-200 rounded-md p-3">
                              <p className="font-semibold text-sm text-gray-800">{question.title}</p>
                              <p className="text-sm text-gray-600 mt-1">{formatAnswer(question, selectedResponse)}</p>
                              {files.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {files.map(file => (
                                    <div key={file.path} className="text-xs text-gray-600">
                                      {attachmentLinks[file.path] ? <a className="text-brand-primary hover:underline" href={attachmentLinks[file.path]} target="_blank" rel="noreferrer">{file.fileName}</a> : <span>{file.fileName}</span>}
                                      <span className="ml-2 text-gray-500">({(file.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="border-t border-gray-200 pt-4 space-y-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <h4 className="font-semibold text-brand-dark">Complemento interno (MN10/Admin)</h4>
                            {selectedResponse.internalUpdatedAt && (
                              <p className="text-xs text-gray-500">
                                Ultima atualizacao interna: {new Date(selectedResponse.internalUpdatedAt).toLocaleString('pt-BR')}
                              </p>
                            )}
                          </div>
                          <Button
                            className="!py-2 !px-3 text-sm"
                            onClick={saveInternalData}
                            disabled={savingInternalAnswers || selectedResponseInternalQuestions.length === 0}
                          >
                            {savingInternalAnswers ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
                            Salvar complemento
                          </Button>
                        </div>

                        {selectedResponseInternalQuestions.length === 0 && (
                          <p className="text-sm text-gray-500">Este formulario nao possui campos internos.</p>
                        )}

                        {selectedResponseInternalQuestions.map(question => {
                          const currentValue = internalAnswersDraft[question.id];

                          return (
                            <div key={question.id} className="border border-gray-200 rounded-md p-3 space-y-2">
                              <p className="font-semibold text-sm text-gray-800">
                                {question.title}
                                {question.required && <span className="text-red-500 ml-1">*</span>}
                              </p>
                              {question.helpText && <p className="text-xs text-gray-500">{question.helpText}</p>}

                              {question.type === 'short_text' && (
                                <input
                                  type="text"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  value={String(currentValue || '')}
                                  onChange={e => updateInternalAnswerValue(question.id, e.target.value)}
                                />
                              )}

                              {question.type === 'long_text' && (
                                <textarea
                                  rows={4}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  value={String(currentValue || '')}
                                  onChange={e => updateInternalAnswerValue(question.id, e.target.value)}
                                />
                              )}

                              {question.type === 'date' && (
                                <div className="space-y-2">
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      inputMode="numeric"
                                      placeholder="dd/mm/aaaa"
                                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                      value={String(currentValue || '')}
                                      onChange={e => updateInternalAnswerValue(question.id, applyDateMask(e.target.value))}
                                    />
                                    <button
                                      type="button"
                                      aria-label="Abrir calendario"
                                      className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                                      onClick={() =>
                                        setOpenInternalCalendarQuestionId(prev => (prev === question.id ? null : question.id))
                                      }
                                    >
                                      <CalendarDays className="h-4 w-4" />
                                    </button>
                                  </div>
                                  {openInternalCalendarQuestionId === question.id && (
                                    <div className="rounded-md border border-gray-200 bg-white p-2">
                                      <input
                                        type="date"
                                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
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
                                  placeholder="(xx)xxxxxxxxx"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                  value={String(currentValue || '')}
                                  onChange={e => updateInternalAnswerValue(question.id, applyPhoneMask(e.target.value))}
                                />
                              )}

                              {(question.type === 'single_choice' || question.type === 'dropdown') && (
                                <select
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                                <div className="space-y-2">
                                  {(question.options || []).map(option => {
                                    const selectedValues = Array.isArray(currentValue) ? (currentValue as string[]) : [];
                                    return (
                                      <label key={option.id} className="flex items-center gap-2 text-sm text-gray-700">
                                        <input
                                          type="checkbox"
                                          checked={selectedValues.includes(option.label)}
                                          onChange={e => toggleInternalMultipleOption(question.id, option.label, e.target.checked)}
                                        />
                                        {option.label}
                                      </label>
                                    );
                                  })}
                                </div>
                              )}

                              {question.type === 'boolean' && (
                                <label className="flex items-center gap-2 text-sm text-gray-700">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(currentValue)}
                                    onChange={e => updateInternalAnswerValue(question.id, e.target.checked)}
                                  />
                                  Sim
                                </label>
                              )}

                              {question.type === 'file_upload' && (
                                <p className="text-xs text-gray-500">
                                  Upload interno nao esta habilitado neste modo.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default MN10Dashboard;
