/**
 * Parse image block content.
 * Format: key: value or key: "value" (one per line)
 */
export function parseImageFields(content: string): Record<string, string> {
  const fields: Record<string, string> = {}
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const match = trimmed.match(/^(\w+):\s*(?:"([^"]*)"|(.+))$/)
    if (match) {
      const key = match[1]
      const value = match[2] !== undefined ? match[2] : match[3].trim()
      fields[key] = value
    }
  }

  return fields
}
