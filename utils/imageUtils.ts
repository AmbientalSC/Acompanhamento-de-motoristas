// `imageUrl` vem do Firestore (gravável por qualquer usuário autenticado): só aceita imagens do Firebase Storage
export const isTrustedImageUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'firebasestorage.googleapis.com';
  } catch {
    return false;
  }
};
