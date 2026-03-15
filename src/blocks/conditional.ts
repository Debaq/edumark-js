import type { Mode } from '../types.js'

/**
 * Check if a conditional block should be included based on mode.
 */
export function shouldInclude(blockType: string, mode: Mode): boolean {
  if (mode === 'all') return true
  if (blockType === 'teacher-only') return mode === 'teacher'
  if (blockType === 'student-only') return mode === 'student'
  return true
}
