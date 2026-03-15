export type {
  EdumarkDocument,
  EdumarkBlock,
  BlockType,
  BlockAttributes,
  QuestionOption,
  EdumarkRef,
  Frontmatter,
  RefTarget,
  Mode,
  ParseOptions,
  RenderOptions,
  DecodeOptions,
  DiagramOptions,
  DecodeAsyncOptions,
  RenderAsyncOptions,
} from './types.js'

export { EdumarkError, ParseError, IncludeError, RefError } from './utils/errors.js'
export { setKatex } from './renderer/enhance-math.js'
export { enhanceDiagrams } from './renderer/enhance-diagrams.js'

import { parse as parseImpl } from './parser/index.js'
import { render as renderImpl } from './renderer/index.js'
import { enhanceDiagrams } from './renderer/enhance-diagrams.js'
import type {
  EdumarkDocument,
  ParseOptions,
  RenderOptions,
  DecodeOptions,
  DecodeAsyncOptions,
  RenderAsyncOptions,
} from './types.js'

/**
 * Parse an .edm source string into an EdumarkDocument AST.
 */
export function parse(source: string, options?: ParseOptions): EdumarkDocument {
  return parseImpl(source, options)
}

/**
 * Render an EdumarkDocument AST to HTML.
 */
export function render(doc: EdumarkDocument, options?: RenderOptions): string {
  return renderImpl(doc, options)
}

/**
 * Decode an .edm source string directly to HTML (shortcut for parse + render).
 */
export function decode(source: string, options?: DecodeOptions): string {
  const doc = parse(source, options)
  return render(doc, options)
}

/**
 * Render an EdumarkDocument AST to HTML, then enhance diagrams via Kroki.
 */
export async function renderAsync(doc: EdumarkDocument, options?: RenderAsyncOptions): Promise<string> {
  const html = render(doc, options)
  return enhanceDiagrams(html, options)
}

/**
 * Decode an .edm source string to fully rendered HTML.
 * Math is rendered by KaTeX (if installed) in the sync pipeline.
 * Diagrams are rendered via Kroki.io asynchronously.
 */
export async function decodeAsync(source: string, options?: DecodeAsyncOptions): Promise<string> {
  const doc = parse(source, options)
  const html = render(doc, options)
  return enhanceDiagrams(html, options)
}
