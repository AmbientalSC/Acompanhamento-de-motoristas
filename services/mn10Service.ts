import {
  Timestamp,
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase';
import type {
  MN10AnswerValue,
  MN10Form,
  MN10FormStatus,
  MN10Question,
  MN10Response,
  MN10ResponseAttachment,
} from '../types';
import { isCompleteMaskedDate, isCompleteMaskedPhone } from '../utils/mn10FieldUtils';

const MN10_FORMS_COLLECTION = 'mn10Forms';
const DEFAULT_ALLOWED_UPLOAD_TYPES: Array<'image' | 'pdf'> = ['image', 'pdf'];
const DEFAULT_MAX_FILE_SIZE_MB = 10;
const DEFAULT_MAX_FILES = 1;

export interface CreateMn10FormInput {
  title: string;
  description?: string;
  status?: MN10FormStatus;
  questions: MN10Question[];
  responseTitleQuestionId?: string;
  createdByUid: string;
  createdByEmail: string;
  publicId?: string;
}

export interface UpdateMn10FormMetaInput {
  title?: string;
  description?: string;
  status?: MN10FormStatus;
  responseTitleQuestionId?: string | null;
}

export interface SubmitMn10ResponseInput {
  publicId: string;
  answers: Record<string, MN10AnswerValue>;
  filesByQuestion?: Record<string, File[]>;
  honeypot?: string;
  userAgent?: string;
}

export interface SubmitMn10ResponseResult {
  responseId: string;
  submittedAt: number;
}

export interface UpdateMn10InternalAnswersInput {
  formId: string;
  responseId: string;
  answers: Record<string, MN10AnswerValue>;
}

const formsCollectionRef = collection(db, MN10_FORMS_COLLECTION);

const sanitizeFileName = (name: string): string => {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const sanitizePublicId = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

const buildDefaultPublicIdBase = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear());
  return `${month}${year}`;
};

const isPublicIdTaken = async (publicId: string): Promise<boolean> => {
  const q = query(formsCollectionRef, where('publicId', '==', publicId), limit(1));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

const generatePublicId = async (): Promise<string> => {
  const base = buildDefaultPublicIdBase();
  let candidate = base;
  let sequence = 2;

  while (await isPublicIdTaken(candidate)) {
    candidate = `${base}-${sequence}`;
    sequence += 1;
  }

  return candidate;
};

const resolvePublicId = async (requestedPublicId?: string): Promise<string> => {
  if (requestedPublicId !== undefined && requestedPublicId.trim().length > 0) {
    const normalizedRequested = sanitizePublicId(requestedPublicId);
    if (!normalizedRequested) {
      throw new Error('Codigo publico invalido. Use letras, numeros e hifen.');
    }
    if (await isPublicIdTaken(normalizedRequested)) {
      throw new Error('Codigo publico ja esta em uso. Escolha outro codigo.');
    }
    return normalizedRequested;
  }

  return generatePublicId();
};

const normalizeQuestionVisibility = (question: MN10Question): 'public' | 'internal' => {
  if (question.type === 'file_upload') {
    return 'public';
  }
  return question.visibility === 'internal' ? 'internal' : 'public';
};

const isInternalQuestion = (question: MN10Question): boolean => {
  return normalizeQuestionVisibility(question) === 'internal';
};

const resolveResponseTitleQuestionId = (
  questions: MN10Question[],
  responseTitleQuestionId?: string | null
): string | undefined => {
  if (!responseTitleQuestionId) {
    return undefined;
  }

  const normalizedId = responseTitleQuestionId.trim();
  if (!normalizedId) {
    return undefined;
  }

  const question = questions.find(item => item.id === normalizedId);
  if (!question || question.type === 'file_upload') {
    return undefined;
  }

  return normalizedId;
};

const normalizeQuestions = (questions: MN10Question[]): MN10Question[] => {
  return questions
    .map((question, index) => {
      const normalized: MN10Question = {
        id: question.id,
        title: question.title.trim(),
        type: question.type,
        required: Boolean(question.required),
        visibility: normalizeQuestionVisibility(question),
        order: index,
      };

      const trimmedHelpText = question.helpText?.trim();
      if (trimmedHelpText) {
        normalized.helpText = trimmedHelpText;
      }

      if (
        question.type === 'single_choice' ||
        question.type === 'multiple_choice' ||
        question.type === 'dropdown'
      ) {
        const validOptions = (question.options || [])
          .map(option => ({ id: option.id, label: option.label.trim() }))
          .filter(option => option.label.length > 0);

        if (validOptions.length > 0) {
          normalized.options = validOptions;
        }
      }

      if (question.type === 'file_upload') {
        normalized.uploadConfig = {
          allowedTypes: question.uploadConfig?.allowedTypes || DEFAULT_ALLOWED_UPLOAD_TYPES,
          maxSizeMB: question.uploadConfig?.maxSizeMB || DEFAULT_MAX_FILE_SIZE_MB,
          maxFiles: question.uploadConfig?.maxFiles || DEFAULT_MAX_FILES,
        };
      }

      return normalized;
    })
    .filter(question => question.title.length > 0);
};

const mapTimestampToMillis = (value: unknown): number => {
  if (value instanceof Timestamp) {
    return value.toMillis();
  }
  if (typeof value === 'number') {
    return value;
  }
  return Date.now();
};

const mapFormDoc = (id: string, data: Record<string, unknown>): MN10Form => {
  const rawQuestions = ((data.questions as MN10Question[]) || []).map((question, index) => ({
    ...question,
    order: typeof question.order === 'number' ? question.order : index,
    visibility: normalizeQuestionVisibility(question),
  }));

  return {
    id,
    title: String(data.title || ''),
    description: data.description ? String(data.description) : '',
    status: (data.status as MN10FormStatus) || 'draft',
    publicId: String(data.publicId || ''),
    questions: rawQuestions,
    responseTitleQuestionId:
      typeof data.responseTitleQuestionId === 'string' && data.responseTitleQuestionId.trim().length > 0
        ? data.responseTitleQuestionId.trim()
        : undefined,
    responseCount: Number(data.responseCount || 0),
    createdByUid: String(data.createdByUid || ''),
    createdByEmail: String(data.createdByEmail || ''),
    createdAt: mapTimestampToMillis(data.createdAt),
    updatedAt: mapTimestampToMillis(data.updatedAt),
  };
};

const mapResponseDoc = (id: string, data: Record<string, unknown>): MN10Response => {
  const rawSnapshot = (data.questionSnapshot as MN10Question[]) || [];
  const mappedSnapshot =
    rawSnapshot.length > 0
      ? rawSnapshot.map((question, index) => ({
          ...question,
          order: typeof question.order === 'number' ? question.order : index,
          visibility: normalizeQuestionVisibility(question),
        }))
      : undefined;

  return {
    id,
    formId: String(data.formId || ''),
    publicId: String(data.publicId || ''),
    answers: (data.answers as Record<string, MN10AnswerValue>) || {},
    internalAnswers: (data.internalAnswers as Record<string, MN10AnswerValue>) || {},
    attachments: (data.attachments as MN10ResponseAttachment[]) || [],
    questionSnapshot: mappedSnapshot,
    submittedAt: mapTimestampToMillis(data.submittedAt),
    internalUpdatedAt: data.internalUpdatedAt ? mapTimestampToMillis(data.internalUpdatedAt) : undefined,
    userAgent: data.userAgent ? String(data.userAgent) : undefined,
  };
};

const validateFileUpload = (file: File, maxSizeMB: number): void => {
  const isAllowedType = file.type.startsWith('image/') || file.type === 'application/pdf';
  if (!isAllowedType) {
    throw new Error(`Tipo de arquivo não permitido: ${file.name}`);
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Arquivo excede o limite de ${maxSizeMB} MB: ${file.name}`);
  }
};

const mapUploadErrorMessage = (uploadError: unknown): string => {
  if (!uploadError || typeof uploadError !== 'object') {
    return 'Falha ao enviar anexo. Verifique se o Firebase Storage esta habilitado no projeto e se o bucket esta ativo.';
  }

  const errorCode = String((uploadError as { code?: unknown }).code || '');
  const errorMessage = String((uploadError as { message?: unknown }).message || '');
  const serverResponse = String((uploadError as { serverResponse?: unknown }).serverResponse || '');

  if (
    errorCode === 'storage/object-not-found' ||
    errorCode === 'storage/bucket-not-found' ||
    errorMessage.includes('404') ||
    serverResponse.includes('"code": 404') ||
    serverResponse.includes('"code":404')
  ) {
    return 'Falha ao enviar anexo: bucket do Firebase Storage nao encontrado. Ative o Storage no projeto e confirme o bucket em firebase.ts.';
  }

  if (errorCode === 'storage/unauthorized') {
    return 'Falha ao enviar anexo: permissao negada pelo Firebase Storage. Revise as regras de Storage.';
  }

  if (errorCode === 'storage/canceled') {
    return 'Upload cancelado.';
  }

  return 'Falha ao enviar anexo. Verifique se o Firebase Storage esta habilitado no projeto e se o bucket esta ativo.';
};
const validateRequiredAnswers = (
  questions: MN10Question[],
  answers: Record<string, MN10AnswerValue>,
  filesByQuestion?: Record<string, File[]>
): void => {
  for (const question of questions) {
    if (isInternalQuestion(question)) {
      continue;
    }

    if (!question.required) {
      continue;
    }

    const value = answers[question.id];

    if (question.type === 'file_upload') {
      const files = filesByQuestion?.[question.id] || [];
      if (files.length === 0) {
        throw new Error(`O campo "${question.title}" é obrigatório.`);
      }
      continue;
    }

    if (question.type === 'multiple_choice') {
      if (!Array.isArray(value) || value.length === 0) {
        throw new Error(`O campo "${question.title}" é obrigatório.`);
      }
      continue;
    }

    if (question.type === 'boolean') {
      if (typeof value !== 'boolean') {
        throw new Error(`O campo "${question.title}" é obrigatório.`);
      }
      continue;
    }

    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`O campo "${question.title}" é obrigatório.`);
    }
  }
};

const validateAnswerFormats = (
  questions: MN10Question[],
  answers: Record<string, MN10AnswerValue>
): void => {
  for (const question of questions) {
    const rawValue = answers[question.id];
    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    if (question.type === 'date') {
      const value = String(rawValue).trim();
      if (!value) {
        continue;
      }
      if (!isCompleteMaskedDate(value)) {
        throw new Error(`Data invalida no campo "${question.title}". Use dd/mm/aaaa.`);
      }
      continue;
    }

    if (question.type === 'phone') {
      const value = String(rawValue).trim();
      if (!value) {
        continue;
      }
      if (!isCompleteMaskedPhone(value)) {
        throw new Error(`Telefone invalido no campo "${question.title}". Use (xx)xxxxxxxxx.`);
      }
    }
  }
};

const normalizeAnswerValue = (
  question: MN10Question,
  rawValue: MN10AnswerValue,
  mode: 'public' | 'internal'
): MN10AnswerValue | undefined => {
  if (rawValue === undefined) {
    return undefined;
  }

  if (question.type === 'multiple_choice') {
    if (Array.isArray(rawValue)) {
      return rawValue.map(item => String(item));
    }
    return [];
  }

  if (question.type === 'boolean') {
    return Boolean(rawValue);
  }

  if (question.type === 'file_upload') {
    return mode === 'public' ? null : undefined;
  }

  return String(rawValue ?? '').trim();
};

const normalizeAnswers = (
  questions: MN10Question[],
  answers: Record<string, MN10AnswerValue>,
  mode: 'public' | 'internal'
): Record<string, MN10AnswerValue> => {
  const normalized: Record<string, MN10AnswerValue> = {};

  for (const question of questions) {
    const normalizedValue = normalizeAnswerValue(question, answers[question.id], mode);
    if (normalizedValue !== undefined) {
      normalized[question.id] = normalizedValue;
    }
  }

  return normalized;
};

export const listMn10Forms = async (): Promise<MN10Form[]> => {
  const q = query(formsCollectionRef, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(item => mapFormDoc(item.id, item.data()));
};

export const createMn10Form = async (input: CreateMn10FormInput): Promise<MN10Form> => {
  const now = Timestamp.now();
  const normalizedQuestions = normalizeQuestions(input.questions);
  const responseTitleQuestionId = resolveResponseTitleQuestionId(
    normalizedQuestions,
    input.responseTitleQuestionId
  );
  const formRef = doc(formsCollectionRef);
  const publicId = await resolvePublicId(input.publicId);

  const payload: Record<string, unknown> = {
    title: input.title.trim(),
    description: (input.description || '').trim(),
    status: input.status || 'draft',
    publicId,
    questions: normalizedQuestions,
    responseCount: 0,
    createdByUid: input.createdByUid,
    createdByEmail: input.createdByEmail,
    createdAt: now,
    updatedAt: now,
  };

  if (responseTitleQuestionId) {
    payload.responseTitleQuestionId = responseTitleQuestionId;
  }

  await setDoc(formRef, payload);
  return mapFormDoc(formRef.id, payload);
};

export const updateMn10FormMeta = async (
  formId: string,
  patch: UpdateMn10FormMetaInput
): Promise<void> => {
  const formRef = doc(db, MN10_FORMS_COLLECTION, formId);
  const dataToUpdate: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (patch.title !== undefined) {
    dataToUpdate.title = patch.title.trim();
  }
  if (patch.description !== undefined) {
    dataToUpdate.description = patch.description.trim();
  }
  if (patch.status !== undefined) {
    dataToUpdate.status = patch.status;
  }
  if (patch.responseTitleQuestionId !== undefined) {
    const formSnapshot = await getDoc(formRef);
    if (!formSnapshot.exists()) {
      throw new Error('Formulario nao encontrado.');
    }

    const form = mapFormDoc(formSnapshot.id, formSnapshot.data());
    const resolvedResponseTitleQuestionId = resolveResponseTitleQuestionId(
      form.questions,
      patch.responseTitleQuestionId
    );

    dataToUpdate.responseTitleQuestionId = resolvedResponseTitleQuestionId || deleteField();
  }

  await updateDoc(formRef, dataToUpdate);
};

export const updateMn10FormStructure = async (
  formId: string,
  questions: MN10Question[]
): Promise<void> => {
  const formRef = doc(db, MN10_FORMS_COLLECTION, formId);
  const formSnapshot = await getDoc(formRef);
  if (!formSnapshot.exists()) {
    throw new Error('Formulário não encontrado.');
  }
  const form = mapFormDoc(formSnapshot.id, formSnapshot.data());
  const normalizedQuestions = normalizeQuestions(questions);
  const resolvedResponseTitleQuestionId = resolveResponseTitleQuestionId(
    normalizedQuestions,
    form.responseTitleQuestionId
  );

  await updateDoc(formRef, {
    questions: normalizedQuestions,
    responseTitleQuestionId: resolvedResponseTitleQuestionId || deleteField(),
    updatedAt: Timestamp.now(),
  });
};

export const duplicateMn10Form = async (formId: string): Promise<MN10Form> => {
  const sourceRef = doc(db, MN10_FORMS_COLLECTION, formId);
  const sourceSnapshot = await getDoc(sourceRef);
  if (!sourceSnapshot.exists()) {
    throw new Error('Formulário não encontrado para duplicação.');
  }

  const source = mapFormDoc(sourceSnapshot.id, sourceSnapshot.data());
  return createMn10Form({
    title: `${source.title} (Cópia)`,
    description: source.description,
    status: 'draft',
    questions: source.questions,
    responseTitleQuestionId: source.responseTitleQuestionId,
    createdByUid: source.createdByUid,
    createdByEmail: source.createdByEmail,
  });
};

export const getMn10FormByPublicId = async (publicId: string): Promise<MN10Form | null> => {
  const q = query(formsCollectionRef, where('publicId', '==', publicId), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return null;
  }
  const docItem = snapshot.docs[0];
  return mapFormDoc(docItem.id, docItem.data());
};

export const listMn10Responses = async (formId: string): Promise<MN10Response[]> => {
  const responsesRef = collection(db, MN10_FORMS_COLLECTION, formId, 'responses');
  const q = query(responsesRef, orderBy('submittedAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(item => mapResponseDoc(item.id, item.data()));
};

export const getMn10Response = async (
  formId: string,
  responseId: string
): Promise<MN10Response | null> => {
  const responseRef = doc(db, MN10_FORMS_COLLECTION, formId, 'responses', responseId);
  const snapshot = await getDoc(responseRef);
  if (!snapshot.exists()) {
    return null;
  }
  return mapResponseDoc(snapshot.id, snapshot.data());
};

export const updateMn10InternalAnswers = async (
  input: UpdateMn10InternalAnswersInput
): Promise<void> => {
  const formRef = doc(db, MN10_FORMS_COLLECTION, input.formId);
  const formSnapshot = await getDoc(formRef);
  if (!formSnapshot.exists()) {
    throw new Error('Formulario nao encontrado.');
  }

  const responseRef = doc(db, MN10_FORMS_COLLECTION, input.formId, 'responses', input.responseId);
  const responseSnapshot = await getDoc(responseRef);
  if (!responseSnapshot.exists()) {
    throw new Error('Resposta nao encontrada.');
  }

  const form = mapFormDoc(formSnapshot.id, formSnapshot.data());
  const internalQuestions = form.questions.filter(isInternalQuestion);
  if (internalQuestions.length === 0) {
    throw new Error('Este formulario nao possui campos internos configurados.');
  }

  const existingInternalAnswers =
    (responseSnapshot.data().internalAnswers as Record<string, MN10AnswerValue>) || {};
  validateAnswerFormats(internalQuestions, input.answers);
  const normalizedInternalAnswers = normalizeAnswers(internalQuestions, input.answers, 'internal');

  await updateDoc(responseRef, {
    internalAnswers: {
      ...existingInternalAnswers,
      ...normalizedInternalAnswers,
    },
    internalUpdatedAt: Timestamp.now(),
  });
};

export const submitMn10Response = async (
  input: SubmitMn10ResponseInput
): Promise<SubmitMn10ResponseResult> => {
  const trimmedPublicId = input.publicId.trim();
  if (!trimmedPublicId) {
    throw new Error('Link de formulário inválido.');
  }
  if (input.honeypot && input.honeypot.trim().length > 0) {
    throw new Error('Submissão inválida.');
  }

  const form = await getMn10FormByPublicId(trimmedPublicId);
  if (!form) {
    throw new Error('Formulário não encontrado.');
  }
  if (form.status !== 'published') {
    throw new Error('Este formulário não está disponível para respostas.');
  }

  const publicQuestions = form.questions.filter(question => !isInternalQuestion(question));
  validateRequiredAnswers(publicQuestions, input.answers, input.filesByQuestion);
  validateAnswerFormats(publicQuestions, input.answers);
  const normalizedAnswers = normalizeAnswers(publicQuestions, input.answers, 'public');
  const questionSnapshot = normalizeQuestions(form.questions);

  const responseDocRef = doc(collection(db, MN10_FORMS_COLLECTION, form.id, 'responses'));
  const responseId = responseDocRef.id;

  const attachments: MN10ResponseAttachment[] = [];
  const filesByQuestion = input.filesByQuestion || {};

  for (const question of publicQuestions) {
    if (question.type !== 'file_upload') {
      continue;
    }

    const files = filesByQuestion[question.id] || [];
    if (files.length === 0) {
      continue;
    }

    const uploadConfig = {
      allowedTypes: question.uploadConfig?.allowedTypes || DEFAULT_ALLOWED_UPLOAD_TYPES,
      maxSizeMB: question.uploadConfig?.maxSizeMB || DEFAULT_MAX_FILE_SIZE_MB,
      maxFiles: question.uploadConfig?.maxFiles || DEFAULT_MAX_FILES,
    };

    if (files.length > uploadConfig.maxFiles) {
      throw new Error(
        `O campo "${question.title}" permite no máximo ${uploadConfig.maxFiles} arquivo(s).`
      );
    }

    for (const file of files) {
      validateFileUpload(file, uploadConfig.maxSizeMB);

      const isImageAllowed = uploadConfig.allowedTypes.includes('image') && file.type.startsWith('image/');
      const isPdfAllowed = uploadConfig.allowedTypes.includes('pdf') && file.type === 'application/pdf';
      if (!isImageAllowed && !isPdfAllowed) {
        throw new Error(`Arquivo não permitido no campo "${question.title}".`);
      }

      const filePath = `mn10/uploads/${form.id}/${responseId}/${question.id}/${Date.now()}_${sanitizeFileName(file.name)}`;
      const storageRef = ref(storage, filePath);
      try {
        await uploadBytes(storageRef, file, {
          contentType: file.type || 'application/octet-stream',
        });
      } catch (uploadError) {
        console.error('Erro ao enviar arquivo para o Storage:', uploadError);
        throw new Error(mapUploadErrorMessage(uploadError));
      }

      attachments.push({
        questionId: question.id,
        fileName: file.name,
        path: filePath,
        size: file.size,
        contentType: file.type || 'application/octet-stream',
        uploadedAt: Date.now(),
      });
    }
  }

  try {
    await setDoc(responseDocRef, {
      formId: form.id,
      publicId: form.publicId,
      answers: normalizedAnswers,
      internalAnswers: {},
      attachments,
      questionSnapshot,
      submittedAt: Timestamp.now(),
      userAgent: input.userAgent || '',
    });
  } catch (createResponseError) {
    const errorCode = String((createResponseError as { code?: unknown }).code || '');
    if (errorCode === 'permission-denied') {
      throw new Error('Este formulario nao esta disponivel para respostas.');
    }
    throw createResponseError;
  }

  const formRef = doc(db, MN10_FORMS_COLLECTION, form.id);
  try {
    await runTransaction(db, async transaction => {
      const latestFormSnapshot = await transaction.get(formRef);
      if (!latestFormSnapshot.exists()) {
        return;
      }
      const latestForm = latestFormSnapshot.data();
      if (latestForm.status !== 'published') {
        return;
      }

      transaction.update(formRef, {
        responseCount: Number(latestForm.responseCount || 0) + 1,
        updatedAt: Timestamp.now(),
      });
    });
  } catch (counterError) {
    const errorCode = String((counterError as { code?: unknown }).code || '');
    if (errorCode !== 'permission-denied') {
      console.warn('Falha ao atualizar contador de respostas do formulario:', counterError);
    }
  }
  return {
    responseId,
    submittedAt: Date.now(),
  };
};

export const deleteMn10Response = async (formId: string, responseId: string): Promise<void> => {
  const responseRef = doc(db, MN10_FORMS_COLLECTION, formId, 'responses', responseId);
  const responseSnapshot = await getDoc(responseRef);

  if (responseSnapshot.exists()) {
    const responseData = responseSnapshot.data();
    const attachments = (responseData.attachments as MN10ResponseAttachment[]) || [];
    await Promise.all(
      attachments.map(async attachment => {
        try {
          await deleteObject(ref(storage, attachment.path));
        } catch (storageError) {
          console.warn('Falha ao remover anexo do Storage:', storageError);
        }
      })
    );
  }

  await deleteDoc(responseRef);

  const formRef = doc(db, MN10_FORMS_COLLECTION, formId);
  await runTransaction(db, async transaction => {
    const formSnapshot = await transaction.get(formRef);
    if (!formSnapshot.exists()) {
      return;
    }

    const current = Number(formSnapshot.data().responseCount || 0);
    transaction.update(formRef, {
      responseCount: current > 0 ? current - 1 : 0,
      updatedAt: Timestamp.now(),
    });
  });
};

export const deleteMn10Form = async (formId: string): Promise<void> => {
  const responsesRef = collection(db, MN10_FORMS_COLLECTION, formId, 'responses');
  const responsesSnapshot = await getDocs(responsesRef);

  await Promise.all(
    responsesSnapshot.docs.map(async responseDoc => {
      const responseData = responseDoc.data();
      const attachments = (responseData.attachments as MN10ResponseAttachment[]) || [];
      await Promise.all(
        attachments.map(async attachment => {
          try {
            await deleteObject(ref(storage, attachment.path));
          } catch (storageError) {
            console.warn('Falha ao remover anexo do Storage:', storageError);
          }
        })
      );
    })
  );

  if (!responsesSnapshot.empty) {
    const batch = writeBatch(db);
    responsesSnapshot.docs.forEach(response => {
      batch.delete(response.ref);
    });
    await batch.commit();
  }

  const formRef = doc(db, MN10_FORMS_COLLECTION, formId);
  await deleteDoc(formRef);
};

export const getMn10AttachmentDownloadUrl = async (path: string): Promise<string> => {
  const fileRef = ref(storage, path);
  return getDownloadURL(fileRef);
};

