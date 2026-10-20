import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ImageOff } from 'lucide-react';
import type { RadioOption } from '../../types';

interface QuestionImageProps {
  src?: string;
  alt: string;
  // Quando informado, exibe a lista suspensa com as opções (legenda); com imagem, clicar nela também abre a lista
  options?: RadioOption[];
}

// `imageUrl` vem do Firestore (gravável por qualquer usuário autenticado): só exibe imagens do Firebase Storage
const isTrustedImageUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname === 'firebasestorage.googleapis.com';
  } catch {
    return false;
  }
};

const QuestionImage: React.FC<QuestionImageProps> = ({ src, alt, options }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const hasImage = Boolean(src);
  const hasFailed = hasImage && (failedSrc === src || !isTrustedImageUrl(src as string));
  const legend = (options ?? []).filter(option => option.label.trim() || option.value.trim());
  const hasLegend = legend.length > 0;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggleLegend = () => setIsOpen(open => !open);

  const image = hasImage && !hasFailed && (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src as string)}
      className="w-full max-h-72 object-contain rounded-md border border-gray-200 bg-white"
    />
  );

  const failedNotice = hasFailed && (
    <div className="flex items-center gap-2 p-3 text-sm text-gray-500 bg-gray-100 border border-gray-200 rounded-md">
      <ImageOff className="h-4 w-4" />
      Imagem indisponível
    </div>
  );

  return (
    <div ref={containerRef} className="max-w-md">
      {hasLegend && image ? (
        <button
          type="button"
          onClick={toggleLegend}
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-label={`${alt}: ${isOpen ? 'ocultar' : 'ver'} opções`}
          className="block w-full rounded-md focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          {image}
        </button>
      ) : (
        image
      )}
      {failedNotice}
      {hasLegend && (
        <>
          <button
            type="button"
            onClick={toggleLegend}
            aria-expanded={isOpen}
            aria-controls={listId}
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-primary hover:text-brand-secondary focus:outline-none focus:ring-2 focus:ring-brand-accent rounded"
          >
            {isOpen ? 'Ocultar opções' : 'Ver opções'}
            <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
          {/* Lista no fluxo (sem posição absoluta): o Card tem overflow-hidden e cortaria um popover */}
          {isOpen && (
            <ul
              id={listId}
              className="mt-1 max-h-60 overflow-auto bg-white border border-gray-300 rounded-md shadow-sm divide-y divide-gray-100"
            >
              {legend.map((option, index) => (
                <li key={`${option.value}-${index}`} className="px-3 py-2 text-sm text-gray-700">
                  {option.value.trim() && <span className="font-semibold text-brand-primary">{option.value}</span>}
                  {option.value.trim() && option.label.trim() && ' – '}
                  {option.label}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
};

export default QuestionImage;
