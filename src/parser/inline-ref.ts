import type MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'

const REF_RE = /ref\{([^}]+)\}/g

/**
 * markdown-it plugin: core rule that post-processes inline tokens
 * to replace ref{id} and ref{id text} with edm_ref tokens.
 */
export function inlineRefPlugin(md: MarkdownIt): void {
  md.core.ruler.push('edm_ref', (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== 'inline' || !blockToken.children) continue
      blockToken.children = processChildren(blockToken.children, state.Token)
    }
  })

  md.renderer.rules['edm_ref'] = (tokens, idx) => {
    const token = tokens[idx]
    const id = token.meta.id as string
    const file = token.meta.file as string | undefined
    const text = token.meta.text as string | undefined
    const href = file ? `${file}#${id}` : `#${id}`
    const label = text || id
    return `<a href="${href}" class="edm-ref">${md.utils.escapeHtml(label)}</a>`
  }
}

function processChildren(children: Token[], TokenClass: typeof Token): Token[] {
  const result: Token[] = []

  for (const token of children) {
    if (token.type !== 'text' || !REF_RE.test(token.content)) {
      result.push(token)
      continue
    }

    // Split text around ref{} matches
    REF_RE.lastIndex = 0
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = REF_RE.exec(token.content)) !== null) {
      // Text before the ref
      if (match.index > lastIndex) {
        const textToken = new TokenClass('text', '', 0)
        textToken.content = token.content.slice(lastIndex, match.index)
        result.push(textToken)
      }

      // Parse the ref inner content
      const inner = match[1].trim()
      const { id, file, text } = parseRefInner(inner)

      const refToken = new TokenClass('edm_ref', '', 0)
      refToken.meta = { id, file, text }
      result.push(refToken)

      lastIndex = REF_RE.lastIndex
    }

    // Remaining text after last ref
    if (lastIndex < token.content.length) {
      const textToken = new TokenClass('text', '', 0)
      textToken.content = token.content.slice(lastIndex)
      result.push(textToken)
    }
  }

  return result
}

function parseRefInner(inner: string): { id: string; file?: string; text?: string } {
  let id: string
  let file: string | undefined
  let text: string | undefined

  const spaceIdx = inner.indexOf(' ')
  if (spaceIdx === -1) {
    const ref = inner
    const hashIdx = ref.indexOf('#')
    if (hashIdx !== -1) {
      file = ref.slice(0, hashIdx)
      id = ref.slice(hashIdx + 1)
    } else {
      id = ref
    }
  } else {
    const ref = inner.slice(0, spaceIdx)
    text = inner.slice(spaceIdx + 1).trim()
    const hashIdx = ref.indexOf('#')
    if (hashIdx !== -1) {
      file = ref.slice(0, hashIdx)
      id = ref.slice(hashIdx + 1)
    } else {
      id = ref
    }
  }

  return { id, file, text }
}
