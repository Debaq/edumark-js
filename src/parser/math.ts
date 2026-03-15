import type MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import { renderLatexToHtml } from '../renderer/enhance-math.js'

/**
 * markdown-it plugin: human-friendly math.
 *
 * - Inline: m{v₀ + a·t}
 * - Block:  :::math (handled by container plugin, rendered here)
 *
 * The author writes natural Unicode (v₀, Δx, ², ½, ·, →).
 * The decoder converts it to KaTeX-compatible LaTeX for rendering.
 * If katex is installed, renders directly to HTML. Otherwise, outputs
 * unicode text with data-math attribute for post-processing.
 */
export function mathPlugin(md: MarkdownIt): void {
  // Core rule: replace m{...} in inline text tokens
  md.core.ruler.push('edm_math_inline', (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== 'inline' || !blockToken.children) continue
      blockToken.children = processMathInline(blockToken.children, state.Token)
    }
  })

  md.renderer.rules['edm_math_inline'] = (tokens, idx) => {
    const raw = tokens[idx].content
    const latex = unicodeToLatex(raw)
    return renderLatexToHtml(latex, false, raw)
  }
}

/**
 * Render function for :::math blocks (called from block-renderers).
 * Takes the raw Unicode content, converts to LaTeX, outputs display math.
 */
export function renderMathBlock(content: string): string {
  const lines = content.trim().split('\n')
  const parts = lines.map(line => {
    const trimmed = line.trim()
    if (!trimmed) return ''
    const latex = unicodeToLatex(trimmed)
    return renderLatexToHtml(latex, true, trimmed)
  })
  return parts.join('\n')
}

// ---- Inline processing ----

const MATH_INLINE_RE = /m\{([^}]+)\}/g

function processMathInline(children: Token[], TokenClass: typeof Token): Token[] {
  const result: Token[] = []

  for (const token of children) {
    if (token.type !== 'text' || !MATH_INLINE_RE.test(token.content)) {
      result.push(token)
      continue
    }

    MATH_INLINE_RE.lastIndex = 0
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = MATH_INLINE_RE.exec(token.content)) !== null) {
      if (match.index > lastIndex) {
        const t = new TokenClass('text', '', 0)
        t.content = token.content.slice(lastIndex, match.index)
        result.push(t)
      }

      const mathToken = new TokenClass('edm_math_inline', '', 0)
      mathToken.content = match[1].trim()
      result.push(mathToken)

      lastIndex = MATH_INLINE_RE.lastIndex
    }

    if (lastIndex < token.content.length) {
      const t = new TokenClass('text', '', 0)
      t.content = token.content.slice(lastIndex)
      result.push(t)
    }
  }

  return result
}

// ---- Unicode → LaTeX conversion ----

/**
 * Convert natural Unicode math notation to KaTeX-compatible LaTeX.
 * The goal: the author writes human-readable, the decoder makes it beautiful.
 */
export function unicodeToLatex(input: string): string {
  let s = input

  // Fractions: a/b → \frac{a}{b} (simple cases)
  // Handle patterns like Δx/Δt, (14-2)/(30-0), v²/2a
  s = s.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, '\\frac{$1}{$2}')
  // Simple fractions: word/word (but not in middle of longer expressions)
  s = s.replace(/(?<![/\w])([A-Za-zΔ][A-Za-z₀₁₂₃₄₅₆₇₈₉Δ]*)\/([A-Za-zΔ][A-Za-z₀₁₂₃₄₅₆₇₈₉Δ]*)/g, '\\frac{$1}{$2}')

  // Square root: √(...) or √number
  s = s.replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
  s = s.replace(/√(\d+)/g, '\\sqrt{$1}')

  // Greek letters
  s = s.replace(/Δ/g, '\\Delta ')
  s = s.replace(/α/g, '\\alpha ')
  s = s.replace(/β/g, '\\beta ')
  s = s.replace(/γ/g, '\\gamma ')
  s = s.replace(/θ/g, '\\theta ')
  s = s.replace(/λ/g, '\\lambda ')
  s = s.replace(/μ/g, '\\mu ')
  s = s.replace(/π/g, '\\pi ')
  s = s.replace(/σ/g, '\\sigma ')
  s = s.replace(/ω/g, '\\omega ')
  s = s.replace(/φ/g, '\\varphi ')
  s = s.replace(/ε/g, '\\varepsilon ')
  s = s.replace(/τ/g, '\\tau ')
  s = s.replace(/ρ/g, '\\rho ')

  // Subscripts: v₀, x₁, t₂, etc (Unicode subscript digits)
  s = s.replace(/₀/g, '_0')
  s = s.replace(/₁/g, '_1')
  s = s.replace(/₂/g, '_2')
  s = s.replace(/₃/g, '_3')
  s = s.replace(/₄/g, '_4')
  s = s.replace(/₅/g, '_5')
  s = s.replace(/₆/g, '_6')
  s = s.replace(/₇/g, '_7')
  s = s.replace(/₈/g, '_8')
  s = s.replace(/₉/g, '_9')
  s = s.replace(/ₙ/g, '_n')
  s = s.replace(/ₘ/g, '_m')
  s = s.replace(/ᵢ/g, '_i')
  s = s.replace(/ⱼ/g, '_j')
  s = s.replace(/ₓ/g, '_x')
  // Multi-char subscripts: x_{fi}, v_{max} — underscore followed by letters
  s = s.replace(/_([a-zA-Z]{2,})/g, '_{$1}')

  // Superscripts: ², ³, ⁿ
  s = s.replace(/²/g, '^2')
  s = s.replace(/³/g, '^3')
  s = s.replace(/⁴/g, '^4')
  s = s.replace(/ⁿ/g, '^n')

  // Operators
  s = s.replace(/·/g, '\\cdot ')
  s = s.replace(/×/g, '\\times ')
  s = s.replace(/÷/g, '\\div ')
  s = s.replace(/±/g, '\\pm ')
  s = s.replace(/∓/g, '\\mp ')
  s = s.replace(/≈/g, '\\approx ')
  s = s.replace(/≠/g, '\\neq ')
  s = s.replace(/≤/g, '\\leq ')
  s = s.replace(/≥/g, '\\geq ')
  s = s.replace(/∝/g, '\\propto ')
  s = s.replace(/∞/g, '\\infty ')
  s = s.replace(/→/g, '\\rightarrow ')
  s = s.replace(/←/g, '\\leftarrow ')
  s = s.replace(/⇒/g, '\\Rightarrow ')
  s = s.replace(/∈/g, '\\in ')
  s = s.replace(/∑/g, '\\sum ')
  s = s.replace(/∫/g, '\\int ')
  s = s.replace(/∂/g, '\\partial ')

  // Vulgar fractions
  s = s.replace(/½/g, '\\tfrac{1}{2}')
  s = s.replace(/⅓/g, '\\tfrac{1}{3}')
  s = s.replace(/¼/g, '\\tfrac{1}{4}')
  s = s.replace(/⅔/g, '\\tfrac{2}{3}')
  s = s.replace(/¾/g, '\\tfrac{3}{4}')

  // Special notation
  s = s.replace(/v̄/g, '\\bar{v}')
  s = s.replace(/x̄/g, '\\bar{x}')

  // Units: detect "m/s", "km/h", "m/s²" patterns and wrap in \text{}
  s = s.replace(/\b(m\/s|km\/h|m\/s\^2|rad\/s|N\/m|J\/mol|kg·m\/s)\b/g, '\\text{$1}')
  // Standalone units after numbers
  s = s.replace(/(\d)\s+(m|s|kg|N|J|W|Hz|Pa|V|A|Ω|km|cm|mm|min|h)\b/g, '$1\\;\\text{$2}')

  // lím → \lim
  s = s.replace(/lím/g, '\\lim')

  // Clean up multiple spaces
  s = s.replace(/  +/g, ' ')

  return s.trim()
}

