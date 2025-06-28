import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTrailerInfo(trailerType?: string, trailerSize?: string): string {
  if (!trailerType && !trailerSize) return '';
  
  let formattedType = '';
  let formattedSize = '';
  
  // Format trailer type - remove underscores and clean up
  if (trailerType) {
    formattedType = trailerType.replace(/_/g, '').toUpperCase();
  }
  
  // Format trailer size - ensure proper spacing before M3
  if (trailerSize) {
    // Remove any existing spaces and ensure single space before M3
    formattedSize = trailerSize.replace(/\s*M3/gi, ' M3').replace(/^\s+|\s+$/g, '');
    // If it doesn't end with M3, add it
    if (!formattedSize.toUpperCase().endsWith('M3')) {
      formattedSize = formattedSize + ' M3';
    }
  }
  
  // Combine with pipe separator
  if (formattedType && formattedSize) {
    return `${formattedType} | ${formattedSize}`;
  } else if (formattedType) {
    return formattedType;
  } else if (formattedSize) {
    return formattedSize;
  }
  
  return '';
}