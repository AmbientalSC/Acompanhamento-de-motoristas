import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import type { RadioOption } from '../../types';

interface QuestionImageProps {
  src?: string;
  alt: string;
  // Quando informado, exibe a legenda (lista suspensa "Ver opções" e, na imagem ampliada, a lista junto da foto)
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

interface LegendListProps {
  legend: RadioOption[];
  id?: string;
  className?: string;
}

const LegendList: React.FC<LegendListProps> = ({ legend, id, className = '' }) => (
  <ul id={id} className={`bg-white border border-gray-300 rounded-brand divide-y divide-gray-100 ${className}`}>
    {legend.map((option, index) => (
      <li key={`${option.value}-${index}`} className="px-3 py-2.5 text-sm text-gray-700 break-words">
        {option.value.trim() && <span className="font-semibold text-brand-primary">{option.value}</span>}
        {option.value.trim() && option.label.trim() && ' – '}
        {option.label}
      </li>
    ))}
  </ul>
);

const QuestionImage: React.FC<QuestionImageProps> = ({ src, alt, options }) => {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isActualSize, setIsActualSize] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerTriggerRef = useRef<HTMLButtonElement>(null);
  const viewerCloseRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const hasImage = Boolean(src);
  const hasFailed = hasImage && (failedSrc === src || !isTrustedImageUrl(src as string));
  const legend = (options ?? []).filter(option => option.label.trim() || option.value.trim());
  const hasLegend = legend.length > 0;

  // Legenda: fecha ao tocar fora ou com Esc
  useEffect(() => {
    if (!isLegendOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsLegendOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsLegendOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLegendOpen]);

  // Imagem ampliada: bloqueia a rolagem da página, fecha com Esc e devolve o foco ao abrir/fechar
  useEffect(() => {
    if (!isViewerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    viewerCloseRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsViewerOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    const trigger = viewerTriggerRef.current;
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [isViewerOpen]);

  const toggleLegend = () => setIsLegendOpen(open => !open);

  const openViewer = () => {
    setIsActualSize(false);
    setIsViewerOpen(true);
  };

  const failedNotice = hasFailed && (
    <div role="status" className="flex items-center gap-2 p-3 text-sm text-gray-600 bg-brand-gray border border-gray-200 rounded-brand">
      <Icon name="photo-off" className="h-4 w-4 flex-shrink-0" />
      Imagem indisponível
    </div>
  );

  const viewer = isViewerOpen && hasImage && !hasFailed && (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Imagem ampliada: ${alt}`}
      className="fixed inset-0 z-[60] flex flex-col bg-black/90"
    >
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-white">
        <p className="min-w-0 truncate text-sm font-medium">{alt}</p>
        <div className="flex flex-shrink-0 gap-1">
          <button
            type="button"
            onClick={() => setIsActualSize(size => !size)}
            aria-label={isActualSize ? 'Ajustar imagem à tela' : 'Ver em tamanho real'}
            title={isActualSize ? 'Ajustar à tela' : 'Tamanho real'}
            className="flex h-11 w-11 items-center justify-center rounded-brand hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Icon name={isActualSize ? 'zoom-out' : 'zoom-in'} className="h-6 w-6" />
          </button>
          <button
            ref={viewerCloseRef}
            type="button"
            onClick={() => setIsViewerOpen(false)}
            aria-label="Fechar imagem"
            title="Fechar"
            className="flex h-11 w-11 items-center justify-center rounded-brand hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Icon name="x" className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Tocar fora da imagem fecha; tocar na imagem alterna entre ajustar à tela e tamanho real */}
      <div
        className="flex min-h-0 flex-1 overflow-auto px-3"
        onClick={event => {
          if (event.target === event.currentTarget) setIsViewerOpen(false);
        }}
      >
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onClick={() => setIsActualSize(size => !size)}
          className={
            isActualSize
              ? 'm-auto max-h-none max-w-none cursor-zoom-out rounded-brand bg-white'
              : 'm-auto max-h-full max-w-full cursor-zoom-in rounded-brand bg-white object-contain'
          }
        />
      </div>

      {hasLegend && (
        <div className="max-h-[35dvh] overflow-y-auto px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3">
          <LegendList legend={legend} />
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className="max-w-md min-w-0">
      {hasImage && !hasFailed && (
        <button
          ref={viewerTriggerRef}
          type="button"
          onClick={openViewer}
          aria-label={`Ampliar imagem: ${alt}`}
          aria-haspopup="dialog"
          className="relative block w-full cursor-zoom-in rounded-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
        >
          <img
            src={src}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailedSrc(src as string)}
            className="w-full max-h-72 object-contain rounded-brand border border-gray-200 bg-white"
          />
          <span
            className="pointer-events-none absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white"
            aria-hidden="true"
          >
            <Icon name="zoom-in" className="h-5 w-5" />
          </span>
        </button>
      )}
      {failedNotice}
      {hasLegend && (
        <>
          <button
            type="button"
            onClick={toggleLegend}
            aria-expanded={isLegendOpen}
            aria-controls={listId}
            className="mt-1 -ml-3 inline-flex min-h-11 items-center gap-1 px-3 py-2 rounded-brand text-sm font-semibold text-brand-primary hover:bg-brand-light hover:text-brand-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
          >
            {isLegendOpen ? 'Ocultar opções' : 'Ver opções'}
            <Icon name="chevron-down" className={`h-4 w-4 transition-transform ${isLegendOpen ? 'rotate-180' : ''}`} />
          </button>
          {/* Lista no fluxo (sem posição absoluta): o Card tem overflow-hidden e cortaria um popover */}
          {isLegendOpen && <LegendList legend={legend} id={listId} className="mt-1 max-h-60 overflow-auto shadow-sm" />}
        </>
      )}
      {viewer && createPortal(viewer, document.body)}
    </div>
  );
};

export default QuestionImage;
