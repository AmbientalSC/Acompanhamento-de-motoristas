import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

// Deve acompanhar as regras de templates/images em storage.rules
export const TEMPLATE_IMAGE_MAX_SIZE_MB = 5;
export const TEMPLATE_IMAGE_ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

const TEMPLATE_IMAGES_ROOT = 'templates/images';

// Formato exato dos caminhos gerados por uploadTemplateImage (nunca confiar em `imagePath` do Firestore sem validar)
const TEMPLATE_IMAGE_PATH_PATTERN = /^templates\/images\/[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/;

// crypto.randomUUID só existe em contexto seguro (HTTPS/localhost) e Safari >= 15.4
const generateFolderId = (): string => {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export interface UploadedTemplateImage {
  path: string;
  url: string;
}

const sanitizeFileName = (name: string): string => name.replace(/[^a-zA-Z0-9._-]/g, '_');

export const validateTemplateImage = (file: File): string | null => {
  if (!(TEMPLATE_IMAGE_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return 'Formato de imagem não permitido. Use JPG, PNG ou WebP.';
  }
  if (file.size > TEMPLATE_IMAGE_MAX_SIZE_MB * 1024 * 1024) {
    return `A imagem excede o limite de ${TEMPLATE_IMAGE_MAX_SIZE_MB} MB.`;
  }
  return null;
};

const mapUploadErrorMessage = (uploadError: unknown): string => {
  const errorCode = String((uploadError as { code?: unknown } | null)?.code ?? '');

  if (errorCode === 'storage/unauthorized') {
    return 'Permissão negada pelo Firebase Storage. Confirme se as regras de Storage foram publicadas e se o usuário é administrador.';
  }
  if (errorCode === 'storage/bucket-not-found' || errorCode === 'storage/object-not-found') {
    return 'Bucket do Firebase Storage não encontrado. Ative o Storage no projeto e confirme o bucket em firebase.ts.';
  }
  if (errorCode === 'storage/canceled') {
    return 'Upload cancelado.';
  }
  return 'Falha ao enviar a imagem. Tente novamente.';
};

export const uploadTemplateImage = async (file: File): Promise<UploadedTemplateImage> => {
  const validationError = validateTemplateImage(file);
  if (validationError) {
    throw new Error(validationError);
  }

  // Pasta única por upload: ids de critérios (ex.: slugs dos modelos de exemplo) podem colidir entre modelos
  const path = `${TEMPLATE_IMAGES_ROOT}/${generateFolderId()}/${Date.now()}_${sanitizeFileName(file.name)}`;
  const storageRef = ref(storage, path);

  try {
    await uploadBytes(storageRef, file, { contentType: file.type });
    const url = await getDownloadURL(storageRef);
    return { path, url };
  } catch (uploadError) {
    console.error('Erro ao enviar imagem do modelo para o Storage:', uploadError);
    throw new Error(mapUploadErrorMessage(uploadError));
  }
};

// Remoção best-effort: a falha não deve impedir a operação principal (salvar/excluir modelo)
export const deleteTemplateImage = async (path: string): Promise<void> => {
  if (!TEMPLATE_IMAGE_PATH_PATTERN.test(path)) {
    console.warn('Caminho de imagem de modelo ignorado (formato inesperado):', path);
    return;
  }
  try {
    await deleteObject(ref(storage, path));
  } catch (deleteError) {
    console.warn('Falha ao remover imagem do modelo do Storage:', deleteError);
  }
};
