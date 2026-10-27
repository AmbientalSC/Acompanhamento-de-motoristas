import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  Timestamp,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { EvaluationHeader, HeaderField, HeaderFieldRole, HeaderFieldType, HeaderSubject } from '../types';
import { DEFAULT_HEADERS, HEADER_ROLES } from '../utils/headerUtils';

// Cabeçalhos reutilizáveis dos modelos. Escrita só para admin (`firestore.rules`).
const HEADERS_COLLECTION = 'headers';

const SUBJECTS: HeaderSubject[] = ['driver', 'employee', 'candidate'];

const toField = (raw: DocumentData): HeaderField => {
  const role: HeaderFieldRole = raw.role in HEADER_ROLES ? raw.role : 'custom';
  return {
    id: String(raw.id),
    label: String(raw.label ?? ''),
    role,
    type: (raw.type as HeaderFieldType) || 'text',
    options: Array.isArray(raw.options) ? raw.options.map(String) : [],
    required: raw.required === true,
  };
};

const toHeader = (id: string, data: DocumentData): EvaluationHeader => ({
  id,
  name: String(data.name ?? ''),
  subject: SUBJECTS.includes(data.subject) ? data.subject : 'driver',
  computesAverage: data.computesAverage === true,
  fields: Array.isArray(data.fields) ? data.fields.map(toField) : [],
});

// Campos copiados explicitamente: o Firestore rejeita `undefined`
const toDocument = (header: Omit<EvaluationHeader, 'id'>) => ({
  name: header.name.trim(),
  subject: header.subject,
  computesAverage: header.computesAverage,
  fields: header.fields.map(field => ({
    id: field.id,
    label: field.label.trim(),
    role: field.role,
    type: field.type,
    options: field.type === 'select' ? field.options.map(option => option.trim()).filter(Boolean) : [],
    required: field.required,
  })),
});

export const getHeaders = async (): Promise<EvaluationHeader[]> => {
  try {
    const snapshot = await getDocs(collection(db, HEADERS_COLLECTION));
    return snapshot.docs.map(headerDoc => toHeader(headerDoc.id, headerDoc.data()));
  } catch (error) {
    console.error('Erro ao buscar cabeçalhos:', error);
    throw new Error('Falha ao carregar cabeçalhos');
  }
};

// Grava os cabeçalhos padrão que ainda não existem na coleção (ids fixos = `headerType` legado)
export const ensureDefaultHeaders = async (stored: EvaluationHeader[]): Promise<EvaluationHeader[]> => {
  const missing = DEFAULT_HEADERS.filter(def => !stored.some(header => header.id === def.id));
  if (missing.length === 0) return stored;

  try {
    const batch = writeBatch(db);
    missing.forEach(header => {
      batch.set(doc(db, HEADERS_COLLECTION, header.id), { ...toDocument(header), createdAt: Timestamp.now() });
    });
    await batch.commit();
    return [...stored, ...missing];
  } catch (error) {
    console.error('Erro ao criar cabeçalhos padrão:', error);
    throw new Error('Falha ao criar os cabeçalhos padrão');
  }
};

export const saveHeader = async (header: Omit<EvaluationHeader, 'id'>): Promise<EvaluationHeader> => {
  try {
    const headerRef = doc(collection(db, HEADERS_COLLECTION));
    const data = toDocument(header);
    await setDoc(headerRef, { ...data, createdAt: Timestamp.now() });
    return { id: headerRef.id, ...data };
  } catch (error) {
    console.error('Erro ao salvar cabeçalho:', error);
    throw new Error('Falha ao salvar cabeçalho');
  }
};

export const updateHeader = async (id: string, header: Omit<EvaluationHeader, 'id'>): Promise<EvaluationHeader> => {
  try {
    const data = toDocument(header);
    // merge (e não updateDoc): um cabeçalho padrão pode ser editado antes de existir na coleção
    await setDoc(doc(db, HEADERS_COLLECTION, id), { ...data, updatedAt: Timestamp.now() }, { merge: true });
    return { id, ...data };
  } catch (error) {
    console.error('Erro ao atualizar cabeçalho:', error);
    throw new Error('Falha ao atualizar cabeçalho');
  }
};

export const deleteHeader = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, HEADERS_COLLECTION, id));
  } catch (error) {
    console.error('Erro ao excluir cabeçalho:', error);
    throw new Error('Falha ao excluir cabeçalho');
  }
};
