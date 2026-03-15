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
} from './types.js'

export { EdumarkError, ParseError, IncludeError, RefError } from './utils/errors.js'

import { parse as parseImpl } from './parser/index.js'
import { render as renderImpl } from './renderer/index.js'
import type { EdumarkDocument, ParseOptions, RenderOptions, DecodeOptions } from './types.js'

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
