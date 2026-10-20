import React from 'react';

interface RatingSlider5Props {
  label: string;
  value?: number | null;
  onChange: (value: number | null) => void;
  required?: boolean;
}

const RatingSlider5: React.FC<RatingSlider5Props> = ({ label, value, onChange, required }) => {
  const numbers = Array.from({ length: 5 }, (_, i) => i + 1);

  // Botões de 44px no celular (grade 5 colunas); círculos compactos a partir de `sm`
  const getButtonClasses = (num: number, isSelected: boolean) => {
    let classes = 'h-11 w-full sm:h-9 sm:w-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

    if (isSelected) {
      if (num <= 2) {
        classes += ' bg-red-500 text-white focus-visible:ring-red-500';
      } else if (num === 3) {
        classes += ' bg-yellow-500 text-white focus-visible:ring-yellow-500';
      } else {
        classes += ' bg-brand-green-natural text-white focus-visible:ring-brand-green-natural';
      }
    } else {
      classes += ' bg-gray-100 text-gray-700 hover:bg-gray-200 focus-visible:ring-brand-primary';
    }

    return classes;
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700 break-words">
        {label}
        {required && <span className="text-red-600 ml-1" aria-hidden="true">*</span>}
      </span>
      <div className="grid grid-cols-5 gap-2 sm:flex sm:flex-wrap sm:gap-1.5" role="group" aria-label={label}>
        {numbers.map((num) => {
          const isSelected = value === num;
          return (
            <button
              key={num}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(isSelected ? null : num)}
              className={getButtonClasses(num, isSelected)}
              aria-label={`Nota ${num}`}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default RatingSlider5;
