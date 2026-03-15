import MarkdownIt from 'markdown-it'
import type {
  EdumarkDocument,
  EdumarkBlock,
  BlockType,
  BlockAttributes,
  RefTarget,
  ParseOptions,
} from '../types.js'
import { extractFrontmatter } from './frontmatter.js'
import { containerPlugin } from './container.js'
import { inlineRefPlugin } from './inline-ref.js'
import { resolveIncludes } from './include.js'
import { mathPlugin } from './math.js'
import { parseDefinitions, parseImageFields, parseDiagram, parseQuestion, shouldInclude } from '../blocks/index.js'

export function createParser(): MarkdownIt {
  const md = new MarkdownIt({ html: false, linkify: false })
  md.use(containerPlugin)
  md.use(inlineRefPlugin)
  md.use(mathPlugin)
  md.enable('table')
  return md
}

export function parse(source: string, options: ParseOptions = {}): EdumarkDocument {
  const mode = options.mode || 'all'

  // Step 1: Resolve includes (textual preprocessing)
  let text = source
  if (options.resolveInclude) {
    text = resolveIncludes(text, options.resolveInclude)
  }

  // Step 2: Extract frontmatter
  const { frontmatter, content } = extractFrontmatter(text)

  // Step 3: Parse with markdown-it
  const md = createParser()
  const tokens = md.parse(content, {})

  // Step 4: Build AST from tokens
  const blocks = buildBlocks(tokens, content, mode)

  // Step 5: Build ref map
  const refs = buildRefMap(blocks, tokens)

  return { frontmatter, blocks, refs, tokens }
}

function buildBlocks(tokens: any[], source: string, mode: string): EdumarkBlock[] {
  const blocks: EdumarkBlock[] = []
  const stack: EdumarkBlock[][] = [blocks]
  let currentBlock: EdumarkBlock | null = null

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]

    if (token.type === 'edm_container_open') {
      const blockType = token.info as BlockType
      const attributes: BlockAttributes = token.meta?.attributes || {}

      // Check conditional inclusion
      if (!shouldInclude(blockType, mode as any)) {
        // Skip until matching close
        let depth = 1
        i++
        while (i < tokens.length && depth > 0) {
          if (tokens[i].type === 'edm_container_open') depth++
          if (tokens[i].type === 'edm_container_close') depth--
          i++
        }
        i-- // Will be incremented by the loop
        continue
      }

      const block: EdumarkBlock = {
        blockType,
        attributes,
        content: '',
        children: [],
      }

      // Get raw content between open and close for special parsing
      const rawContent = extractRawContent(tokens, i, source)
      block.content = rawContent

      // Parse special block internals
      parseBlockInternals(block)

      stack[stack.length - 1].push(block)
      stack.push(block.children)
      currentBlock = block
    } else if (token.type === 'edm_container_close') {
      stack.pop()
      currentBlock = null
    }
  }

  return blocks
}

function extractRawContent(tokens: any[], openIdx: number, source: string): string {
  const openToken = tokens[openIdx]

  // Find matching close token
  let depth = 1
  let closeIdx = openIdx + 1
  while (closeIdx < tokens.length && depth > 0) {
    if (tokens[closeIdx].type === 'edm_container_open') depth++
    if (tokens[closeIdx].type === 'edm_container_close') depth--
    closeIdx++
  }
  closeIdx-- // points to the close token

  // Use line map from tokens to extract raw source
  // openToken.map = [startLine, endLine] of the container
  const lines = source.split('\n')
  const startLine = openToken.map ? openToken.map[0] + 1 : -1 // line after :::type
  const endLine = openToken.map ? openToken.map[1] : -1

  if (startLine >= 0 && endLine > startLine) {
    // Find the first nested container's start line to exclude nested content
    let contentEndLine = endLine
    for (let i = openIdx + 1; i < tokens.length; i++) {
      if (tokens[i].type === 'edm_container_open' && tokens[i].map) {
        // Only exclude if it's a direct child (depth 1)
        let d = 0
        for (let j = openIdx + 1; j <= i; j++) {
          if (tokens[j].type === 'edm_container_open') d++
          if (tokens[j].type === 'edm_container_close') d--
        }
        if (d === 1) {
          contentEndLine = Math.min(contentEndLine, tokens[i].map[0])
          break
        }
      }
      if (tokens[i].type === 'edm_container_close') {
        let d2 = 1
        for (let j = openIdx + 1; j < i; j++) {
          if (tokens[j].type === 'edm_container_open') d2++
          if (tokens[j].type === 'edm_container_close') d2--
        }
        if (d2 === 0) break
      }
    }

    return lines.slice(startLine, contentEndLine).join('\n').trim()
  }

  // Fallback: collect from tokens
  const parts: string[] = []
  depth = 1
  let i = openIdx + 1
  while (i < tokens.length && depth > 0) {
    if (tokens[i].type === 'edm_container_open') depth++
    else if (tokens[i].type === 'edm_container_close') depth--
    else if (depth === 1) {
      if (tokens[i].type === 'inline') parts.push(tokens[i].content)
      else if (tokens[i].type === 'fence') parts.push('```' + (tokens[i].info || '') + '\n' + tokens[i].content + '```')
      else if (tokens[i].content) parts.push(tokens[i].content)
    }
    i++
  }
  return parts.join('\n')
}

function parseBlockInternals(block: EdumarkBlock): void {
  switch (block.blockType) {
    case 'definition':
      block.definitions = parseDefinitions(block.content)
      break
    case 'image':
      block.fields = parseImageFields(block.content)
      break
    case 'diagram': {
      const result = parseDiagram(block.content)
      block.description = result.description
      block.diagramCode = result.diagramCode
      break
    }
    case 'question': {
      const type = block.attributes.type as string || 'open'
      const result = parseQuestion(block.content, type)
      block.content = result.stem
      block.options = result.options
      block.answers = result.answers
      break
    }
  }
}

function buildRefMap(blocks: EdumarkBlock[], tokens: any[]): Map<string, RefTarget> {
  const refs = new Map<string, RefTarget>()
  const counters = new Map<string, number>()

  function getNumber(type: string): number {
    const n = (counters.get(type) || 0) + 1
    counters.set(type, n)
    return n
  }

  function walkBlocks(blockList: EdumarkBlock[]) {
    for (const block of blockList) {
      if (block.attributes.id) {
        const num = getNumber(block.blockType)
        refs.set(block.attributes.id, {
          type: 'block',
          blockType: block.blockType,
          title: (block.attributes.title as string) || undefined,
          number: num,
        })
      }
      walkBlocks(block.children)
    }
  }

  walkBlocks(blocks)

  // Also scan heading tokens for ids
  for (const token of tokens) {
    if (token.type === 'heading_open') {
      const slug = token.attrGet?.('id')
      if (slug) {
        refs.set(slug, { type: 'heading' })
      }
    }
  }

  return refs
}
