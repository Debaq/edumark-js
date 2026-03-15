type BlockType = 'hero' | 'objective' | 'definition' | 'key-concept' | 'note' | 'warning' | 'example' | 'exercise' | 'application' | 'comparison' | 'diagram' | 'image' | 'question' | 'mnemonic' | 'history' | 'summary' | 'reference' | 'aside' | 'teacher-only' | 'student-only' | 'solution' | 'math';
interface BlockAttributes {
    id?: string;
    title?: string;
    type?: string;
    multiple?: boolean;
    characters?: string;
    year?: string;
    [key: string]: string | boolean | undefined;
}
interface EdumarkBlock {
    blockType: BlockType;
    attributes: BlockAttributes;
    content: string;
    children: EdumarkBlock[];
    /** For definition blocks: parsed term/definition pairs */
    definitions?: Array<{
        term: string;
        definition: string;
    }>;
    /** For image blocks: parsed key-value fields */
    fields?: Record<string, string>;
    /** For question blocks: parsed options */
    options?: QuestionOption[];
    /** For question blocks: model answers (open/case) */
    answers?: string[];
    /** For diagram blocks: text description */
    description?: string;
    /** For diagram blocks: code block info */
    diagramCode?: {
        language: string;
        code: string;
    };
    /** For hero blocks: topic list */
    topics?: string[];
}
interface QuestionOption {
    correct: boolean;
    text: string;
    feedback?: string;
}
interface EdumarkRef {
    id: string;
    file?: string;
    text?: string;
}
interface Frontmatter {
    [key: string]: unknown;
}
interface EdumarkDocument {
    frontmatter: Frontmatter;
    blocks: EdumarkBlock[];
    /** All ref targets: id → block/heading info */
    refs: Map<string, RefTarget>;
    /** Raw markdown-it tokens (for advanced use) */
    tokens: unknown[];
}
interface RefTarget {
    type: 'block' | 'heading';
    blockType?: BlockType;
    title?: string;
    number?: number;
}
type Mode = 'student' | 'teacher' | 'all';
interface ParseOptions {
    mode?: Mode;
    resolveInclude?: (path: string) => string;
}
interface RenderOptions {
    mode?: Mode;
}
interface DecodeOptions extends ParseOptions, RenderOptions {
}
interface DiagramOptions$1 {
    krokiUrl?: string;
}
interface DecodeAsyncOptions extends DecodeOptions, DiagramOptions$1 {
}
interface RenderAsyncOptions extends RenderOptions, DiagramOptions$1 {
}

declare class EdumarkError extends Error {
    constructor(message: string);
}
declare class ParseError extends EdumarkError {
    line?: number | undefined;
    constructor(message: string, line?: number | undefined);
}
declare class IncludeError extends EdumarkError {
    path?: string | undefined;
    constructor(message: string, path?: string | undefined);
}
declare class RefError extends EdumarkError {
    refId?: string | undefined;
    constructor(message: string, refId?: string | undefined);
}

/**
 * KaTeX integration for edumark-js.
 *
 * If katex is injected via setKatex(), math is rendered to HTML.
 * Otherwise, falls back to the current output (unicode text with data-math attribute).
 */
interface KatexLike {
    renderToString(tex: string, options?: {
        displayMode?: boolean;
        throwOnError?: boolean;
        output?: string;
    }): string;
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
declare function setKatex(mod: KatexLike | null): void;

/**
 * Diagram rendering via Kroki.io for edumark-js.
 *
 * Finds <pre class="mermaid"> and <pre class="edm-diagram-code" data-language="X"> blocks
 * in HTML output and replaces them with SVGs from Kroki.
 *
 * Uses only native fetch — no heavy dependencies.
 */
interface DiagramOptions {
    krokiUrl?: string;
}
/**
 * Post-process HTML to render diagrams via Kroki.io.
 *
 * - Finds mermaid and edm-diagram-code blocks
 * - Sends code to Kroki API in parallel
 * - Replaces <pre> with rendered SVG wrapped in <div class="edm-diagram-render">
 * - On failure, leaves the original <pre> block (graceful degradation)
 */
declare function enhanceDiagrams(html: string, options?: DiagramOptions): Promise<string>;

/**
 * Parse an .edm source string into an EdumarkDocument AST.
 */
declare function parse(source: string, options?: ParseOptions): EdumarkDocument;
/**
 * Render an EdumarkDocument AST to HTML.
 */
declare function render(doc: EdumarkDocument, options?: RenderOptions): string;
/**
 * Decode an .edm source string directly to HTML (shortcut for parse + render).
 */
declare function decode(source: string, options?: DecodeOptions): string;
/**
 * Render an EdumarkDocument AST to HTML, then enhance diagrams via Kroki.
 */
declare function renderAsync(doc: EdumarkDocument, options?: RenderAsyncOptions): Promise<string>;
/**
 * Decode an .edm source string to fully rendered HTML.
 * Math is rendered by KaTeX (if installed) in the sync pipeline.
 * Diagrams are rendered via Kroki.io asynchronously.
 */
declare function decodeAsync(source: string, options?: DecodeAsyncOptions): Promise<string>;

export { type BlockAttributes, type BlockType, type DecodeAsyncOptions, type DecodeOptions, type DiagramOptions$1 as DiagramOptions, type EdumarkBlock, type EdumarkDocument, EdumarkError, type EdumarkRef, type Frontmatter, IncludeError, type Mode, ParseError, type ParseOptions, type QuestionOption, RefError, type RefTarget, type RenderAsyncOptions, type RenderOptions, decode, decodeAsync, enhanceDiagrams, parse, render, renderAsync, setKatex };
