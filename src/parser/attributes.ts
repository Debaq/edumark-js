import type { BlockAttributes, BlockType } from '../types.js'

const VALID_BLOCK_TYPES = new Set<string>([
  'hero', 'objective', 'definition', 'key-concept', 'note', 'warning',
  'example', 'exercise', 'application', 'comparison', 'diagram',
  'image', 'question', 'mnemonic', 'history', 'summary',
  'reference', 'aside', 'teacher-only', 'student-only', 'solution', 'math',
])

/**
 * Parse a container opening line like:
 *   :::type id="val" title="val" flag
 * Returns { blockType, attributes } or null if invalid.
 */
export function parseContainerLine(line: string): { blockType: BlockType; attributes: BlockAttributes } | null {
  const match = line.match(/^:{3,}\s*(\S+)(.*)$/)
  if (!match) return null

  const typeName = match[1]
  if (!VALID_BLOCK_TYPES.has(typeName)) return null

  const rest = match[2].trim()
  const attributes = parseAttributes(rest)

  return { blockType: typeName as BlockType, attributes }
}

/**
 * Parse attribute string like:
 *   id="my-id" title="My Title" multiple
 */
export function parseAttributes(input: string): BlockAttributes {
  const attrs: BlockAttributes = {}
  if (!input) return attrs

  const re = /(\w[\w-]*)(?:="([^"]*)")?/g
  let m: RegExpExecArray | null
  while ((m = re.exec(input)) !== null) {
    const key = m[1]
    const value = m[2]
    if (value !== undefined) {
      attrs[key] = value
    } else {
      // Flag attribute (e.g., "multiple")
      attrs[key] = true
    }
  }

  return attrs
}
