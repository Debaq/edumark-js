import MarkdownIt from 'markdown-it'
import type { EdumarkDocument, EdumarkBlock, RenderOptions } from '../types.js'
import { renderBlock } from './block-renderers.js'
import { buildNumbering } from './numbering.js'
import { inlineRefPlugin } from '../parser/inline-ref.js'
import { mathPlugin } from '../parser/math.js'
import { htmlCommentPlugin } from '../parser/html-comment.js'

export function render(doc: EdumarkDocument, _options: RenderOptions = {}): string {
  const labels = buildNumbering(doc.blocks)
  const md = new MarkdownIt({ html: false })
  md.use(inlineRefPlugin)
  md.use(mathPlugin)
  md.use(htmlCommentPlugin)
  md.enable('table')

  const parts: string[] = []

  // Render token stream, replacing containers with rich blocks
  const tokens = doc.tokens as any[]
  const blocksByKey = buildBlockIndex(doc.blocks)

  let i = 0
  while (i < tokens.length) {
    if (tokens[i].type === 'edm_container_open') {
      const blockType = tokens[i].info
      const attrs = tokens[i].meta?.attributes || {}
      const key = blockKey(blockType, attrs)
      const block = blocksByKey.get(key)

      if (block) {
        const childrenHtml = renderChildrenHtml(block)
        parts.push(renderBlock(block, childrenHtml))
      }

      let depth = 1
      i++
      while (i < tokens.length && depth > 0) {
        if (tokens[i].type === 'edm_container_open') depth++
        if (tokens[i].type === 'edm_container_close') depth--
        i++
      }
      continue
    }

    const rendered = renderSingleToken(tokens, i, md)
    parts.push(rendered)
    // If a group was rendered (open+inner+close), skip past the group end
    if (tokens[i]._groupEnd !== undefined) {
      i = tokens[i]._groupEnd + 1
    } else {
      i++
    }
  }

  return parts.join('')
}

function renderSingleToken(tokens: any[], idx: number, md: MarkdownIt): string {
  const token = tokens[idx]

  if (token.nesting === 0 && token.type !== 'inline') {
    return md.renderer.render([token], md.options, {})
  }

  if (token.nesting === 1) {
    const closeIdx = findMatchingClose(tokens, idx)
    const slice = tokens.slice(idx, closeIdx + 1)
    token._groupRendered = true
    token._groupEnd = closeIdx
    return md.renderer.render(slice, md.options, {})
  }

  return ''
}

function findMatchingClose(tokens: any[], openIdx: number): number {
  const tag = tokens[openIdx].tag
  let depth = 0
  for (let i = openIdx; i < tokens.length; i++) {
    if (tokens[i].tag === tag) {
      if (tokens[i].nesting === 1) depth++
      if (tokens[i].nesting === -1) depth--
      if (depth === 0) return i
    }
  }
  return tokens.length - 1
}

function renderChildrenHtml(block: EdumarkBlock): string {
  return block.children.map(child =>
    renderBlock(child, renderChildrenHtml(child))
  ).join('')
}

function blockKey(blockType: string, attrs: Record<string, any>): string {
  return `${blockType}:${attrs.id || ''}:${attrs.title || ''}:${attrs.type || ''}`
}

function buildBlockIndex(blocks: EdumarkBlock[]): Map<string, EdumarkBlock> {
  const map = new Map<string, EdumarkBlock>()
  function walk(list: EdumarkBlock[]) {
    for (const block of list) {
      const key = blockKey(block.blockType, block.attributes)
      map.set(key, block)
      walk(block.children)
    }
  }
  walk(blocks)
  return map
}
