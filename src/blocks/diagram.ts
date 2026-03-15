/**
 * Parse diagram block content.
 * Separates text description from optional fenced code block.
 */
export function parseDiagram(content: string): {
  description: string
  diagramCode?: { language: string; code: string }
} {
  const fenceMatch = content.match(/```(\w+)\n([\s\S]*?)```/)

  if (!fenceMatch) {
    return { description: content.trim() }
  }

  const language = fenceMatch[1]
  const code = fenceMatch[2].trim()
  const description = content.slice(0, fenceMatch.index).trim()

  return {
    description: description || '',
    diagramCode: { language, code },
  }
}
