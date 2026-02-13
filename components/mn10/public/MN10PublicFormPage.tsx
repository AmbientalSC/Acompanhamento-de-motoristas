import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarDays, Loader2 } from 'lucide-react';
import type { MN10AnswerValue, MN10Form, MN10Question } from '../../../types';
import { getMn10FormByPublicId, submitMn10Response } from '../../../services/mn10Service';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import {
  applyDateMask,
  applyPhoneMask,
  isCompleteMaskedDate,
  isCompleteMaskedPhone,
  isoDateToMasked,
  maskedDateToIso,
} from '../../../utils/mn10FieldUtils';

type Answers = Record<string, MN10AnswerValue>;
type FilesByQuestion = Record<string, File[]>;

const allowedFile = (file: File): boolean => file.type.startsWith('image/') || file.type === 'application/pdf';

const isInternalQuestion = (question: MN10Question): boolean => question.visibility === 'internal';

const validateRequired = (
  questions: MN10Question[],
  answers: Answers,
  filesByQuestion: FilesByQuestion
): string | null => {
  for (const question of questions) {
    if (!question.required) {
      continue;
    }

    const value = answers[question.id];

    if (question.type === 'file_upload') {
      if (!(filesByQuestion[question.id] || []).length) {
        return `Campo obrigatorio: ${question.title}`;
      }
      continue;
    }

    if (question.type === 'multiple_choice') {
      if (!Array.isArray(value) || value.length === 0) {
        return `Campo obrigatorio: ${question.title}`;
      }
      continue;
    }

    if (question.type === 'boolean') {
      if (typeof value !== 'boolean') {
        return `Campo obrigatorio: ${question.title}`;
      }
      continue;
    }

    if (typeof value !== 'string' || !value.trim()) {
      return `Campo obrigatorio: ${question.title}`;
    }
  }

  return null;
};

const validateAnswerFormats = (questions: MN10Question[], answers: Answers): string | null => {
  for (const question of questions) {
    const value = answers[question.id];
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

const renderQuestionLabel = (question: MN10Question) => (
  <label className="block text-sm font-medium text-gray-800 mb-1">
    {question.title}
    {question.required && <span className="text-red-500 ml-1">*</span>}
  </label>
);

const MN10PublicFormPage: React.FC = () => {
  const { publicId = '' } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<MN10Form | null>(null);

  const [answers, setAnswers] = useState<Answers>({});
  const [filesByQuestion, setFilesByQuestion] = useState<FilesByQuestion>({});
  const [openCalendarQuestionId, setOpenCalendarQuestionId] = useState<string | null>(null);

  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ responseId: string; submittedAt: number } | null>(null);

  const orderedQuestions = useMemo(() => {
    return (form?.questions || [])
      .filter(question => !isInternalQuestion(question))
      .slice()
      .sort((a, b) => a.order - b.order);
  }, [form]);

  useEffect(() => {
    const loadForm = async () => {
      setLoading(true);
      try {
        const data = await getMn10FormByPublicId(publicId);
        setForm(data);
      } catch (loadError) {
        console.error(loadError);
        setError('Nao foi possivel carregar este formulario.');
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [publicId]);

  const updateAnswer = (questionId: string, value: MN10AnswerValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const updateFileAnswer = (question: MN10Question, files: FileList | null) => {
    if (!files) {
      return;
    }

    const list = Array.from(files);
    const maxFiles = question.uploadConfig?.maxFiles || 1;
    const maxSizeMb = question.uploadConfig?.maxSizeMB || 10;
    const maxBytes = maxSizeMb * 1024 * 1024;

    if (list.length > maxFiles) {
      setError(`A pergunta "${question.title}" permite no maximo ${maxFiles} arquivo(s).`);
      return;
    }

    for (const file of list) {
      if (!allowedFile(file)) {
        setError(`Arquivo nao permitido: ${file.name}`);
        return;
      }
      if (file.size > maxBytes) {
        setError(`Arquivo acima de ${maxSizeMb} MB: ${file.name}`);
        return;
      }
    }

    setError('');
    setFilesByQuestion(prev => ({ ...prev, [question.id]: list }));
  };

  const toggleMultipleOption = (questionId: string, optionLabel: string, checked: boolean) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      const next = checked ? [...current, optionLabel] : current.filter(item => item !== optionLabel);
      return { ...prev, [questionId]: next };
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) {
      return;
    }

    setError('');

    if (form.status !== 'published') {
      setError('Este formulario nao esta recebendo respostas no momento.');
      return;
    }

    const requiredError = validateRequired(orderedQuestions, answers, filesByQuestion);
    if (requiredError) {
      setError(requiredError);
      return;
    }

    const formatError = validateAnswerFormats(orderedQuestions, answers);
    if (formatError) {
      setError(formatError);
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitMn10Response({
        publicId: form.publicId,
        answers,
        filesByQuestion,
        honeypot,
        userAgent: window.navigator.userAgent,
      });
      setSuccess(result);
      setAnswers({});
      setFilesByQuestion({});
      setOpenCalendarQuestionId(null);
      setHoneypot('');
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : 'Falha ao enviar resposta.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 className="h-10 w-10 text-brand-primary animate-spin" />
      </div>
    );
  }

  if (!form || form.status === 'draft' || form.status === 'closed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-xl w-full">
          <div className="p-8 text-center space-y-3">
            <h1 className="text-2xl font-bold text-brand-dark">Formulario indisponivel</h1>
            <p className="text-gray-600">Este link nao esta aceitando respostas no momento.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-5">
        <Card>
          <div className="p-6 sm:p-8 space-y-4">
            <div className="flex justify-center">
              <div className="w-[220px] sm:w-[280px] h-[72px] sm:h-[88px] rounded-xl bg-white shadow-md border border-gray-100 flex items-center justify-center px-4">
                <img
                  src={`${import.meta.env.BASE_URL}ambiental.svg`}
                  alt="Ambiental"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-brand-dark">{form.title}</h1>
              {form.description && <p className="text-gray-600 text-sm sm:text-base mt-2">{form.description}</p>}
            </div>

            {success && (
              <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                Resposta enviada com sucesso! ID: {success.responseId} - {new Date(success.submittedAt).toLocaleString('pt-BR')}
              </div>
            )}
            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
            )}
          </div>
        </Card>

        <Card>
          <form onSubmit={submit} className="p-6 sm:p-8 space-y-6">
            <input
              type="text"
              name="hp"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
            />

            {orderedQuestions.length === 0 && (
              <div className="rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                Este formulario nao possui campos publicos para resposta.
              </div>
            )}

            {orderedQuestions.map(question => (
              <div key={question.id} className="border border-gray-200 rounded-md p-4 space-y-2">
                {renderQuestionLabel(question)}
                {question.helpText && <p className="text-xs text-gray-500">{question.helpText}</p>}

                {question.type === 'short_text' && (
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={String(answers[question.id] || '')}
                    onChange={e => updateAnswer(question.id, e.target.value)}
                  />
                )}

                {question.type === 'long_text' && (
                  <textarea
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={String(answers[question.id] || '')}
                    onChange={e => updateAnswer(question.id, e.target.value)}
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
                        value={String(answers[question.id] || '')}
                        onChange={e => updateAnswer(question.id, applyDateMask(e.target.value))}
                      />
                      <button
                        type="button"
                        aria-label="Abrir calendario"
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                        onClick={() =>
                          setOpenCalendarQuestionId(prev => (prev === question.id ? null : question.id))
                        }
                      >
                        <CalendarDays className="h-4 w-4" />
                      </button>
                    </div>
                    {openCalendarQuestionId === question.id && (
                      <div className="rounded-md border border-gray-200 bg-white p-2">
                        <input
                          type="date"
                          className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                          value={maskedDateToIso(String(answers[question.id] || '')) || ''}
                          onChange={e => {
                            updateAnswer(question.id, isoDateToMasked(e.target.value));
                            setOpenCalendarQuestionId(null);
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
                    value={String(answers[question.id] || '')}
                    onChange={e => updateAnswer(question.id, applyPhoneMask(e.target.value))}
                  />
                )}

                {(question.type === 'single_choice' || question.type === 'dropdown') && (
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    value={String(answers[question.id] || '')}
                    onChange={e => updateAnswer(question.id, e.target.value)}
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
                      const selectedValues = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
                      return (
                        <label key={option.id} className="flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={selectedValues.includes(option.label)}
                            onChange={e => toggleMultipleOption(question.id, option.label, e.target.checked)}
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
                      checked={Boolean(answers[question.id])}
                      onChange={e => updateAnswer(question.id, e.target.checked)}
                    />
                    Sim
                  </label>
                )}

                {question.type === 'file_upload' && (
                  <div className="space-y-1">
                    <input
                      type="file"
                      onChange={e => updateFileAnswer(question, e.target.files)}
                      accept="image/*,application/pdf"
                      className="w-full text-sm"
                    />
                    {(filesByQuestion[question.id] || []).map(file => (
                      <p key={file.name} className="text-xs text-gray-500">{file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enviar resposta
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default MN10PublicFormPage;
