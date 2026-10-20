import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { normalizeForSearch } from '../../utils/nameUtils';
import { FIELD_CLASSES, LABEL_CLASSES } from './fieldStyles';
import Icon from './Icon';

interface SearchableSelectProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
}

// Lista suspensa com busca (combobox): digitar filtra sem diferenciar maiúsculas/acentos.
// A lista fica no fluxo da página (não é um popover absoluto) para não ser cortada por cartões com overflow-hidden.
const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  emptyMessage = 'Nenhum resultado encontrado',
  className = '',
}) => {
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filteredOptions = useMemo(() => {
    const terms = normalizeForSearch(query).split(' ').filter(Boolean);
    if (terms.length === 0) return options;
    return options.filter(option => {
      const searchable = normalizeForSearch(option);
      return terms.every(term => searchable.includes(term));
    });
  }, [options, query]);

  const open = () => {
    if (isOpen) return;
    const selectedIndex = options.indexOf(value);
    setQuery('');
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setQuery('');
  };

  const select = (option: string) => {
    onChange(option);
    close();
  };

  // Fecha ao tocar/clicar fora
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isOpen]);

  // Mantém a opção ativa visível dentro da lista
  useEffect(() => {
    if (!isOpen) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          open();
        } else {
          setActiveIndex(index => Math.min(index + 1, filteredOptions.length - 1));
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex(index => Math.max(index - 1, 0));
        break;
      case 'Home':
        if (isOpen) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (isOpen) {
          event.preventDefault();
          setActiveIndex(Math.max(filteredOptions.length - 1, 0));
        }
        break;
      case 'Enter':
        if (isOpen) {
          event.preventDefault();
          const option = filteredOptions[activeIndex];
          if (option !== undefined) select(option);
        }
        break;
      case 'Escape':
        if (isOpen) {
          event.preventDefault();
          close();
        }
        break;
      case 'Tab':
        close();
        break;
    }
  };

  return (
    <div ref={containerRef} className={className}>
      <label htmlFor={inputId} className={LABEL_CLASSES}>
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={isOpen && filteredOptions.length > 0 ? optionId(activeIndex) : undefined}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          value={isOpen ? query : value}
          placeholder={isOpen ? value || placeholder : placeholder}
          onChange={event => {
            setQuery(event.target.value);
            setActiveIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={open}
          onClick={open}
          onKeyDown={handleKeyDown}
          className={`${FIELD_CLASSES} pr-11 ${isOpen ? '' : 'cursor-pointer text-ellipsis'}`}
        />
        <span
          className="pointer-events-none absolute inset-y-0 right-0 flex w-11 items-center justify-center text-gray-500"
          aria-hidden="true"
        >
          <Icon name={isOpen ? 'search' : 'chevron-down'} className="h-5 w-5" />
        </span>
      </div>

      {isOpen && (
        <>
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className="mt-1 max-h-60 overflow-y-auto rounded-brand border border-gray-300 bg-white shadow-sm divide-y divide-gray-100"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-3 text-sm text-gray-500">{emptyMessage}</li>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={option}
                    id={optionId(index)}
                    role="option"
                    aria-selected={isSelected}
                    data-index={index}
                    // preventDefault no mousedown mantém o foco no campo (evita fechar antes do clique)
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => select(option)}
                    onMouseMove={() => setActiveIndex(index)}
                    className={`flex min-h-11 cursor-pointer items-center justify-between gap-2 px-3 py-2 text-base sm:text-sm break-words ${
                      isActive ? 'bg-brand-light' : 'bg-white'
                    } ${isSelected ? 'font-semibold text-brand-primary' : 'text-gray-700'}`}
                  >
                    <span className="min-w-0">{option}</span>
                    {isSelected && <Icon name="check" className="h-4 w-4 flex-shrink-0" />}
                  </li>
                );
              })
            )}
          </ul>
          <p className="sr-only" role="status" aria-live="polite">
            {filteredOptions.length} {filteredOptions.length === 1 ? 'resultado' : 'resultados'}
          </p>
        </>
      )}
    </div>
  );
};

export default SearchableSelect;
