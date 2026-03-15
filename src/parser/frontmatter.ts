import yaml from 'js-yaml'
import type { Frontmatter } from '../types.js'

/**
 * Extract YAML frontmatter from source text.
 * Returns the parsed frontmatter and the remaining content.
 */
export function extractFrontmatter(source: string): { frontmatter: Frontmatter; content: string } {
  const trimmed = source.trimStart()
  if (!trimmed.startsWith('---')) {
    return { frontmatter: {}, content: source }
  }

  const endIndex = trimmed.indexOf('\n---', 3)
  if (endIndex === -1) {
    return { frontmatter: {}, content: source }
  }

  const yamlStr = trimmed.slice(3, endIndex).trim()
  const content = trimmed.slice(endIndex + 4) // skip past \n---

  let frontmatter: Frontmatter = {}
  try {
    const parsed = yaml.load(yamlStr)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      frontmatter = parsed as Frontmatter
    }
  } catch {
    // Invalid YAML — treat as no frontmatter
    return { frontmatter: {}, content: source }
  }

  return { frontmatter, content }
}
