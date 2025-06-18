// Fichier : lib/utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// VOTRE FONCTION EXISTANTE (CONSERVÉE)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// NOTRE NOUVELLE FONCTION (AJOUTÉE)
export function createSlug(text: string): string {
  if (!text) return "";
  // Extrait le nom avant la parenthèse, nettoie et crée le slug
  const nameOnly = text.split('(')[0].trim();
  return nameOnly
    .toLowerCase()
    .replace(/\s+/g, '-')       // Remplace les espaces par -
    .replace(/[^\w-]+/g, '');   // Supprime tous les caractères non valides
}
