const onlyDigits = (value: string): string => value.replace(/\D/g, '');

export const applyDateMask = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 8);
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);

  if (digits.length <= 2) {
    return day;
  }
  if (digits.length <= 4) {
    return `${day}/${month}`;
  }
  return `${day}/${month}/${year}`;
};

export const isCompleteMaskedDate = (value: string): boolean => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return false;
  }

  const [dayRaw, monthRaw, yearRaw] = value.split('/');
  const day = Number(dayRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    return false;
  }
  if (year < 1900 || year > 3000) {
    return false;
  }
  if (month < 1 || month > 12) {
    return false;
  }

  const maxDay = new Date(year, month, 0).getDate();
  return day >= 1 && day <= maxDay;
};

export const maskedDateToIso = (value: string): string | null => {
  if (!isCompleteMaskedDate(value)) {
    return null;
  }
  const [day, month, year] = value.split('/');
  return `${year}-${month}-${day}`;
};

export const isoDateToMasked = (value: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '';
  }
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

export const applyPhoneMask = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 11);
  const ddd = digits.slice(0, 2);
  const phone = digits.slice(2);

  if (digits.length <= 2) {
    return ddd ? `(${ddd}` : '';
  }
  return `(${ddd})${phone}`;
};

export const isCompleteMaskedPhone = (value: string): boolean => {
  return /^\(\d{2}\)\d{9}$/.test(value);
};
