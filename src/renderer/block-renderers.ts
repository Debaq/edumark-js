import MarkdownIt from 'markdown-it'
import type { EdumarkBlock } from '../types.js'
import { mathPlugin, renderMathBlock } from '../parser/math.js'

const inlineMd = new MarkdownIt({ html: false })
inlineMd.use(mathPlugin)
inlineMd.enable('table')

function renderInline(text: string): string {
  return inlineMd.renderInline(text)
}

function renderMarkdown(text: string): string {
  return inlineMd.render(text)
}

function id(block: EdumarkBlock): string {
  return block.attributes.id ? ` id="${esc(block.attributes.id)}"` : ''
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const ICONS: Record<string, string> = {
  'objective': '🎯',
  'definition': '📖',
  'key-concept': '💡',
  'note': '📝',
  'warning': '⚠️',
  'example': '✏️',
  'exercise': '🧩',
  'application': '🔬',
  'comparison': '⚖️',
  'diagram': '📊',
  'embed': '🌐',
  'image': '🖼️',
  'question': '❓',
  'mnemonic': '🧠',
  'history': '📜',
  'summary': '📋',
  'reference': '📚',
  'aside': '💬',
  'teacher-only': '👨‍🏫',
  'student-only': '🎓',
  'solution': '✅',
  'math': '📐',
  'include': '📄',
}

const LABELS: Record<string, string> = {
  'objective': 'Objetivos de aprendizaje',
  'definition': 'Definición',
  'key-concept': 'Concepto clave',
  'note': 'Nota',
  'warning': 'Advertencia',
  'example': 'Ejemplo',
  'exercise': 'Ejercicio',
  'application': 'Aplicación',
  'comparison': 'Comparación',
  'diagram': 'Diagrama',
  'embed': 'Recurso externo',
  'image': 'Figura',
  'question': 'Pregunta',
  'mnemonic': 'Mnemotécnico',
  'history': 'Contexto histórico',
  'summary': 'Resumen del capítulo',
  'reference': 'Referencias bibliográficas',
  'aside': 'Dato adicional',
  'teacher-only': 'Solo para el docente',
  'student-only': 'Actividad del estudiante',
  'solution': 'Solución',
  'math': 'Ecuación',
  'include': 'Incluir',
}

function blockCard(block: EdumarkBlock, inner: string, extraClass?: string): string {
  const type = block.blockType
  const icon = ICONS[type] || ''
  const label = LABELS[type] || type
  const title = block.attributes.title as string | undefined
  const cls = extraClass ? ` ${extraClass}` : ''

  return `<article class="edm-card edm-${type}${cls}"${id(block)} role="region" aria-label="${esc(label)}">
<header class="edm-card-header">
  <span class="edm-card-icon" aria-hidden="true">${icon}</span>
  <span class="edm-card-label">${esc(label)}</span>
  ${title ? `<span class="edm-card-title">${esc(title)}</span>` : ''}
</header>
<div class="edm-card-body">
${inner}
</div>
</article>\n`
}

export function renderBlock(block: EdumarkBlock, childrenHtml: string): string {
  const renderer = RENDERERS[block.blockType]
  if (renderer) return renderer(block, childrenHtml)
  return renderGeneric(block, childrenHtml)
}

function renderGeneric(block: EdumarkBlock, childrenHtml: string): string {
  return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
}

const RENDERERS: Record<string, (block: EdumarkBlock, childrenHtml: string) => string> = {
  hero(block) {
    const f = block.fields || {}
    const topics = block.topics || []
    const parts: string[] = []
    parts.push(`<header class="edm-hero"${id(block)}>`)

    // Badges
    const badges: string[] = []
    if (f.subject) badges.push(`<span class="edm-hero-badge edm-hero-subject">${esc(f.subject)}</span>`)
    if (f.level) badges.push(`<span class="edm-hero-badge edm-hero-level">${esc(f.level)}</span>`)
    if (f.unit) badges.push(`<span class="edm-hero-badge edm-hero-unit">${esc(f.unit)}</span>`)
    if (badges.length) parts.push(`<div class="edm-hero-badges">${badges.join('')}</div>`)

    // Title
    if (f.title) parts.push(`<h1 class="edm-hero-title">${esc(f.title)}</h1>`)

    // Author + date + version
    const meta: string[] = []
    if (f.author) meta.push(`<span class="edm-hero-author">${esc(f.author)}</span>`)
    if (f.date) meta.push(`<span class="edm-hero-date">${esc(f.date)}</span>`)
    if (f.version) meta.push(`<span class="edm-hero-version">v${esc(f.version)}</span>`)
    if (meta.length) parts.push(`<div class="edm-hero-meta">${meta.join('<span class="edm-hero-sep">·</span>')}</div>`)

    // Topics
    if (topics.length) {
      parts.push('<nav class="edm-hero-topics">')
      parts.push('<span class="edm-hero-topics-label">Temas</span>')
      parts.push('<ul>')
      for (const t of topics) {
        parts.push(`<li>${esc(t)}</li>`)
      }
      parts.push('</ul>')
      parts.push('</nav>')
    }

    parts.push('</header>\n')
    return parts.join('\n')
  },

  objective(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  definition(block, childrenHtml) {
    const defs = block.definitions || []
    if (defs.length === 0) return renderGeneric(block, '')

    const items = defs.map(d =>
      `<div class="edm-def-entry">
  <dt>${renderInline(d.term)}</dt>
  <dd>${renderInline(d.definition)}</dd>
</div>`
    ).join('\n')

    return blockCard(block, `<dl class="edm-def-list">\n${items}\n</dl>${childrenHtml}`)
  },

  'key-concept'(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  warning(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  note(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  example(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  exercise(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  solution(block) {
    return `<details class="edm-card edm-solution">
<summary class="edm-card-header">
  <span class="edm-card-icon" aria-hidden="true">${ICONS.solution}</span>
  <span class="edm-card-label">${LABELS.solution}</span>
  <span class="edm-solution-chevron" aria-hidden="true"></span>
</summary>
<div class="edm-card-body">
${renderMarkdown(block.content)}
</div>
</details>\n`
  },

  application(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  comparison(block, childrenHtml) {
    return blockCard(block, `<div class="edm-table-wrap">${renderMarkdown(block.content)}</div>${childrenHtml}`)
  },

  image(block) {
    const f = block.fields || {}
    const src = f.file || ''
    const alt = f.alt || f.title || ''
    const title = f.title || ''
    const desc = f.description || ''
    const source = f.source || ''

    let captionInner = ''
    if (title) captionInner += `<strong>${esc(title)}</strong>`
    if (desc) captionInner += (captionInner ? '<br>' : '') + `<span class="edm-fig-desc">${esc(desc)}</span>`
    if (source) captionInner += (captionInner ? '<br>' : '') + `<cite class="edm-fig-source">${esc(source)}</cite>`

    const inner = `<figure class="edm-fig">
  <div class="edm-fig-frame"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy"></div>
  ${captionInner ? `<figcaption>${captionInner}</figcaption>` : ''}
</figure>`

    return blockCard(block, inner)
  },

  diagram(block) {
    const parts: string[] = []

    // Read zoom from block attributes: :::diagram zoom="0.8"
    const zoom = block.attributes.zoom as string | undefined
    const zoomAttr = zoom ? ` data-edm-zoom="${esc(zoom)}"` : ''

    if (block.diagramCode) {
      if (block.diagramCode.language === 'mermaid') {
        parts.push(`<div class="edm-diagram-render"${zoomAttr}><pre class="mermaid">${esc(block.diagramCode.code)}</pre></div>`)
      } else if (block.diagramCode.language === 'svg') {
        parts.push(`<div class="edm-diagram-render edm-diagram-svg"${zoomAttr}>${block.diagramCode.code}</div>`)
      } else {
        parts.push(`<div class="edm-diagram-render"${zoomAttr}><pre class="edm-diagram-code" data-language="${esc(block.diagramCode.language)}">${esc(block.diagramCode.code)}</pre></div>`)
      }
    }

    const cleanDesc = block.description?.trim() || ''

    if (cleanDesc) {
      const showClass = block.diagramCode ? ' edm-diagram-fallback' : ''
      parts.push(`<div class="edm-diagram-description${showClass}">${renderMarkdown(cleanDesc)}</div>`)
    }

    return blockCard(block, parts.join('\n'))
  },

  embed(block) {
    const f = block.fields || {}
    const src = f.src || ''
    const title = f.title || ''
    const desc = f.description || ''
    const author = f.author || ''
    const type = f.type || 'generic'

    if (!src) return blockCard(block, '<p class="edm-embed-error">No src provided</p>')

    let captionInner = ''
    if (title) captionInner += `<strong>${esc(title)}</strong>`
    if (desc) captionInner += (captionInner ? '<br>' : '') + `<span class="edm-embed-desc">${esc(desc)}</span>`
    if (author) captionInner += (captionInner ? '<br>' : '') + `<cite class="edm-embed-author">${esc(author)}</cite>`

    // Print fallback: QR placeholder + description (PDF exporters replace .edm-embed-qr with actual QR)
    const printDesc = desc || title || src
    const printFallback = `<div class="edm-embed-print" data-embed-src="${esc(src)}">
  <div class="edm-embed-qr"></div>
  <div class="edm-embed-print-info">
    ${title ? `<strong>${esc(title)}</strong>` : ''}
    ${desc ? `<p>${esc(desc)}</p>` : ''}
    <a href="${esc(src)}" class="edm-embed-print-url">${esc(src)}</a>
    ${author ? `<cite class="edm-embed-author">${esc(author)}</cite>` : ''}
  </div>
</div>`

    const inner = `<figure class="edm-embed-fig">
  <div class="edm-embed-frame" data-embed-type="${esc(type)}">
    <iframe src="${esc(src)}" title="${esc(title || 'Embedded content')}" frameborder="0" allowfullscreen loading="lazy"></iframe>
  </div>
  ${printFallback}
  ${captionInner ? `<figcaption>${captionInner}</figcaption>` : ''}
</figure>`

    return blockCard(block, inner)
  },

  question(block) {
    const type = (block.attributes.type as string) || 'open'
    const parts: string[] = []

    const typeLabels: Record<string, string> = {
      choice: 'Selección múltiple',
      'true-false': 'Verdadero o falso',
      open: 'Desarrollo',
      case: 'Caso aplicado',
    }

    parts.push(`<div class="edm-q-type-badge">${typeLabels[type] || type}</div>`)

    if (block.content) {
      parts.push(`<div class="edm-q-stem">${renderMarkdown(block.content)}</div>`)
    }

    if (type === 'choice') {
      const options = block.options || []
      const multipleCorrect = options.filter(o => o.correct).length > 1
      const inputType = multipleCorrect ? 'checkbox' : 'radio'
      const name = block.attributes.id || 'q'

      parts.push('<div class="edm-q-options">')
      for (let idx = 0; idx < options.length; idx++) {
        const opt = options[idx]
        const letter = String.fromCharCode(97 + idx) // a, b, c, d...
        parts.push(`<label class="edm-q-option" data-correct="${opt.correct}">
  <input type="${inputType}" name="${esc(name)}">
  <span class="edm-q-letter">${letter}</span>
  <span class="edm-q-text">${renderInline(opt.text)}</span>
</label>`)
        if (opt.feedback) {
          parts.push(`<div class="edm-q-feedback" hidden>${renderInline(opt.feedback)}</div>`)
        }
      }
      parts.push('</div>')
    } else if (type === 'true-false') {
      const answer = (block.answers && block.answers[0]) || ''
      const name = block.attributes.id || 'q'
      const opts = block.options || []
      parts.push('<div class="edm-q-options">')
      parts.push(`<label class="edm-q-option" data-correct="${answer === 'true'}">
  <input type="radio" name="${esc(name)}">
  <span class="edm-q-letter">V</span>
  <span class="edm-q-text">Verdadero</span>
</label>`)
      parts.push(`<label class="edm-q-option" data-correct="${answer === 'false'}">
  <input type="radio" name="${esc(name)}">
  <span class="edm-q-letter">F</span>
  <span class="edm-q-text">Falso</span>
</label>`)
      parts.push('</div>')
      if (opts[0]?.feedback) {
        parts.push(`<div class="edm-q-feedback" hidden>${renderInline(opts[0].feedback)}</div>`)
      }
    } else if (type === 'open' || type === 'case') {
      if (block.answers && block.answers.length > 0) {
        parts.push(`<details class="edm-q-answer">
<summary>Ver respuesta modelo</summary>
<div class="edm-q-answer-body">
${block.answers.map(a => renderMarkdown(a)).join('\n')}
</div>
</details>`)
      }
    }

    return blockCard(block, parts.join('\n'))
  },

  mnemonic(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  history(block) {
    let meta = ''
    if (block.attributes.characters || block.attributes.year) {
      const metaParts: string[] = []
      if (block.attributes.characters) metaParts.push(`<span class="edm-hist-who"><span aria-hidden="true">👤</span> ${esc(block.attributes.characters as string)}</span>`)
      if (block.attributes.year) metaParts.push(`<span class="edm-hist-when"><span aria-hidden="true">📅</span> ${esc(block.attributes.year as string)}</span>`)
      meta = `<div class="edm-hist-meta">${metaParts.join('')}</div>\n`
    }
    return blockCard(block, `${meta}${renderMarkdown(block.content)}`)
  },

  summary(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  reference(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  aside(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  'teacher-only'(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  'student-only'(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`)
  },

  math(block) {
    return blockCard(block, renderMathBlock(block.content))
  },

  include(block) {
    const file = (block.attributes.file as string) || ''
    const title = (block.attributes.title as string) || ''
    // Generar un anchor id basado en el nombre del archivo
    const anchorId = file.replace(/\.edm$/, '').replace(/[^a-zA-Z0-9_-]/g, '-')
    // Label: title del atributo, o contenido del bloque, o nombre de archivo
    const label = title
      || block.content.trim()
      || file.replace(/\.edm$/, '').replace(/[_-]/g, ' ')

    return `<div class="edm-include-link"${id(block)}>
<a href="#${esc(anchorId)}" data-include-file="${esc(file)}" class="edm-include-ref">
  <span class="edm-include-label">${renderInline(label)}</span>
  <span class="edm-include-dots"></span>
  <span class="edm-include-page" data-target="${esc(anchorId)}"></span>
</a>
</div>\n`
  },
}
