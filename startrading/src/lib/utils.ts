import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCardImage(name: string): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  
  // Mapping based on specific display names to avoid broad matches
  if (lower.includes('van gogh')) return '/images/cards/image_1.png';
  if (lower.includes('umbreon vmax hr'))  return '/images/cards/image_2.png';
  if (lower.includes('psyduck munch'))  return '/images/cards/image_3.png';
  if (lower.includes('rayquaza vmax hr')) return '/images/cards/image_4.png';
  if (lower.includes('25th anniversary promo'))     return '/images/cards/image_5.png';
  if (lower.includes('charizard ex sar')) return '/images/cards/image_6.png';
  if (lower.includes('sm-p 288')) return '/images/cards/image_7.png'; // Munch Pikachu
  if (lower.includes('sv-p 153'))      return '/images/cards/image_8.png'; // 5th Anniv
  if (lower.includes('ar 151c'))  return '/images/cards/image_9.png'; // AR 151C
  if (lower.includes('mcdonald')) return '/images/cards/image_10.png';
  
  // Extra fallbacks for specific munch cards
  if (lower.includes('munch') && lower.includes('pikachu')) return '/images/cards/image_7.png';
  if (lower.includes('munch') && lower.includes('psyduck')) return '/images/cards/image_3.png';
  
  return null;
}
