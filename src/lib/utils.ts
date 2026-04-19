import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { format, isValid } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: any, formatStr: string = 'MMM dd, yyyy') {
  if (!date) return 'N/A';
  
  let dateObj: Date;
  
  if (date instanceof Date) {
    dateObj = date;
  } else if (typeof date === 'number') {
    dateObj = new Date(date);
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date && typeof date.seconds === 'number') {
    dateObj = new Date(date.seconds * 1000);
  } else if (date && date.toDate && typeof date.toDate === 'function') {
    dateObj = date.toDate();
  } else {
    return 'N/A';
  }

  return isValid(dateObj) ? format(dateObj, formatStr) : 'N/A';
}
