/**
 * Parse hero block content.
 * Format: key: value or key: "value" (one per line) + bulleted list for topics.
 */
export function parseHeroFields(content: string): { fields: Record<string, string>; topics: string[] } {
  const fields: Record<string, string> = {}
  const topics: string[] = []
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Topic item
    if (trimmed.startsWith('- ')) {
      topics.push(trimmed.slice(2).trim())
      continue
    }

    // Key: value field
    const match = trimmed.match(/^(\w[\w-]*):\s*(?:"([^"]*)"|(.+))$/)
    if (match) {
      const key = match[1]
      const value = match[2] !== undefined ? match[2] : match[3].trim()
      fields[key] = value
    }
  }

  return { fields, topics }
}
