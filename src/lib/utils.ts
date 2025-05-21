import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateString(dateString?: string | null): string {
  if (!dateString) return '';
  try {
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateString; // Return original if parsing fails
  } catch (error) {
    console.error("Error formatting date string:", dateString, error);
    return dateString; // Return original on error
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}
