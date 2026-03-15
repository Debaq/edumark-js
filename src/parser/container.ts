import type MarkdownIt from 'markdown-it'
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
import { parseContainerLine } from './attributes.js'

/**
 * markdown-it plugin: custom block rule for ::: containers.
 * Handles all 20 Edumark block types with a single rule.
 * Supports nesting and distinguishes from code fences.
 */
export function containerPlugin(md: MarkdownIt): void {
  md.block.ruler.before('fence', 'edm_container', containerRule, {
    alt: ['paragraph', 'reference', 'blockquote', 'list'],
  })

  md.renderer.rules['edm_container_open'] = (tokens, idx) => {
    const token = tokens[idx]
    const blockType = token.info
    const attrs = token.meta?.rawAttrs || ''
    return `<!--edm:${blockType} ${attrs}-->\n`
  }

  md.renderer.rules['edm_container_close'] = (tokens, idx) => {
    const token = tokens[idx]
    const blockType = token.info
    return `<!--/edm:${blockType}-->\n`
  }
}

function containerRule(state: StateBlock, startLine: number, endLine: number, silent: boolean): boolean {
  const pos = state.bMarks[startLine] + state.tShift[startLine]
  const max = state.eMarks[startLine]
  const lineText = state.src.slice(pos, max)

  // Must start with :::
  if (lineText.charCodeAt(0) !== 0x3A || lineText.charCodeAt(1) !== 0x3A || lineText.charCodeAt(2) !== 0x3A) {
    return false
  }

  const parsed = parseContainerLine(lineText)
  if (!parsed) return false

  if (silent) return true

  // Find matching closing :::
  let nestLevel = 1
  let nextLine = startLine + 1

  while (nextLine < endLine) {
    const npos = state.bMarks[nextLine] + state.tShift[nextLine]
    const nmax = state.eMarks[nextLine]
    const nline = state.src.slice(npos, nmax)

    // Skip fenced code blocks (``` ... ```) to not confuse with :::
    if (nline.startsWith('```')) {
      nextLine++
      while (nextLine < endLine) {
        const cpos = state.bMarks[nextLine] + state.tShift[nextLine]
        const cmax = state.eMarks[nextLine]
        const cline = state.src.slice(cpos, cmax)
        if (cline.startsWith('```')) {
          nextLine++
          break
        }
        nextLine++
      }
      continue
    }

    if (nline.startsWith(':::')) {
      // Check if it's an opening or closing
      const innerParsed = parseContainerLine(nline)
      if (innerParsed) {
        nestLevel++
      } else if (nline.match(/^:{3,}\s*$/)) {
        nestLevel--
        if (nestLevel === 0) break
      }
    }
    nextLine++
  }

  // Emit tokens
  const openToken = state.push('edm_container_open', 'div', 1)
  openToken.info = parsed.blockType
  openToken.meta = { rawAttrs: serializeAttrs(parsed.attributes), attributes: parsed.attributes }
  openToken.block = true
  openToken.map = [startLine, nextLine]

  // Parse inner content
  const oldParent = state.parentType
  const oldLineMax = state.lineMax
  state.parentType = 'blockquote' as typeof state.parentType
  state.lineMax = nextLine
  state.md.block.tokenize(state, startLine + 1, nextLine)
  state.parentType = oldParent
  state.lineMax = oldLineMax

  const closeToken = state.push('edm_container_close', 'div', -1)
  closeToken.info = parsed.blockType
  closeToken.block = true

  state.line = nextLine + 1

  return true
}

function serializeAttrs(attrs: Record<string, string | boolean | undefined>): string {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => (v === true ? k : `${k}="${v}"`))
    .join(' ')
}
