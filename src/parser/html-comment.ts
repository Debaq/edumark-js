import type MarkdownIt from 'markdown-it'
import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'

/**
 * markdown-it plugin that handles HTML comments even when `html: false`.
 *
 * With `html: false`, markdown-it escapes all HTML including comments,
 * making `<!-- ... -->` visible as text. This plugin detects comment blocks
 * and renders them as real HTML comments (invisible in the browser).
 *
 * Supports single-line and multi-line comments.
 */
export function htmlCommentPlugin(md: MarkdownIt): void {
  md.block.ruler.before('html_block', 'html_comment', htmlCommentRule)
  md.renderer.rules['html_comment'] = (tokens, idx) => tokens[idx].content
}

function htmlCommentRule(
  state: StateBlock,
  startLine: number,
  endLine: number,
  silent: boolean,
): boolean {
  const startPos = state.bMarks[startLine] + state.tShift[startLine]
  const src = state.src

  // Must start with <!--
  if (src.charCodeAt(startPos) !== 0x3C /* < */) return false
  if (src.slice(startPos, startPos + 4) !== '<!--') return false

  // Find closing -->
  let nextLine = startLine
  let found = false

  while (nextLine <= endLine) {
    const lineStart = nextLine === startLine ? startPos : state.bMarks[nextLine]
    const lineEnd = state.eMarks[nextLine]
    const lineText = src.slice(lineStart, lineEnd)

    const closeIdx = lineText.indexOf('-->')
    if (closeIdx !== -1) {
      found = true
      break
    }
    nextLine++
  }

  if (!found) return false
  if (silent) return true

  // Build the full comment text
  const lines: string[] = []
  for (let i = startLine; i <= nextLine; i++) {
    const ls = i === startLine ? startPos : state.bMarks[i]
    lines.push(src.slice(ls, state.eMarks[i]))
  }

  const token = state.push('html_comment', '', 0)
  token.content = lines.join('\n') + '\n'
  token.map = [startLine, nextLine + 1]

  state.line = nextLine + 1
  return true
}
