/**
 * Diagram rendering via Kroki.io for edumark-js.
 *
 * Finds <pre class="mermaid"> and <pre class="edm-diagram-code" data-language="X"> blocks
 * in HTML output and replaces them with SVGs from Kroki.
 *
 * Uses only native fetch — no heavy dependencies.
 */

export interface DiagramOptions {
  krokiUrl?: string // default: 'https://kroki.io'
}

const DEFAULT_KROKI_URL = 'https://kroki.io'

// Match mermaid blocks: <pre class="mermaid">CODE</pre>
const MERMAID_RE = /<pre\s+class="mermaid">([\s\S]*?)<\/pre>/g

// Match edm-diagram-code blocks: <pre class="edm-diagram-code" data-language="LANG">CODE</pre>
const DIAGRAM_CODE_RE = /<pre\s+class="edm-diagram-code"\s+data-language="([^"]+)">([\s\S]*?)<\/pre>/g

interface DiagramMatch {
  fullMatch: string
  language: string
  code: string
}

function decodeHtmlEntities(html: string): string {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

/**
 * Post-process HTML to render diagrams via Kroki.io.
 *
 * - Finds mermaid and edm-diagram-code blocks
 * - Sends code to Kroki API in parallel
 * - Replaces <pre> with rendered SVG wrapped in <div class="edm-diagram-render">
 * - On failure, leaves the original <pre> block (graceful degradation)
 */
export async function enhanceDiagrams(
  html: string,
  options?: DiagramOptions
): Promise<string> {
  const krokiUrl = (options?.krokiUrl ?? DEFAULT_KROKI_URL).replace(/\/+$/, '')
  const matches: DiagramMatch[] = []

  // Collect mermaid blocks
  let m: RegExpExecArray | null
  MERMAID_RE.lastIndex = 0
  while ((m = MERMAID_RE.exec(html)) !== null) {
    matches.push({
      fullMatch: m[0],
      language: 'mermaid',
      code: decodeHtmlEntities(m[1]),
    })
  }

  // Collect edm-diagram-code blocks
  DIAGRAM_CODE_RE.lastIndex = 0
  while ((m = DIAGRAM_CODE_RE.exec(html)) !== null) {
    matches.push({
      fullMatch: m[0],
      language: m[1],
      code: decodeHtmlEntities(m[2]),
    })
  }

  if (matches.length === 0) return html

  // Render all diagrams in parallel
  const results = await Promise.allSettled(
    matches.map(async (match) => {
      const res = await fetch(`${krokiUrl}/${match.language}/svg`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: match.code,
      })
      if (!res.ok) {
        throw new Error(`Kroki returned ${res.status} for ${match.language}`)
      }
      return { match, svg: await res.text() }
    })
  )

  // Replace successful renders in the HTML
  let result = html
  for (const r of results) {
    if (r.status === 'fulfilled') {
      const { match, svg } = r.value
      result = result.replace(
        match.fullMatch,
        `<div class="edm-diagram-render">${svg}</div>`
      )
    }
    // On rejection: leave original <pre> block untouched
  }

  return result
}
