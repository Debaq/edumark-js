type BlockType = 'objective' | 'definition' | 'key-concept' | 'note' | 'warning' | 'example' | 'exercise' | 'application' | 'comparison' | 'diagram' | 'image' | 'question' | 'mnemonic' | 'history' | 'summary' | 'reference' | 'aside' | 'teacher-only' | 'student-only' | 'solution' | 'math';
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

export { type BlockAttributes, type BlockType, type DecodeOptions, type EdumarkBlock, type EdumarkDocument, EdumarkError, type EdumarkRef, type Frontmatter, IncludeError, type Mode, ParseError, type ParseOptions, type QuestionOption, RefError, type RefTarget, type RenderOptions, decode, parse, render };
