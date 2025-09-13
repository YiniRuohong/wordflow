import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format number with commas
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

// Calculate percentage
export function calculatePercentage(value: number, total: number): number {
  return total === 0 ? 0 : Math.round((value / total) * 100)
}

// Format duration in minutes to human readable
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}小时${remainingMinutes > 0 ? ` ${remainingMinutes}分钟` : ''}`
}

// Format date to readable string
export function formatDate(date: string | Date): string {
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Robust grapheme splitter for emoji-safe animations
export function splitGraphemes(text: string): string[] {
  try {
    // Prefer Intl.Segmenter when available for correct grapheme clusters
    const AnyIntl: any = Intl as any
    if (AnyIntl && typeof AnyIntl.Segmenter === 'function') {
      const seg = new AnyIntl.Segmenter(undefined, { granularity: 'grapheme' })
      return Array.from(seg.segment(text), (s: any) => s.segment)
    }
  } catch {
    // fall through
  }
  // Fallback splits by code points; better than .split('') for surrogate pairs
  return Array.from(text)
}
