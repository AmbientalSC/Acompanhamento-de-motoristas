import React from 'react';
import Button from './Button';
import Icon from './Icon';

interface FormActionBarProps {
  isEditing: boolean;
  isSaving: boolean;
  saveLabel: string;
  onCancel: () => void;
}

// Barra de ações do formulário: fixa acima da navegação inferior no celular, comum a partir de `sm`.
// O -mx/-mb compensa o padding do <form> (p-4) para a barra encostar nas bordas do cartão.
const FormActionBar: React.FC<FormActionBarProps> = ({ isEditing, isSaving, saveLabel, onCancel }) => (
  <div className="sticky bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 -mb-4 flex gap-2 rounded-b-lg border-t border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:static sm:z-auto sm:mx-0 sm:mb-0 sm:justify-end sm:gap-4 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
    {isEditing && (
      <Button type="button" onClick={onCancel} variant="secondary" className="flex-1 sm:flex-none">
        Cancelar<span className="hidden sm:inline">&nbsp;edição</span>
      </Button>
    )}
    <Button type="submit" disabled={isSaving} className={isEditing ? 'flex-[2] sm:flex-none' : 'w-full sm:w-auto'}>
      {isSaving ? <Icon name="loader-2" className="h-5 w-5 animate-spin" /> : <Icon name="device-floppy" className="h-5 w-5" />}
      {isSaving ? 'Salvando...' : saveLabel}
    </Button>
  </div>
);

export default FormActionBar;
