/**
 * Parse definition block content.
 * Format: **Term** | Definition (one per line)
 */
export function parseDefinitions(content: string): Array<{ term: string; definition: string }> {
  const results: Array<{ term: string; definition: string }> = []
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Match **Term** | Definition
    const match = trimmed.match(/^\*\*(.+?)\*\*\s*\|\s*(.+)$/)
    if (match) {
      results.push({ term: match[1].trim(), definition: match[2].trim() })
    }
  }

  return results
}
