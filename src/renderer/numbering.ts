import type { EdumarkBlock } from '../types.js'

/** Block types that get automatic numbering */
const NUMBERED_TYPES = new Set([
  'definition', 'example', 'exercise', 'diagram', 'image', 'question',
])

/**
 * Assign sequential numbers to blocks by type.
 * Returns a map of block id → label (e.g., "Figura 1", "Ejercicio 3")
 */
export function buildNumbering(blocks: EdumarkBlock[]): Map<string, string> {
  const labels = new Map<string, string>()
  const counters = new Map<string, number>()

  function walk(blockList: EdumarkBlock[]) {
    for (const block of blockList) {
      if (NUMBERED_TYPES.has(block.blockType) && block.attributes.id) {
        const n = (counters.get(block.blockType) || 0) + 1
        counters.set(block.blockType, n)
        const prefix = TYPE_LABELS[block.blockType] || block.blockType
        labels.set(block.attributes.id, `${prefix} ${n}`)
      }
      walk(block.children)
    }
  }

  walk(blocks)
  return labels
}

const TYPE_LABELS: Record<string, string> = {
  definition: 'Definition',
  example: 'Example',
  exercise: 'Exercise',
  diagram: 'Figure',
  image: 'Figure',
  question: 'Question',
}
