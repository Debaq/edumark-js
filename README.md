# edumark-js

Decodificador JavaScript/TypeScript para el formato [Edumark](https://github.com/Debaq/edumark) (`.edm`). Parsea documentos educativos y genera HTML semántico con fórmulas, bloques pedagógicos interactivos y temas configurables.

```
.edm → parse → AST → render → HTML
```

## Instalación

```bash
npm install github:Debaq/edumark-js
```

O directamente en el browser (sin npm):

```html
<script src="https://cdn.jsdelivr.net/gh/Debaq/edumark-js/dist/index.global.js"></script>
```

## Uso rápido

### Node.js (ESM)

```js
import { decode } from 'edumark-js'
import { readFileSync } from 'fs'

const edm = readFileSync('capitulo.edm', 'utf8')
const html = decode(edm, { mode: 'student' })
```

### Node.js (CommonJS)

```js
const { decode } = require('edumark-js')
const html = decode(source)
```

### Browser

```html
<script src="https://cdn.jsdelivr.net/gh/Debaq/edumark-js/dist/index.global.js"></script>
<script>
  const html = Edumark.decode(texto, { mode: 'student' })
  document.getElementById('content').innerHTML = html
</script>
```

## API

### `decode(source, options?): string`

Atajo: parsea `.edm` y genera HTML en un solo paso.

### `parse(source, options?): EdumarkDocument`

Parsea `.edm` y retorna un AST inspeccionable.

### `render(doc, options?): string`

Renderiza un AST a HTML.

### Opciones

```ts
{
  mode: 'student' | 'teacher' | 'all',  // filtrar bloques condicionales
  resolveInclude: (path: string) => string  // resolver ::include
}
```

## Qué genera

El HTML sale con estructura semántica rica — cards con headers tipados, tablas, quizzes interactivos, fórmulas renderizables:

| Bloque | HTML generado |
|---|---|
| `:::definition` | `<article class="edm-card edm-definition">` con `<dl>` |
| `:::exercise` + `:::solution` | Card con `<details>` colapsable |
| `:::question type="choice"` | Fieldset con opciones clickeables y feedback |
| `:::diagram` con mermaid | `<pre class="mermaid">` (compatible con mermaid.js) |
| `:::image` | `<figure>` con `<img>`, caption y source |
| `:::comparison` | Card con `<table>` responsive |
| `:::math` | Display math con `data-math` para KaTeX |
| `m{v₀ + a·t}` | Inline math con conversión Unicode→LaTeX |
| `:::teacher-only` | Incluido/excluido según `mode` |

## Fórmulas

Edumark no usa LaTeX. El autor escribe Unicode natural y el decoder lo convierte:

**Inline** — `m{...}`:

```
La velocidad se calcula como m{v̄ = Δx/Δt} y se mide en m/s.
```

**Display** — `:::math`:

```
:::math
v = v₀ + a·t
x = x₀ + v₀·t + ½·a·t²
v² = v₀² + 2·a·(x − x₀)
:::
```

El decoder convierte automáticamente:

| Escribís | Se convierte a |
|---|---|
| `v₀` | subíndice |
| `t²` | superíndice |
| `Δx/Δt` | fracción |
| `½` | ½ tipográfico |
| `·` | operador producto |
| `√(2·g·h)` | raíz cuadrada |
| `≈`, `≠`, `≤`, `∝` | símbolos matemáticos |
| `v̄` | v con barra |

El HTML sale con `data-math="LaTeX"` listo para KaTeX o MathJax.

## Viewer incluido

El paquete incluye un visor interactivo en `viewer/index.html`:

- Editor + vista previa en vivo
- Panel de configuración: 4 temas (oscuro, claro, sepia, AMOLED), tipografía, layout
- KaTeX para fórmulas
- Mermaid.js para diagramas
- Quizzes interactivos con feedback
- Filtro por modo (estudiante/docente/todos)

Para probarlo localmente:

```bash
npm install
npm run build
npx serve .
# Abrir http://localhost:3000/viewer/
```

## Formatos de distribución

| Formato | Archivo | Uso |
|---|---|---|
| ESM | `dist/index.js` | `import` en bundlers y Node.js |
| CJS | `dist/index.cjs` | `require` en Node.js |
| IIFE | `dist/index.global.js` | `<script>` en browser (global `Edumark`) |
| Types | `dist/index.d.ts` | Autocompletado en TypeScript |

## Desarrollo

```bash
npm install
npm test          # vitest
npm run build     # tsup → dist/
npm run dev       # watch mode
```

## Licencia

MIT
