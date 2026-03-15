/**
 * KaTeX integration for edumark-js.
 *
 * If katex is injected via setKatex(), math is rendered to HTML.
 * Otherwise, falls back to the current output (unicode text with data-math attribute).
 */

interface KatexLike {
  renderToString(tex: string, options?: {
    displayMode?: boolean
    throwOnError?: boolean
    output?: string
  }): string
}

let katexModule: KatexLike | null = null

/**
 * Render a LaTeX string to HTML using KaTeX if available.
 * Returns the rendered HTML wrapped in a semantic container,
 * or a fallback with data-math for post-processing.
 */
export function renderLatexToHtml(
  latex: string,
  displayMode: boolean,
  unicodeFallback: string
): string {
  const tag = displayMode ? 'div' : 'span'
  const cls = displayMode ? 'edm-math-display' : 'edm-math-inline'
  const escaped = escAttr(latex)

  if (katexModule) {
    try {
      const html = katexModule.renderToString(latex, {
        displayMode,
        throwOnError: false,
        output: 'html',
      })
      return `<${tag} class="${cls}" data-math="${escaped}">${html}</${tag}>`
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback: unicode text with data-math attribute
  return `<${tag} class="${cls}" data-math="${escaped}">${esc(unicodeFallback)}</${tag}>`
}

/**
 * Inject the katex module so that decode()/render() can render math directly.
 * Call this before decode() if you want KaTeX rendering in the sync pipeline.
 *
 * Example:
 *   import katex from 'katex'
 *   import { setKatex } from 'edumark-js'
 *   setKatex(katex)
 */
export function setKatex(mod: KatexLike | null): void {
  katexModule = mod
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
