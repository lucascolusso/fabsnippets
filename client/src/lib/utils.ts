import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type CodeCategory } from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Maps a code category to its display name
 * @param category The code category to get display name for
 * @returns The friendly display name for the category
 */
export function getCategoryDisplayName(category: CodeCategory): string {
  // Map PowerQuery to M for display purposes
  if (category === 'PowerQuery') {
    return 'M'
  }
  return category
}
