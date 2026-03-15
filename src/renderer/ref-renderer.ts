import type { EdumarkDocument } from '../types.js'

/**
 * Resolve ref placeholders in rendered HTML using the document's ref map and numbering labels.
 */
export function resolveRefs(html: string, doc: EdumarkDocument, labels: Map<string, string>): string {
  // Refs are already rendered by the inline-ref plugin as <a href="#id" class="edm-ref">label</a>
  // Here we can optionally enhance them with numbered labels
  // For now, the inline plugin handles direct rendering
  return html
}
