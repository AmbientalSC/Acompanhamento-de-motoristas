import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Icon from '../../ui/Icon';
import type { MN10AnswerValue, MN10Form, MN10Question, MN10QuestionOption, MN10UploadConfig } from '../../../types';
import { getMn10FormByPublicId, submitMn10Response } from '../../../services/mn10Service';
import Card from '../../ui/Card';
import Button from '../../ui/Button';
import { FIELD_CLASSES } from '../../ui/fieldStyles';
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

// Erro exibido junto ao botão Enviar; `questionId` indica a pergunta a destacar e para onde rolar.
interface FormError {
  message: string;
  questionId?: string;
}

const DEFAULT_MAX_FILES = 1;
const DEFAULT_MAX_SIZE_MB = 10;
// Perguntas de escolha única com poucas opções viram linhas de rádio (1 toque); acima disso, lista suspensa.
const MAX_RADIO_OPTIONS = 8;

const QUESTION_LABEL_CLASSES = 'block text-base font-medium text-brand-dark break-words mb-1.5';
const FOCUS_RING_CLASSES = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2';

const allowedFile = (file: File): boolean => file.type.startsWith('image/') || file.type === 'application/pdf';

const isInternalQuestion = (question: MN10Question): boolean => question.visibility === 'internal';

const isSameFile = (a: File, b: File): boolean =>
  a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

const formatFileSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${(bytes / 1024).toFixed(1)} KB`;

const getFieldClasses = (invalid: boolean): string => (invalid ? `${FIELD_CLASSES} border-red-500` : FIELD_CLASSES);

const requiredError = (question: MN10Question): FormError => ({
  message: `Campo obrigatório: ${question.title}`,
  questionId: question.id,
});

const validateRequired = (
  questions: MN10Question[],
  answers: Answers,
  filesByQuestion: FilesByQuestion
): FormError | null => {
  for (const question of questions) {
    if (!question.required) {
      continue;
    }

    const value = answers[question.id];

    if (question.type === 'file_upload') {
      if (!(filesByQuestion[question.id] || []).length) {
        return requiredError(question);
      }
      continue;
    }

    if (question.type === 'multiple_choice') {
      if (!Array.isArray(value) || value.length === 0) {
        return requiredError(question);
      }
      continue;
    }

    if (question.type === 'boolean') {
      if (typeof value !== 'boolean') {
        return requiredError(question);
      }
      continue;
    }

    if (typeof value !== 'string' || !value.trim()) {
      return requiredError(question);
    }
  }

  return null;
};

const validateAnswerFormats = (questions: MN10Question[], answers: Answers): FormError | null => {
  for (const question of questions) {
    const value = answers[question.id];
    if (typeof value !== 'string' || !value.trim()) {
      continue;
    }

    if (question.type === 'date' && !isCompleteMaskedDate(value)) {
      return { message: `Data inválida em "${question.title}". Use dd/mm/aaaa.`, questionId: question.id };
    }

    if (question.type === 'phone' && !isCompleteMaskedPhone(value)) {
      return { message: `Telefone inválido em "${question.title}". Use (xx)xxxxxxxxx.`, questionId: question.id };
    }
  }

  return null;
};

// Rola até a pergunta com problema e leva o foco ao primeiro controle dela
const scrollToQuestion = (questionId: string): void => {
  const container = document.getElementById(`question-${questionId}`);
  if (!container) {
    return;
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
  container.querySelector<HTMLElement>('input, select, textarea')?.focus({ preventScroll: true });
};

const LOGO_SRC = `${import.meta.env.BASE_URL}ambiental.svg`;

// Faixa de marca: o logo tem texto branco, então precisa do fundo azul
const FormHeader: React.FC<{ title: string; description?: string }> = ({ title, description }) => (
  <header className="bg-brand-primary text-white pt-[env(safe-area-inset-top)]">
    <div className="mx-auto w-full max-w-2xl px-4 pt-5 pb-14 sm:pt-8 sm:pb-16">
      <img src={LOGO_SRC} alt="Ambiental" width={169} height={80} className="h-10 sm:h-12 w-auto" />
      <h1 className="mt-4 sm:mt-6 text-xl sm:text-3xl font-bold leading-tight break-words">{title}</h1>
      {description && (
        <p className="mt-2 text-sm sm:text-base text-white/90 break-words whitespace-pre-line">{description}</p>
      )}
    </div>
  </header>
);

interface ChoiceRowProps {
  type: 'checkbox' | 'radio';
  name: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

// A linha inteira é o <label>: tocar em qualquer ponto seleciona (alvo >= 44px)
const ChoiceRow: React.FC<ChoiceRowProps> = ({ type, name, label, checked, onChange }) => (
  <label
    className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-brand border px-3 py-2 transition-colors ${
      checked ? 'border-brand-primary bg-brand-light' : 'border-gray-300 bg-white active:bg-brand-gray'
    }`}
  >
    <input
      type={type}
      name={name}
      checked={checked}
      onChange={event => onChange(event.target.checked)}
      className="h-5 w-5 flex-shrink-0 accent-brand-primary"
    />
    <span className="min-w-0 break-words text-base text-brand-dark">{label}</span>
  </label>
);

interface ChoiceListProps {
  kind: 'checkbox' | 'radio';
  name: string;
  options: MN10QuestionOption[];
  selected: string[];
  onToggle: (optionLabel: string, checked: boolean) => void;
}

const ChoiceList: React.FC<ChoiceListProps> = ({ kind, name, options, selected, onToggle }) => (
  <div className="space-y-2">
    {options.map(option => (
      <ChoiceRow
        key={option.id}
        type={kind}
        name={name}
        label={option.label}
        checked={selected.includes(option.label)}
        onChange={checked => onToggle(option.label, checked)}
      />
    ))}
  </div>
);

interface DateAnswerFieldProps {
  id: string;
  value: string;
  invalid: boolean;
  describedBy?: string;
  onChange: (maskedValue: string) => void;
}

// Máscara dd/mm/aaaa digitável + botão (44px) que abre o calendário nativo
const DateAnswerField: React.FC<DateAnswerFieldProps> = ({ id, value, invalid, describedBy, onChange }) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarId = `${id}-calendar`;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="dd/mm/aaaa"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={getFieldClasses(invalid)}
          value={value}
          onChange={event => onChange(applyDateMask(event.target.value))}
        />
        <button
          type="button"
          aria-label="Abrir calendário"
          title="Abrir calendário"
          aria-expanded={isCalendarOpen}
          aria-controls={isCalendarOpen ? calendarId : undefined}
          onClick={() => setIsCalendarOpen(open => !open)}
          className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-brand border border-gray-300 bg-white text-brand-primary hover:bg-brand-light ${FOCUS_RING_CLASSES}`}
        >
          <Icon name="calendar-event" className="h-5 w-5" />
        </button>
      </div>
      {isCalendarOpen && (
        <input
          id={calendarId}
          type="date"
          aria-label="Escolher a data no calendário"
          className={FIELD_CLASSES}
          value={maskedDateToIso(value) || ''}
          onChange={event => {
            onChange(isoDateToMasked(event.target.value));
            setIsCalendarOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface FileUploadFieldProps {
  id: string;
  uploadConfig?: MN10UploadConfig;
  files: File[];
  invalid: boolean;
  describedBy?: string;
  onSelect: (files: FileList | null) => void;
  onRemove: (index: number) => void;
}

const FileUploadField: React.FC<FileUploadFieldProps> = ({
  id,
  uploadConfig,
  files,
  invalid,
  describedBy,
  onSelect,
  onRemove,
}) => {
  const maxFiles = uploadConfig?.maxFiles || DEFAULT_MAX_FILES;
  const maxSizeMb = uploadConfig?.maxSizeMB || DEFAULT_MAX_SIZE_MB;
  const allowsMultiple = maxFiles > 1;
  const hasFiles = files.length > 0;
  const isFull = allowsMultiple && files.length >= maxFiles;

  let buttonLabel = 'Tirar foto ou anexar arquivo';
  if (hasFiles) {
    buttonLabel = allowsMultiple ? 'Adicionar mais arquivos' : 'Trocar arquivo';
  }

  return (
    <div className="space-y-3">
      <div>
        {/* Input nativo fica fora da tela (continua focável); o <label> grande faz o papel de botão */}
        <input
          id={id}
          type="file"
          accept="image/*,application/pdf"
          multiple={allowsMultiple}
          disabled={isFull}
          aria-describedby={describedBy}
          className="peer sr-only"
          onChange={event => {
            // onSelect lê a lista de forma síncrona; depois zera o input para permitir reescolher o mesmo arquivo
            onSelect(event.target.files);
            event.target.value = '';
          }}
        />
        <label
          htmlFor={id}
          className={`flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-brand border-2 border-dashed bg-brand-light px-4 py-3 text-center text-base font-semibold text-brand-primary transition-colors hover:bg-[#D9E3F5] peer-focus-visible:ring-2 peer-focus-visible:ring-brand-accent peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 ${
            invalid ? 'border-red-500' : 'border-brand-primary/40'
          }`}
        >
          <Icon name={hasFiles ? 'upload' : 'camera'} className="h-5 w-5 flex-shrink-0" />
          {buttonLabel}
        </label>
        <p className="mt-2 text-sm text-gray-600">
          {isFull
            ? `Limite de ${maxFiles} arquivos atingido. Remova um para adicionar outro.`
            : `Imagem ou PDF, até ${maxSizeMb} MB${allowsMultiple ? ` cada, no máximo ${maxFiles} arquivos` : ''}.`}
        </p>
      </div>

      {hasFiles && (
        <ul className="space-y-2" aria-label="Arquivos selecionados">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
              className="flex items-center gap-2 rounded-brand border border-gray-200 bg-white pl-3"
            >
              <Icon
                name={file.type === 'application/pdf' ? 'file-text' : 'photo'}
                className="h-5 w-5 flex-shrink-0 text-brand-primary"
              />
              <div className="min-w-0 flex-1 py-2">
                <p className="break-words text-sm font-medium text-brand-dark">{file.name}</p>
                <p className="text-xs text-gray-600">{formatFileSize(file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(index)}
                aria-label={`Remover ${file.name}`}
                title="Remover arquivo"
                className={`inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-brand text-red-600 hover:bg-red-50 ${FOCUS_RING_CLASSES}`}
              >
                <Icon name="trash" className="h-5 w-5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

interface QuestionBlockProps {
  question: MN10Question;
  value: MN10AnswerValue | undefined;
  files: File[];
  errorMessage?: string;
  onAnswer: (value: MN10AnswerValue) => void;
  onToggleOption: (optionLabel: string, checked: boolean) => void;
  onSelectFiles: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
}

const QuestionBlock: React.FC<QuestionBlockProps> = ({
  question,
  value,
  files,
  errorMessage,
  onAnswer,
  onToggleOption,
  onSelectFiles,
  onRemoveFile,
}) => {
  const controlId = `field-${question.id}`;
  const helpId = question.helpText ? `${controlId}-help` : undefined;
  const errorId = errorMessage ? `${controlId}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;
  const invalid = Boolean(errorMessage);

  const options = question.options || [];
  const stringValue = typeof value === 'string' ? value : '';
  const selectedValues = Array.isArray(value) ? value : [];
  const usesRadios =
    question.type === 'single_choice' && options.length > 0 && options.length <= MAX_RADIO_OPTIONS;
  const isGroup = usesRadios || question.type === 'multiple_choice' || question.type === 'boolean';

  const sharedFieldProps = {
    id: controlId,
    'aria-invalid': invalid || undefined,
    'aria-describedby': describedBy,
    className: getFieldClasses(invalid),
  };

  const renderControl = (): React.ReactNode => {
    switch (question.type) {
      case 'short_text':
        return (
          <input
            {...sharedFieldProps}
            type="text"
            autoComplete="off"
            value={stringValue}
            onChange={event => onAnswer(event.target.value)}
          />
        );
      case 'long_text':
        return (
          <textarea
            {...sharedFieldProps}
            rows={4}
            autoComplete="off"
            className={`${sharedFieldProps.className} resize-y`}
            value={stringValue}
            onChange={event => onAnswer(event.target.value)}
          />
        );
      case 'date':
        return (
          <DateAnswerField
            id={controlId}
            value={stringValue}
            invalid={invalid}
            describedBy={describedBy}
            onChange={onAnswer}
          />
        );
      case 'phone':
        return (
          <input
            {...sharedFieldProps}
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            placeholder="(xx)xxxxxxxxx"
            value={stringValue}
            onChange={event => onAnswer(applyPhoneMask(event.target.value))}
          />
        );
      case 'multiple_choice':
        return (
          <ChoiceList kind="checkbox" name={controlId} options={options} selected={selectedValues} onToggle={onToggleOption} />
        );
      case 'boolean':
        return (
          <ChoiceRow type="checkbox" name={controlId} label="Sim" checked={Boolean(value)} onChange={onAnswer} />
        );
      case 'file_upload':
        return (
          <FileUploadField
            id={controlId}
            uploadConfig={question.uploadConfig}
            files={files}
            invalid={invalid}
            describedBy={describedBy}
            onSelect={onSelectFiles}
            onRemove={onRemoveFile}
          />
        );
      default:
        break;
    }

    if (usesRadios) {
      return (
        <div className="space-y-1">
          <ChoiceList
            kind="radio"
            name={controlId}
            options={options}
            selected={[stringValue]}
            onToggle={optionLabel => onAnswer(optionLabel)}
          />
          {!question.required && stringValue && (
            <button
              type="button"
              onClick={() => onAnswer('')}
              className={`min-h-11 rounded-brand px-3 text-sm font-semibold text-brand-primary hover:bg-brand-light ${FOCUS_RING_CLASSES}`}
            >
              Limpar seleção
            </button>
          )}
        </div>
      );
    }

    // single_choice com muitas opções e dropdown
    return (
      <select {...sharedFieldProps} value={stringValue} onChange={event => onAnswer(event.target.value)}>
        <option value="">Selecione...</option>
        {options.map(option => (
          <option key={option.id} value={option.label}>{option.label}</option>
        ))}
      </select>
    );
  };

  const title = (
    <>
      {question.title}
      {question.required && (
        <>
          <span className="ml-1 text-red-600" aria-hidden="true">*</span>
          <span className="sr-only"> (obrigatório)</span>
        </>
      )}
    </>
  );

  const content = (
    <>
      {question.helpText && (
        <p id={helpId} className="mb-2 text-sm text-gray-600 break-words">{question.helpText}</p>
      )}
      {renderControl()}
      {errorMessage && (
        <p id={errorId} className="mt-2 flex items-start gap-1.5 text-sm font-medium text-red-700">
          <Icon name="alert-circle" className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span className="min-w-0 break-words">{errorMessage}</span>
        </p>
      )}
    </>
  );

  return (
    <div id={`question-${question.id}`} className="min-w-0 py-5 first:pt-0 last:pb-0">
      {isGroup ? (
        <fieldset className="min-w-0" aria-describedby={describedBy}>
          <legend className={`${QUESTION_LABEL_CLASSES} p-0`}>{title}</legend>
          {content}
        </fieldset>
      ) : (
        <>
          <label htmlFor={controlId} className={QUESTION_LABEL_CLASSES}>{title}</label>
          {content}
        </>
      )}
    </div>
  );
};

const MN10PublicFormPage: React.FC = () => {
  const { publicId = '' } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<MN10Form | null>(null);

  const [answers, setAnswers] = useState<Answers>({});
  const [filesByQuestion, setFilesByQuestion] = useState<FilesByQuestion>({});

  const [honeypot, setHoneypot] = useState('');
  const [error, setError] = useState<FormError | null>(null);
  const [success, setSuccess] = useState<{ responseId: string; submittedAt: number } | null>(null);
  const thanksHeadingRef = useRef<HTMLHeadingElement>(null);

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
        setError({ message: 'Não foi possível carregar este formulário.' });
      } finally {
        setLoading(false);
      }
    };

    loadForm();
  }, [publicId]);

  // Tela de agradecimento: volta ao topo e leva o foco ao título (leitores de tela anunciam)
  useEffect(() => {
    if (!success) {
      return;
    }
    window.scrollTo({ top: 0 });
    thanksHeadingRef.current?.focus();
  }, [success]);

  // Ao mexer em uma pergunta, o erro dela deixa de valer
  const clearQuestionError = (questionId: string) => {
    setError(prev => (prev?.questionId === questionId ? null : prev));
  };

  const updateAnswer = (questionId: string, value: MN10AnswerValue) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    clearQuestionError(questionId);
  };

  const updateFileAnswer = (question: MN10Question, files: FileList | null) => {
    if (!files) {
      return;
    }

    const incoming = Array.from(files);
    const maxFiles = question.uploadConfig?.maxFiles || DEFAULT_MAX_FILES;
    const maxSizeMb = question.uploadConfig?.maxSizeMB || DEFAULT_MAX_SIZE_MB;
    const maxBytes = maxSizeMb * 1024 * 1024;

    // Com vários arquivos permitidos, novas escolhas somam às anteriores; com um só, substituem
    const current = maxFiles > 1 ? filesByQuestion[question.id] || [] : [];
    const list = [...current, ...incoming.filter(file => !current.some(existing => isSameFile(existing, file)))];

    if (list.length > maxFiles) {
      setError({
        message: `A pergunta "${question.title}" permite no máximo ${maxFiles} arquivo(s).`,
        questionId: question.id,
      });
      return;
    }

    for (const file of incoming) {
      if (!allowedFile(file)) {
        setError({ message: `Arquivo não permitido: ${file.name}`, questionId: question.id });
        return;
      }
      if (file.size > maxBytes) {
        setError({ message: `Arquivo acima de ${maxSizeMb} MB: ${file.name}`, questionId: question.id });
        return;
      }
    }

    setError(null);
    setFilesByQuestion(prev => ({ ...prev, [question.id]: list }));
  };

  const removeFile = (questionId: string, index: number) => {
    setFilesByQuestion(prev => ({
      ...prev,
      [questionId]: (prev[questionId] || []).filter((_, fileIndex) => fileIndex !== index),
    }));
    clearQuestionError(questionId);
  };

  const toggleMultipleOption = (questionId: string, optionLabel: string, checked: boolean) => {
    setAnswers(prev => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      const next = checked ? [...current, optionLabel] : current.filter(item => item !== optionLabel);
      return { ...prev, [questionId]: next };
    });
    clearQuestionError(questionId);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) {
      return;
    }

    setError(null);

    if (form.status !== 'published') {
      setError({ message: 'Este formulário não está recebendo respostas no momento.' });
      return;
    }

    const validationError =
      validateRequired(orderedQuestions, answers, filesByQuestion) ?? validateAnswerFormats(orderedQuestions, answers);
    if (validationError) {
      setError(validationError);
      if (validationError.questionId) {
        scrollToQuestion(validationError.questionId);
      }
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
      setHoneypot('');
    } catch (submitError) {
      console.error(submitError);
      setError({ message: submitError instanceof Error ? submitError.message : 'Falha ao enviar resposta.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div role="status" className="min-h-dvh bg-brand-gray flex justify-center items-center">
        <Icon name="loader-2" className="h-10 w-10 text-brand-primary animate-spin" />
        <span className="sr-only">Carregando formulário</span>
      </div>
    );
  }

  if (!form || form.status === 'draft' || form.status === 'closed') {
    const loadFailure = !form ? error : null;

    return (
      <div className="min-h-dvh bg-brand-primary flex flex-col items-center justify-center gap-6 px-4 py-8">
        <img src={LOGO_SRC} alt="Ambiental" width={169} height={80} className="h-12 w-auto" />
        <Card className="w-full max-w-md p-5 sm:p-8">
          <div className="text-center space-y-3">
            <h1 className="text-xl sm:text-2xl font-bold text-brand-dark">
              {loadFailure ? 'Não foi possível carregar' : 'Formulário indisponível'}
            </h1>
            <p className="text-gray-600 break-words">
              {loadFailure
                ? `${loadFailure.message} Verifique sua conexão e tente novamente.`
                : 'Este link não está aceitando respostas no momento.'}
            </p>
            {loadFailure && (
              <Button type="button" onClick={() => window.location.reload()} className="w-full sm:w-auto">
                <Icon name="refresh" className="h-5 w-5" />
                Tentar novamente
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-brand-gray flex flex-col">
      <FormHeader title={form.title} description={form.description} />

      {/* Coluna única legível (exceção ao max-w): o cartão sobrepõe a faixa de marca */}
      <main className="relative -mt-8 mx-auto w-full max-w-2xl flex-1 px-3 sm:px-4 sm:pb-8">
        {success ? (
          <Card className="p-6 sm:p-10">
            <div className="text-center space-y-4">
              <Icon name="circle-check" className="h-16 w-16 mx-auto text-green-600" />
              <h2
                ref={thanksHeadingRef}
                tabIndex={-1}
                className="text-xl sm:text-2xl font-bold text-brand-dark outline-none"
              >
                Resposta enviada!
              </h2>
              <p className="text-gray-600">Obrigado por responder. Você já pode fechar esta página.</p>
              <p className="text-sm text-gray-600">Enviado em {new Date(success.submittedAt).toLocaleString('pt-BR')}</p>
              <Button type="button" variant="secondary" onClick={() => setSuccess(null)} className="w-full sm:w-auto">
                Enviar outra resposta
              </Button>
            </div>
          </Card>
        ) : (
          <form onSubmit={submit} noValidate>
            <Card className="p-4 sm:p-8">
              <input
                type="text"
                name="hp"
                value={honeypot}
                onChange={e => setHoneypot(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
              />

              {orderedQuestions.length === 0 && (
                <div role="status" className="rounded-brand border border-yellow-200 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                  Este formulário não possui campos públicos para resposta.
                </div>
              )}

              <div className="divide-y divide-gray-100">
                {orderedQuestions.map(question => (
                  <QuestionBlock
                    key={question.id}
                    question={question}
                    value={answers[question.id]}
                    files={filesByQuestion[question.id] || []}
                    errorMessage={error?.questionId === question.id ? error.message : undefined}
                    onAnswer={value => updateAnswer(question.id, value)}
                    onToggleOption={(optionLabel, checked) => toggleMultipleOption(question.id, optionLabel, checked)}
                    onSelectFiles={files => updateFileAnswer(question, files)}
                    onRemoveFile={index => removeFile(question.id, index)}
                  />
                ))}
              </div>
            </Card>

            {/* Fora do Card (overflow-hidden quebraria o sticky). Fora do App: sem barra de navegação, então bottom-0 + área segura */}
            <div className="sticky bottom-0 z-20 -mx-3 mt-4 border-t border-gray-200 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-2px_8px_rgba(0,0,0,0.08)] sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0 sm:shadow-none">
              {error && (
                <div role="alert" className="mb-3 flex items-start gap-2 rounded-brand border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <Icon name="alert-circle" className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <span className="min-w-0 break-words">{error.message}</span>
                </div>
              )}
              <div className="sm:flex sm:justify-end">
                <Button type="submit" disabled={submitting} aria-busy={submitting} className="w-full min-h-12 sm:w-auto sm:min-w-48">
                  {submitting ? <Icon name="loader-2" className="h-5 w-5 animate-spin" /> : <Icon name="send" className="h-5 w-5" />}
                  {submitting ? 'Enviando...' : 'Enviar resposta'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default MN10PublicFormPage;
