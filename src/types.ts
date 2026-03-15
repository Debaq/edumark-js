export type BlockType =
  | 'objective'
  | 'definition'
  | 'key-concept'
  | 'note'
  | 'warning'
  | 'example'
  | 'exercise'
  | 'application'
  | 'comparison'
  | 'diagram'
  | 'image'
  | 'question'
  | 'mnemonic'
  | 'history'
  | 'summary'
  | 'reference'
  | 'aside'
  | 'teacher-only'
  | 'student-only'
  | 'solution'
  | 'math'

export interface BlockAttributes {
  id?: string
  title?: string
  type?: string
  multiple?: boolean
  characters?: string
  year?: string
  [key: string]: string | boolean | undefined
}

export interface EdumarkBlock {
  blockType: BlockType
  attributes: BlockAttributes
  content: string
  children: EdumarkBlock[]
  /** For definition blocks: parsed term/definition pairs */
  definitions?: Array<{ term: string; definition: string }>
  /** For image blocks: parsed key-value fields */
  fields?: Record<string, string>
  /** For question blocks: parsed options */
  options?: QuestionOption[]
  /** For question blocks: model answers (open/case) */
  answers?: string[]
  /** For diagram blocks: text description */
  description?: string
  /** For diagram blocks: code block info */
  diagramCode?: { language: string; code: string }
}

export interface QuestionOption {
  correct: boolean
  text: string
  feedback?: string
}

export interface EdumarkRef {
  id: string
  file?: string
  text?: string
}

export interface Frontmatter {
  [key: string]: unknown
}

export interface EdumarkDocument {
  frontmatter: Frontmatter
  blocks: EdumarkBlock[]
  /** All ref targets: id → block/heading info */
  refs: Map<string, RefTarget>
  /** Raw markdown-it tokens (for advanced use) */
  tokens: unknown[]
}

export interface RefTarget {
  type: 'block' | 'heading'
  blockType?: BlockType
  title?: string
  number?: number
}

export type Mode = 'student' | 'teacher' | 'all'

export interface ParseOptions {
  mode?: Mode
  resolveInclude?: (path: string) => string
}

export interface RenderOptions {
  mode?: Mode
}

export interface DecodeOptions extends ParseOptions, RenderOptions {}
