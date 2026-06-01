import React from 'react';

interface RatingSlider5Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

const RatingSlider5: React.FC<RatingSlider5Props> = ({ label, value, onChange }) => {
  const numbers = Array.from({ length: 5 }, (_, i) => i + 1);

  const getButtonClasses = (num: number, isSelected: boolean) => {
    let classes = 'w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2';

    if (isSelected) {
      if (num <= 2) {
        classes += ' bg-red-500 text-white ring-red-500 focus:ring-red-500';
      } else if (num === 3) {
        classes += ' bg-yellow-500 text-white ring-yellow-500 focus:ring-yellow-500';
      } else {
        classes += ' bg-green-500 text-white ring-green-500 focus:ring-green-500';
      }
    } else {
      classes += ' bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-brand-accent';
    }

    return classes;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-4">
      <label className="text-sm font-medium text-gray-700 w-full sm:w-2/5 self-start sm:self-center">
        {label}
      </label>
      <div className="flex flex-wrap items-center justify-start gap-1.5 w-full sm:w-3/5" role="radiogroup" aria-label={label}>
        {numbers.map((num) => (
          <button
            key={num}
            type="button"
            role="radio"
            aria-checked={value === num}
            onClick={() => onChange(num)}
            className={getButtonClasses(num, value === num)}
            aria-label={`Nota ${num}`}
          >
            {num}
          </button>
        ))}
      </div>
    </div>
  );
};

export default RatingSlider5;
