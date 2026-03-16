// src/utils/errors.ts
var EdumarkError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "EdumarkError";
  }
};
var ParseError = class extends EdumarkError {
  constructor(message, line) {
    super(line !== void 0 ? `Line ${line}: ${message}` : message);
    this.line = line;
    this.name = "ParseError";
  }
};
var IncludeError = class extends EdumarkError {
  constructor(message, path) {
    super(path ? `Include "${path}": ${message}` : message);
    this.path = path;
    this.name = "IncludeError";
  }
};
var RefError = class extends EdumarkError {
  constructor(message, refId) {
    super(refId ? `Ref "${refId}": ${message}` : message);
    this.refId = refId;
    this.name = "RefError";
  }
};

// src/renderer/enhance-math.ts
var katexModule = null;
function renderLatexToHtml(latex, displayMode, unicodeFallback) {
  const tag = displayMode ? "div" : "span";
  const cls = displayMode ? "edm-math-display" : "edm-math-inline";
  const escaped = escAttr(latex);
  if (katexModule) {
    try {
      const html = katexModule.renderToString(latex, {
        displayMode,
        throwOnError: false,
        output: "html"
      });
      return `<${tag} class="${cls}" data-math="${escaped}">${html}</${tag}>`;
    } catch {
    }
  }
  return `<${tag} class="${cls}" data-math="${escaped}">${esc(unicodeFallback)}</${tag}>`;
}
function setKatex(mod) {
  katexModule = mod;
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// src/renderer/enhance-diagrams.ts
var DEFAULT_KROKI_URL = "https://kroki.io";
var MERMAID_RE = /<pre\s+class="mermaid">([\s\S]*?)<\/pre>/g;
var DIAGRAM_CODE_RE = /<pre\s+class="edm-diagram-code"\s+data-language="([^"]+)">([\s\S]*?)<\/pre>/g;
function decodeHtmlEntities(html) {
  return html.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
async function enhanceDiagrams(html, options) {
  const krokiUrl = (options?.krokiUrl ?? DEFAULT_KROKI_URL).replace(/\/+$/, "");
  const matches = [];
  let m;
  MERMAID_RE.lastIndex = 0;
  while ((m = MERMAID_RE.exec(html)) !== null) {
    matches.push({
      fullMatch: m[0],
      language: "mermaid",
      code: decodeHtmlEntities(m[1])
    });
  }
  DIAGRAM_CODE_RE.lastIndex = 0;
  while ((m = DIAGRAM_CODE_RE.exec(html)) !== null) {
    matches.push({
      fullMatch: m[0],
      language: m[1],
      code: decodeHtmlEntities(m[2])
    });
  }
  if (matches.length === 0) return html;
  const results = await Promise.allSettled(
    matches.map(async (match) => {
      const res = await fetch(`${krokiUrl}/${match.language}/svg`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: match.code
      });
      if (!res.ok) {
        throw new Error(`Kroki returned ${res.status} for ${match.language}`);
      }
      return { match, svg: await res.text() };
    })
  );
  let result = html;
  for (const r of results) {
    if (r.status === "fulfilled") {
      const { match, svg } = r.value;
      result = result.replace(
        match.fullMatch,
        `<div class="edm-diagram-render">${svg}</div>`
      );
    }
  }
  return result;
}

// src/parser/index.ts
import MarkdownIt from "markdown-it";

// src/parser/frontmatter.ts
import yaml from "js-yaml";
function extractFrontmatter(source) {
  const trimmed = source.trimStart();
  if (!trimmed.startsWith("---")) {
    return { frontmatter: {}, content: source };
  }
  const endIndex = trimmed.indexOf("\n---", 3);
  if (endIndex === -1) {
    return { frontmatter: {}, content: source };
  }
  const yamlStr = trimmed.slice(3, endIndex).trim();
  const content = trimmed.slice(endIndex + 4);
  let frontmatter = {};
  try {
    const parsed = yaml.load(yamlStr);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      frontmatter = parsed;
    }
  } catch {
    return { frontmatter: {}, content: source };
  }
  return { frontmatter, content };
}

// src/parser/attributes.ts
var VALID_BLOCK_TYPES = /* @__PURE__ */ new Set([
  "hero",
  "objective",
  "definition",
  "key-concept",
  "note",
  "warning",
  "example",
  "exercise",
  "application",
  "comparison",
  "diagram",
  "image",
  "question",
  "mnemonic",
  "history",
  "summary",
  "reference",
  "aside",
  "teacher-only",
  "student-only",
  "solution",
  "math",
  "include"
]);
function parseContainerLine(line) {
  const match = line.match(/^:{3,}\s*(\S+)(.*)$/);
  if (!match) return null;
  const typeName = match[1];
  if (!VALID_BLOCK_TYPES.has(typeName)) return null;
  const rest = match[2].trim();
  const attributes = parseAttributes(rest);
  return { blockType: typeName, attributes };
}
function parseAttributes(input) {
  const attrs = {};
  if (!input) return attrs;
  const re = /(\w[\w-]*)(?:="([^"]*)")?/g;
  let m;
  while ((m = re.exec(input)) !== null) {
    const key = m[1];
    const value = m[2];
    if (value !== void 0) {
      attrs[key] = value;
    } else {
      attrs[key] = true;
    }
  }
  return attrs;
}

// src/parser/container.ts
function containerPlugin(md) {
  md.block.ruler.before("fence", "edm_container", containerRule, {
    alt: ["paragraph", "reference", "blockquote", "list"]
  });
  md.renderer.rules["edm_container_open"] = (tokens, idx) => {
    const token = tokens[idx];
    const blockType = token.info;
    const attrs = token.meta?.rawAttrs || "";
    return `<!--edm:${blockType} ${attrs}-->
`;
  };
  md.renderer.rules["edm_container_close"] = (tokens, idx) => {
    const token = tokens[idx];
    const blockType = token.info;
    return `<!--/edm:${blockType}-->
`;
  };
}
function containerRule(state, startLine, endLine, silent) {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const lineText = state.src.slice(pos, max);
  if (lineText.charCodeAt(0) !== 58 || lineText.charCodeAt(1) !== 58 || lineText.charCodeAt(2) !== 58) {
    return false;
  }
  const parsed = parseContainerLine(lineText);
  if (!parsed) return false;
  if (silent) return true;
  let nestLevel = 1;
  let nextLine = startLine + 1;
  while (nextLine < endLine) {
    const npos = state.bMarks[nextLine] + state.tShift[nextLine];
    const nmax = state.eMarks[nextLine];
    const nline = state.src.slice(npos, nmax);
    if (nline.startsWith("```")) {
      nextLine++;
      while (nextLine < endLine) {
        const cpos = state.bMarks[nextLine] + state.tShift[nextLine];
        const cmax = state.eMarks[nextLine];
        const cline = state.src.slice(cpos, cmax);
        if (cline.startsWith("```")) {
          nextLine++;
          break;
        }
        nextLine++;
      }
      continue;
    }
    if (nline.startsWith(":::")) {
      const innerParsed = parseContainerLine(nline);
      if (innerParsed) {
        nestLevel++;
      } else if (nline.match(/^:{3,}\s*$/)) {
        nestLevel--;
        if (nestLevel === 0) break;
      }
    }
    nextLine++;
  }
  const openToken = state.push("edm_container_open", "div", 1);
  openToken.info = parsed.blockType;
  openToken.meta = { rawAttrs: serializeAttrs(parsed.attributes), attributes: parsed.attributes };
  openToken.block = true;
  openToken.map = [startLine, nextLine];
  const oldParent = state.parentType;
  const oldLineMax = state.lineMax;
  state.parentType = "blockquote";
  state.lineMax = nextLine;
  state.md.block.tokenize(state, startLine + 1, nextLine);
  state.parentType = oldParent;
  state.lineMax = oldLineMax;
  const closeToken = state.push("edm_container_close", "div", -1);
  closeToken.info = parsed.blockType;
  closeToken.block = true;
  state.line = nextLine + 1;
  return true;
}
function serializeAttrs(attrs) {
  return Object.entries(attrs).filter(([, v]) => v !== void 0).map(([k, v]) => v === true ? k : `${k}="${v}"`).join(" ");
}

// src/parser/inline-ref.ts
var REF_RE = /ref\{([^}]+)\}/g;
function inlineRefPlugin(md) {
  md.core.ruler.push("edm_ref", (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== "inline" || !blockToken.children) continue;
      blockToken.children = processChildren(blockToken.children, state.Token);
    }
  });
  md.renderer.rules["edm_ref"] = (tokens, idx) => {
    const token = tokens[idx];
    const id2 = token.meta.id;
    const file = token.meta.file;
    const text = token.meta.text;
    const href = file ? `${file}#${id2}` : `#${id2}`;
    const label = text || id2;
    return `<a href="${href}" class="edm-ref">${md.utils.escapeHtml(label)}</a>`;
  };
}
function processChildren(children, TokenClass) {
  const result = [];
  for (const token of children) {
    if (token.type !== "text" || !REF_RE.test(token.content)) {
      result.push(token);
      continue;
    }
    REF_RE.lastIndex = 0;
    let lastIndex = 0;
    let match;
    while ((match = REF_RE.exec(token.content)) !== null) {
      if (match.index > lastIndex) {
        const textToken = new TokenClass("text", "", 0);
        textToken.content = token.content.slice(lastIndex, match.index);
        result.push(textToken);
      }
      const inner = match[1].trim();
      const { id: id2, file, text } = parseRefInner(inner);
      const refToken = new TokenClass("edm_ref", "", 0);
      refToken.meta = { id: id2, file, text };
      result.push(refToken);
      lastIndex = REF_RE.lastIndex;
    }
    if (lastIndex < token.content.length) {
      const textToken = new TokenClass("text", "", 0);
      textToken.content = token.content.slice(lastIndex);
      result.push(textToken);
    }
  }
  return result;
}
function parseRefInner(inner) {
  let id2;
  let file;
  let text;
  const spaceIdx = inner.indexOf(" ");
  if (spaceIdx === -1) {
    const ref = inner;
    const hashIdx = ref.indexOf("#");
    if (hashIdx !== -1) {
      file = ref.slice(0, hashIdx);
      id2 = ref.slice(hashIdx + 1);
    } else {
      id2 = ref;
    }
  } else {
    const ref = inner.slice(0, spaceIdx);
    text = inner.slice(spaceIdx + 1).trim();
    const hashIdx = ref.indexOf("#");
    if (hashIdx !== -1) {
      file = ref.slice(0, hashIdx);
      id2 = ref.slice(hashIdx + 1);
    } else {
      id2 = ref;
    }
  }
  return { id: id2, file, text };
}

// src/parser/include.ts
var INCLUDE_RE = /^::include\s+file="([^"]+)"\s*$/gm;
function resolveIncludes(source, resolver, seen = /* @__PURE__ */ new Set()) {
  return source.replace(INCLUDE_RE, (_match, filePath) => {
    if (seen.has(filePath)) {
      throw new IncludeError("Circular include detected", filePath);
    }
    const newSeen = new Set(seen);
    newSeen.add(filePath);
    let content;
    try {
      content = resolver(filePath);
    } catch (err) {
      if (err instanceof IncludeError) throw err;
      throw new IncludeError(`Failed to resolve include`, filePath);
    }
    return resolveIncludes(content, resolver, newSeen);
  });
}

// src/parser/math.ts
function mathPlugin(md) {
  md.core.ruler.push("edm_math_inline", (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== "inline" || !blockToken.children) continue;
      blockToken.children = processMathInline(blockToken.children, state.Token);
    }
  });
  md.renderer.rules["edm_math_inline"] = (tokens, idx) => {
    const raw = tokens[idx].content;
    const latex = unicodeToLatex(raw);
    return renderLatexToHtml(latex, false, raw);
  };
}
function renderMathBlock(content) {
  const lines = content.trim().split("\n");
  const parts = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";
    const latex = unicodeToLatex(trimmed);
    return renderLatexToHtml(latex, true, trimmed);
  });
  return parts.join("\n");
}
var MATH_INLINE_RE = /m\{([^}]+)\}/g;
function processMathInline(children, TokenClass) {
  const result = [];
  for (const token of children) {
    if (token.type !== "text" || !MATH_INLINE_RE.test(token.content)) {
      result.push(token);
      continue;
    }
    MATH_INLINE_RE.lastIndex = 0;
    let lastIndex = 0;
    let match;
    while ((match = MATH_INLINE_RE.exec(token.content)) !== null) {
      if (match.index > lastIndex) {
        const t = new TokenClass("text", "", 0);
        t.content = token.content.slice(lastIndex, match.index);
        result.push(t);
      }
      const mathToken = new TokenClass("edm_math_inline", "", 0);
      mathToken.content = match[1].trim();
      result.push(mathToken);
      lastIndex = MATH_INLINE_RE.lastIndex;
    }
    if (lastIndex < token.content.length) {
      const t = new TokenClass("text", "", 0);
      t.content = token.content.slice(lastIndex);
      result.push(t);
    }
  }
  return result;
}
function unicodeToLatex(input) {
  let s = input;
  s = s.replace(/\(([^)]+)\)\s*\/\s*\(([^)]+)\)/g, "\\frac{$1}{$2}");
  s = s.replace(/(?<![/\w])([A-Za-zΔ][A-Za-z₀₁₂₃₄₅₆₇₈₉Δ]*)\/([A-Za-zΔ][A-Za-z₀₁₂₃₄₅₆₇₈₉Δ]*)/g, "\\frac{$1}{$2}");
  s = s.replace(/√\(([^)]+)\)/g, "\\sqrt{$1}");
  s = s.replace(/√(\d+)/g, "\\sqrt{$1}");
  s = s.replace(/Δ/g, "\\Delta ");
  s = s.replace(/α/g, "\\alpha ");
  s = s.replace(/β/g, "\\beta ");
  s = s.replace(/γ/g, "\\gamma ");
  s = s.replace(/θ/g, "\\theta ");
  s = s.replace(/λ/g, "\\lambda ");
  s = s.replace(/μ/g, "\\mu ");
  s = s.replace(/π/g, "\\pi ");
  s = s.replace(/σ/g, "\\sigma ");
  s = s.replace(/ω/g, "\\omega ");
  s = s.replace(/φ/g, "\\varphi ");
  s = s.replace(/ε/g, "\\varepsilon ");
  s = s.replace(/τ/g, "\\tau ");
  s = s.replace(/ρ/g, "\\rho ");
  s = s.replace(/₀/g, "_0");
  s = s.replace(/₁/g, "_1");
  s = s.replace(/₂/g, "_2");
  s = s.replace(/₃/g, "_3");
  s = s.replace(/₄/g, "_4");
  s = s.replace(/₅/g, "_5");
  s = s.replace(/₆/g, "_6");
  s = s.replace(/₇/g, "_7");
  s = s.replace(/₈/g, "_8");
  s = s.replace(/₉/g, "_9");
  s = s.replace(/ₙ/g, "_n");
  s = s.replace(/ₘ/g, "_m");
  s = s.replace(/ᵢ/g, "_i");
  s = s.replace(/ⱼ/g, "_j");
  s = s.replace(/ₓ/g, "_x");
  s = s.replace(/_([a-zA-Z]{2,})/g, "_{$1}");
  s = s.replace(/²/g, "^2");
  s = s.replace(/³/g, "^3");
  s = s.replace(/⁴/g, "^4");
  s = s.replace(/ⁿ/g, "^n");
  s = s.replace(/·/g, "\\cdot ");
  s = s.replace(/×/g, "\\times ");
  s = s.replace(/÷/g, "\\div ");
  s = s.replace(/±/g, "\\pm ");
  s = s.replace(/∓/g, "\\mp ");
  s = s.replace(/≈/g, "\\approx ");
  s = s.replace(/≠/g, "\\neq ");
  s = s.replace(/≤/g, "\\leq ");
  s = s.replace(/≥/g, "\\geq ");
  s = s.replace(/∝/g, "\\propto ");
  s = s.replace(/∞/g, "\\infty ");
  s = s.replace(/→/g, "\\rightarrow ");
  s = s.replace(/←/g, "\\leftarrow ");
  s = s.replace(/⇒/g, "\\Rightarrow ");
  s = s.replace(/∈/g, "\\in ");
  s = s.replace(/∑/g, "\\sum ");
  s = s.replace(/∫/g, "\\int ");
  s = s.replace(/∂/g, "\\partial ");
  s = s.replace(/½/g, "\\tfrac{1}{2}");
  s = s.replace(/⅓/g, "\\tfrac{1}{3}");
  s = s.replace(/¼/g, "\\tfrac{1}{4}");
  s = s.replace(/⅔/g, "\\tfrac{2}{3}");
  s = s.replace(/¾/g, "\\tfrac{3}{4}");
  s = s.replace(/v̄/g, "\\bar{v}");
  s = s.replace(/x̄/g, "\\bar{x}");
  s = s.replace(/\b(m\/s|km\/h|m\/s\^2|rad\/s|N\/m|J\/mol|kg·m\/s)\b/g, "\\text{$1}");
  s = s.replace(/(\d)\s+(m|s|kg|N|J|W|Hz|Pa|V|A|Ω|km|cm|mm|min|h)\b/g, "$1\\;\\text{$2}");
  s = s.replace(/lím/g, "\\lim");
  s = s.replace(/  +/g, " ");
  return s.trim();
}

// src/parser/html-comment.ts
function htmlCommentPlugin(md) {
  md.block.ruler.before("html_block", "html_comment", htmlCommentRule);
  md.renderer.rules["html_comment"] = (tokens, idx) => tokens[idx].content;
}
function htmlCommentRule(state, startLine, endLine, silent) {
  const startPos = state.bMarks[startLine] + state.tShift[startLine];
  const src = state.src;
  if (src.charCodeAt(startPos) !== 60) return false;
  if (src.slice(startPos, startPos + 4) !== "<!--") return false;
  let nextLine = startLine;
  let found = false;
  while (nextLine <= endLine) {
    const lineStart = nextLine === startLine ? startPos : state.bMarks[nextLine];
    const lineEnd = state.eMarks[nextLine];
    const lineText = src.slice(lineStart, lineEnd);
    const closeIdx = lineText.indexOf("-->");
    if (closeIdx !== -1) {
      found = true;
      break;
    }
    nextLine++;
  }
  if (!found) return false;
  if (silent) return true;
  const lines = [];
  for (let i = startLine; i <= nextLine; i++) {
    const ls = i === startLine ? startPos : state.bMarks[i];
    lines.push(src.slice(ls, state.eMarks[i]));
  }
  const token = state.push("html_comment", "", 0);
  token.content = lines.join("\n") + "\n";
  token.map = [startLine, nextLine + 1];
  state.line = nextLine + 1;
  return true;
}

// src/blocks/definition.ts
function parseDefinitions(content) {
  const results = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^\*\*(.+?)\*\*\s*\|\s*(.+)$/);
    if (match) {
      results.push({ term: match[1].trim(), definition: match[2].trim() });
    }
  }
  return results;
}

// src/blocks/hero.ts
function parseHeroFields(content) {
  const fields = {};
  const topics = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("- ")) {
      topics.push(trimmed.slice(2).trim());
      continue;
    }
    const match = trimmed.match(/^(\w[\w-]*):\s*(?:"([^"]*)"|(.+))$/);
    if (match) {
      const key = match[1];
      const value = match[2] !== void 0 ? match[2] : match[3].trim();
      fields[key] = value;
    }
  }
  return { fields, topics };
}

// src/blocks/image.ts
function parseImageFields(content) {
  const fields = {};
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\w+):\s*(?:"([^"]*)"|(.+))$/);
    if (match) {
      const key = match[1];
      const value = match[2] !== void 0 ? match[2] : match[3].trim();
      fields[key] = value;
    }
  }
  return fields;
}

// src/blocks/diagram.ts
function parseDiagram(content) {
  const fenceMatch = content.match(/```(\w+)\n([\s\S]*?)```/);
  if (!fenceMatch) {
    return { description: content.trim() };
  }
  const language = fenceMatch[1];
  const code = fenceMatch[2].trim();
  const description = content.slice(0, fenceMatch.index).trim();
  return {
    description: description || "",
    diagramCode: { language, code }
  };
}

// src/blocks/question.ts
function parseQuestion(content, type) {
  const lines = content.split("\n");
  const stemLines = [];
  const options = [];
  const answers = [];
  let inOptions = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (!inOptions) stemLines.push("");
      continue;
    }
    if (trimmed.startsWith("=") || trimmed.startsWith("~")) {
      inOptions = true;
      if (type === "open" || type === "case") {
        if (trimmed.startsWith("=")) {
          answers.push(trimmed.slice(1).trim());
        }
        continue;
      }
      if (type === "true-false") {
        if (trimmed.startsWith("=")) {
          const feedbackMatch = trimmed.match(/^=\s*(.+?)\s*(?:#\s*(.+))?$/);
          if (feedbackMatch) {
            answers.push(feedbackMatch[1].trim());
            if (feedbackMatch[2]) {
              options.push({
                correct: true,
                text: feedbackMatch[1].trim(),
                feedback: feedbackMatch[2].trim()
              });
            }
          }
        }
        continue;
      }
      const correct = trimmed.startsWith("=");
      const rest = trimmed.slice(1).trim();
      const feedbackIdx = rest.indexOf("#");
      let text;
      let feedback;
      if (feedbackIdx !== -1) {
        text = rest.slice(0, feedbackIdx).trim();
        feedback = rest.slice(feedbackIdx + 1).trim();
      } else {
        text = rest;
      }
      options.push({ correct, text, feedback });
    } else {
      if (!inOptions) {
        stemLines.push(trimmed);
      }
    }
  }
  return {
    stem: stemLines.join("\n").trim(),
    options,
    answers
  };
}

// src/blocks/conditional.ts
function shouldInclude(blockType, mode) {
  if (mode === "all") return true;
  if (blockType === "teacher-only") return mode === "teacher";
  if (blockType === "student-only") return mode === "student";
  return true;
}

// src/parser/index.ts
function createParser() {
  const md = new MarkdownIt({ html: false, linkify: false });
  md.use(containerPlugin);
  md.use(inlineRefPlugin);
  md.use(mathPlugin);
  md.use(htmlCommentPlugin);
  md.enable("table");
  return md;
}
function parse(source, options = {}) {
  const mode = options.mode || "all";
  let text = source;
  if (options.resolveInclude) {
    text = resolveIncludes(text, options.resolveInclude);
  }
  const { frontmatter, content } = extractFrontmatter(text);
  const md = createParser();
  const tokens = md.parse(content, {});
  const blocks = buildBlocks(tokens, content, mode);
  const refs = buildRefMap(blocks, tokens);
  return { frontmatter, blocks, refs, tokens };
}
function buildBlocks(tokens, source, mode) {
  const blocks = [];
  const stack = [blocks];
  let currentBlock = null;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === "edm_container_open") {
      const blockType = token.info;
      const attributes = token.meta?.attributes || {};
      if (!shouldInclude(blockType, mode)) {
        let depth = 1;
        i++;
        while (i < tokens.length && depth > 0) {
          if (tokens[i].type === "edm_container_open") depth++;
          if (tokens[i].type === "edm_container_close") depth--;
          i++;
        }
        i--;
        continue;
      }
      const block = {
        blockType,
        attributes,
        content: "",
        children: []
      };
      const rawContent = extractRawContent(tokens, i, source);
      block.content = rawContent;
      parseBlockInternals(block);
      stack[stack.length - 1].push(block);
      stack.push(block.children);
      currentBlock = block;
    } else if (token.type === "edm_container_close") {
      stack.pop();
      currentBlock = null;
    }
  }
  return blocks;
}
function extractRawContent(tokens, openIdx, source) {
  const openToken = tokens[openIdx];
  let depth = 1;
  let closeIdx = openIdx + 1;
  while (closeIdx < tokens.length && depth > 0) {
    if (tokens[closeIdx].type === "edm_container_open") depth++;
    if (tokens[closeIdx].type === "edm_container_close") depth--;
    closeIdx++;
  }
  closeIdx--;
  const lines = source.split("\n");
  const startLine = openToken.map ? openToken.map[0] + 1 : -1;
  const endLine = openToken.map ? openToken.map[1] : -1;
  if (startLine >= 0 && endLine > startLine) {
    let contentEndLine = endLine;
    for (let i2 = openIdx + 1; i2 < tokens.length; i2++) {
      if (tokens[i2].type === "edm_container_open" && tokens[i2].map) {
        let d = 0;
        for (let j = openIdx + 1; j <= i2; j++) {
          if (tokens[j].type === "edm_container_open") d++;
          if (tokens[j].type === "edm_container_close") d--;
        }
        if (d === 1) {
          contentEndLine = Math.min(contentEndLine, tokens[i2].map[0]);
          break;
        }
      }
      if (tokens[i2].type === "edm_container_close") {
        let d2 = 1;
        for (let j = openIdx + 1; j < i2; j++) {
          if (tokens[j].type === "edm_container_open") d2++;
          if (tokens[j].type === "edm_container_close") d2--;
        }
        if (d2 === 0) break;
      }
    }
    return lines.slice(startLine, contentEndLine).join("\n").trim();
  }
  const parts = [];
  depth = 1;
  let i = openIdx + 1;
  while (i < tokens.length && depth > 0) {
    if (tokens[i].type === "edm_container_open") depth++;
    else if (tokens[i].type === "edm_container_close") depth--;
    else if (depth === 1) {
      if (tokens[i].type === "inline") parts.push(tokens[i].content);
      else if (tokens[i].type === "fence") parts.push("```" + (tokens[i].info || "") + "\n" + tokens[i].content + "```");
      else if (tokens[i].content) parts.push(tokens[i].content);
    }
    i++;
  }
  return parts.join("\n");
}
function parseBlockInternals(block) {
  switch (block.blockType) {
    case "hero": {
      const heroResult = parseHeroFields(block.content);
      block.fields = heroResult.fields;
      block.topics = heroResult.topics;
      break;
    }
    case "definition":
      block.definitions = parseDefinitions(block.content);
      break;
    case "image":
      block.fields = parseImageFields(block.content);
      break;
    case "diagram": {
      const result = parseDiagram(block.content);
      block.description = result.description;
      block.diagramCode = result.diagramCode;
      break;
    }
    case "question": {
      const type = block.attributes.type || "open";
      const result = parseQuestion(block.content, type);
      block.content = result.stem;
      block.options = result.options;
      block.answers = result.answers;
      break;
    }
  }
}
function buildRefMap(blocks, tokens) {
  const refs = /* @__PURE__ */ new Map();
  const counters = /* @__PURE__ */ new Map();
  function getNumber(type) {
    const n = (counters.get(type) || 0) + 1;
    counters.set(type, n);
    return n;
  }
  function walkBlocks(blockList) {
    for (const block of blockList) {
      if (block.attributes.id) {
        const num = getNumber(block.blockType);
        refs.set(block.attributes.id, {
          type: "block",
          blockType: block.blockType,
          title: block.attributes.title || void 0,
          number: num
        });
      }
      walkBlocks(block.children);
    }
  }
  walkBlocks(blocks);
  for (const token of tokens) {
    if (token.type === "heading_open") {
      const slug = token.attrGet?.("id");
      if (slug) {
        refs.set(slug, { type: "heading" });
      }
    }
  }
  return refs;
}

// src/renderer/index.ts
import MarkdownIt3 from "markdown-it";

// src/renderer/block-renderers.ts
import MarkdownIt2 from "markdown-it";
var inlineMd = new MarkdownIt2({ html: false });
inlineMd.use(mathPlugin);
inlineMd.enable("table");
function renderInline(text) {
  return inlineMd.renderInline(text);
}
function renderMarkdown(text) {
  return inlineMd.render(text);
}
function id(block) {
  return block.attributes.id ? ` id="${esc2(block.attributes.id)}"` : "";
}
function esc2(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var ICONS = {
  "objective": "\u{1F3AF}",
  "definition": "\u{1F4D6}",
  "key-concept": "\u{1F4A1}",
  "note": "\u{1F4DD}",
  "warning": "\u26A0\uFE0F",
  "example": "\u270F\uFE0F",
  "exercise": "\u{1F9E9}",
  "application": "\u{1F52C}",
  "comparison": "\u2696\uFE0F",
  "diagram": "\u{1F4CA}",
  "image": "\u{1F5BC}\uFE0F",
  "question": "\u2753",
  "mnemonic": "\u{1F9E0}",
  "history": "\u{1F4DC}",
  "summary": "\u{1F4CB}",
  "reference": "\u{1F4DA}",
  "aside": "\u{1F4AC}",
  "teacher-only": "\u{1F468}\u200D\u{1F3EB}",
  "student-only": "\u{1F393}",
  "solution": "\u2705",
  "math": "\u{1F4D0}",
  "include": "\u{1F4C4}"
};
var LABELS = {
  "objective": "Objetivos de aprendizaje",
  "definition": "Definici\xF3n",
  "key-concept": "Concepto clave",
  "note": "Nota",
  "warning": "Advertencia",
  "example": "Ejemplo",
  "exercise": "Ejercicio",
  "application": "Aplicaci\xF3n",
  "comparison": "Comparaci\xF3n",
  "diagram": "Diagrama",
  "image": "Figura",
  "question": "Pregunta",
  "mnemonic": "Mnemot\xE9cnico",
  "history": "Contexto hist\xF3rico",
  "summary": "Resumen del cap\xEDtulo",
  "reference": "Referencias bibliogr\xE1ficas",
  "aside": "Dato adicional",
  "teacher-only": "Solo para el docente",
  "student-only": "Actividad del estudiante",
  "solution": "Soluci\xF3n",
  "math": "Ecuaci\xF3n",
  "include": "Incluir"
};
function blockCard(block, inner, extraClass) {
  const type = block.blockType;
  const icon = ICONS[type] || "";
  const label = LABELS[type] || type;
  const title = block.attributes.title;
  const cls = extraClass ? ` ${extraClass}` : "";
  return `<article class="edm-card edm-${type}${cls}"${id(block)} role="region" aria-label="${esc2(label)}">
<header class="edm-card-header">
  <span class="edm-card-icon" aria-hidden="true">${icon}</span>
  <span class="edm-card-label">${esc2(label)}</span>
  ${title ? `<span class="edm-card-title">${esc2(title)}</span>` : ""}
</header>
<div class="edm-card-body">
${inner}
</div>
</article>
`;
}
function renderBlock(block, childrenHtml) {
  const renderer = RENDERERS[block.blockType];
  if (renderer) return renderer(block, childrenHtml);
  return renderGeneric(block, childrenHtml);
}
function renderGeneric(block, childrenHtml) {
  return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
}
var RENDERERS = {
  hero(block) {
    const f = block.fields || {};
    const topics = block.topics || [];
    const parts = [];
    parts.push(`<header class="edm-hero"${id(block)}>`);
    const badges = [];
    if (f.subject) badges.push(`<span class="edm-hero-badge edm-hero-subject">${esc2(f.subject)}</span>`);
    if (f.level) badges.push(`<span class="edm-hero-badge edm-hero-level">${esc2(f.level)}</span>`);
    if (f.unit) badges.push(`<span class="edm-hero-badge edm-hero-unit">${esc2(f.unit)}</span>`);
    if (badges.length) parts.push(`<div class="edm-hero-badges">${badges.join("")}</div>`);
    if (f.title) parts.push(`<h1 class="edm-hero-title">${esc2(f.title)}</h1>`);
    const meta = [];
    if (f.author) meta.push(`<span class="edm-hero-author">${esc2(f.author)}</span>`);
    if (f.date) meta.push(`<span class="edm-hero-date">${esc2(f.date)}</span>`);
    if (f.version) meta.push(`<span class="edm-hero-version">v${esc2(f.version)}</span>`);
    if (meta.length) parts.push(`<div class="edm-hero-meta">${meta.join('<span class="edm-hero-sep">\xB7</span>')}</div>`);
    if (topics.length) {
      parts.push('<nav class="edm-hero-topics">');
      parts.push('<span class="edm-hero-topics-label">Temas</span>');
      parts.push("<ul>");
      for (const t of topics) {
        parts.push(`<li>${esc2(t)}</li>`);
      }
      parts.push("</ul>");
      parts.push("</nav>");
    }
    parts.push("</header>\n");
    return parts.join("\n");
  },
  objective(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  definition(block, childrenHtml) {
    const defs = block.definitions || [];
    if (defs.length === 0) return renderGeneric(block, "");
    const items = defs.map(
      (d) => `<div class="edm-def-entry">
  <dt>${renderInline(d.term)}</dt>
  <dd>${renderInline(d.definition)}</dd>
</div>`
    ).join("\n");
    return blockCard(block, `<dl class="edm-def-list">
${items}
</dl>${childrenHtml}`);
  },
  "key-concept"(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  warning(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  note(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  example(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  exercise(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
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
</details>
`;
  },
  application(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  comparison(block, childrenHtml) {
    return blockCard(block, `<div class="edm-table-wrap">${renderMarkdown(block.content)}</div>${childrenHtml}`);
  },
  image(block) {
    const f = block.fields || {};
    const src = f.file || "";
    const alt = f.alt || f.title || "";
    const title = f.title || "";
    const desc = f.description || "";
    const source = f.source || "";
    let captionInner = "";
    if (title) captionInner += `<strong>${esc2(title)}</strong>`;
    if (desc) captionInner += (captionInner ? "<br>" : "") + `<span class="edm-fig-desc">${esc2(desc)}</span>`;
    if (source) captionInner += (captionInner ? "<br>" : "") + `<cite class="edm-fig-source">${esc2(source)}</cite>`;
    const inner = `<figure class="edm-fig">
  <div class="edm-fig-frame"><img src="${esc2(src)}" alt="${esc2(alt)}" loading="lazy"></div>
  ${captionInner ? `<figcaption>${captionInner}</figcaption>` : ""}
</figure>`;
    return blockCard(block, inner);
  },
  diagram(block) {
    const parts = [];
    if (block.diagramCode) {
      if (block.diagramCode.language === "mermaid") {
        parts.push(`<div class="edm-diagram-render"><pre class="mermaid">${esc2(block.diagramCode.code)}</pre></div>`);
      } else if (block.diagramCode.language === "svg") {
        parts.push(`<div class="edm-diagram-render edm-diagram-svg">${block.diagramCode.code}</div>`);
      } else {
        parts.push(`<div class="edm-diagram-render"><pre class="edm-diagram-code" data-language="${esc2(block.diagramCode.language)}">${esc2(block.diagramCode.code)}</pre></div>`);
      }
    }
    if (block.description) {
      const showClass = block.diagramCode ? " edm-diagram-fallback" : "";
      parts.push(`<div class="edm-diagram-description${showClass}">${renderMarkdown(block.description)}</div>`);
    }
    return blockCard(block, parts.join("\n"));
  },
  question(block) {
    const type = block.attributes.type || "open";
    const parts = [];
    const typeLabels = {
      choice: "Selecci\xF3n m\xFAltiple",
      "true-false": "Verdadero o falso",
      open: "Desarrollo",
      case: "Caso aplicado"
    };
    parts.push(`<div class="edm-q-type-badge">${typeLabels[type] || type}</div>`);
    if (block.content) {
      parts.push(`<div class="edm-q-stem">${renderMarkdown(block.content)}</div>`);
    }
    if (type === "choice") {
      const options = block.options || [];
      const multipleCorrect = options.filter((o) => o.correct).length > 1;
      const inputType = multipleCorrect ? "checkbox" : "radio";
      const name = block.attributes.id || "q";
      parts.push('<div class="edm-q-options">');
      for (let idx = 0; idx < options.length; idx++) {
        const opt = options[idx];
        const letter = String.fromCharCode(97 + idx);
        parts.push(`<label class="edm-q-option" data-correct="${opt.correct}">
  <input type="${inputType}" name="${esc2(name)}">
  <span class="edm-q-letter">${letter}</span>
  <span class="edm-q-text">${renderInline(opt.text)}</span>
</label>`);
        if (opt.feedback) {
          parts.push(`<div class="edm-q-feedback" hidden>${renderInline(opt.feedback)}</div>`);
        }
      }
      parts.push("</div>");
    } else if (type === "true-false") {
      const answer = block.answers && block.answers[0] || "";
      const name = block.attributes.id || "q";
      const opts = block.options || [];
      parts.push('<div class="edm-q-options">');
      parts.push(`<label class="edm-q-option" data-correct="${answer === "true"}">
  <input type="radio" name="${esc2(name)}">
  <span class="edm-q-letter">V</span>
  <span class="edm-q-text">Verdadero</span>
</label>`);
      parts.push(`<label class="edm-q-option" data-correct="${answer === "false"}">
  <input type="radio" name="${esc2(name)}">
  <span class="edm-q-letter">F</span>
  <span class="edm-q-text">Falso</span>
</label>`);
      parts.push("</div>");
      if (opts[0]?.feedback) {
        parts.push(`<div class="edm-q-feedback" hidden>${renderInline(opts[0].feedback)}</div>`);
      }
    } else if (type === "open" || type === "case") {
      if (block.answers && block.answers.length > 0) {
        parts.push(`<details class="edm-q-answer">
<summary>Ver respuesta modelo</summary>
<div class="edm-q-answer-body">
${block.answers.map((a) => renderMarkdown(a)).join("\n")}
</div>
</details>`);
      }
    }
    return blockCard(block, parts.join("\n"));
  },
  mnemonic(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  history(block) {
    let meta = "";
    if (block.attributes.characters || block.attributes.year) {
      const metaParts = [];
      if (block.attributes.characters) metaParts.push(`<span class="edm-hist-who"><span aria-hidden="true">\u{1F464}</span> ${esc2(block.attributes.characters)}</span>`);
      if (block.attributes.year) metaParts.push(`<span class="edm-hist-when"><span aria-hidden="true">\u{1F4C5}</span> ${esc2(block.attributes.year)}</span>`);
      meta = `<div class="edm-hist-meta">${metaParts.join("")}</div>
`;
    }
    return blockCard(block, `${meta}${renderMarkdown(block.content)}`);
  },
  summary(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  reference(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  aside(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  "teacher-only"(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  "student-only"(block, childrenHtml) {
    return blockCard(block, `${renderMarkdown(block.content)}${childrenHtml}`);
  },
  math(block) {
    return blockCard(block, renderMathBlock(block.content));
  },
  include(block) {
    const file = block.attributes.file || "";
    const title = block.attributes.title || "";
    const anchorId = file.replace(/\.edm$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
    const label = title || block.content.trim() || file.replace(/\.edm$/, "").replace(/[_-]/g, " ");
    return `<div class="edm-include-link"${id(block)}>
<a href="#${esc2(anchorId)}" data-include-file="${esc2(file)}" class="edm-include-ref">
  <span class="edm-include-label">${renderInline(label)}</span>
  <span class="edm-include-dots"></span>
  <span class="edm-include-page" data-target="${esc2(anchorId)}"></span>
</a>
</div>
`;
  }
};

// src/renderer/numbering.ts
var NUMBERED_TYPES = /* @__PURE__ */ new Set([
  "definition",
  "example",
  "exercise",
  "diagram",
  "image",
  "question"
]);
function buildNumbering(blocks) {
  const labels = /* @__PURE__ */ new Map();
  const counters = /* @__PURE__ */ new Map();
  function walk(blockList) {
    for (const block of blockList) {
      if (NUMBERED_TYPES.has(block.blockType) && block.attributes.id) {
        const n = (counters.get(block.blockType) || 0) + 1;
        counters.set(block.blockType, n);
        const prefix = TYPE_LABELS[block.blockType] || block.blockType;
        labels.set(block.attributes.id, `${prefix} ${n}`);
      }
      walk(block.children);
    }
  }
  walk(blocks);
  return labels;
}
var TYPE_LABELS = {
  definition: "Definition",
  example: "Example",
  exercise: "Exercise",
  diagram: "Figure",
  image: "Figure",
  question: "Question"
};

// src/renderer/index.ts
function render(doc, _options = {}) {
  const labels = buildNumbering(doc.blocks);
  const md = new MarkdownIt3({ html: false });
  md.use(inlineRefPlugin);
  md.use(mathPlugin);
  md.use(htmlCommentPlugin);
  md.enable("table");
  const parts = [];
  const tokens = doc.tokens;
  const blocksByKey = buildBlockIndex(doc.blocks);
  let i = 0;
  while (i < tokens.length) {
    if (tokens[i].type === "edm_container_open") {
      const blockType = tokens[i].info;
      const attrs = tokens[i].meta?.attributes || {};
      const key = blockKey(blockType, attrs);
      const block = blocksByKey.get(key);
      if (block) {
        const childrenHtml = renderChildrenHtml(block);
        parts.push(renderBlock(block, childrenHtml));
      }
      let depth = 1;
      i++;
      while (i < tokens.length && depth > 0) {
        if (tokens[i].type === "edm_container_open") depth++;
        if (tokens[i].type === "edm_container_close") depth--;
        i++;
      }
      continue;
    }
    const rendered = renderSingleToken(tokens, i, md);
    parts.push(rendered);
    if (tokens[i]._groupEnd !== void 0) {
      i = tokens[i]._groupEnd + 1;
    } else {
      i++;
    }
  }
  return parts.join("");
}
function renderSingleToken(tokens, idx, md) {
  const token = tokens[idx];
  if (token.nesting === 0 && token.type !== "inline") {
    return md.renderer.render([token], md.options, {});
  }
  if (token.nesting === 1) {
    const closeIdx = findMatchingClose(tokens, idx);
    const slice = tokens.slice(idx, closeIdx + 1);
    token._groupRendered = true;
    token._groupEnd = closeIdx;
    return md.renderer.render(slice, md.options, {});
  }
  return "";
}
function findMatchingClose(tokens, openIdx) {
  const tag = tokens[openIdx].tag;
  let depth = 0;
  for (let i = openIdx; i < tokens.length; i++) {
    if (tokens[i].tag === tag) {
      if (tokens[i].nesting === 1) depth++;
      if (tokens[i].nesting === -1) depth--;
      if (depth === 0) return i;
    }
  }
  return tokens.length - 1;
}
function renderChildrenHtml(block) {
  return block.children.map(
    (child) => renderBlock(child, renderChildrenHtml(child))
  ).join("");
}
function blockKey(blockType, attrs) {
  return `${blockType}:${attrs.id || ""}:${attrs.title || ""}:${attrs.type || ""}`;
}
function buildBlockIndex(blocks) {
  const map = /* @__PURE__ */ new Map();
  function walk(list) {
    for (const block of list) {
      const key = blockKey(block.blockType, block.attributes);
      map.set(key, block);
      walk(block.children);
    }
  }
  walk(blocks);
  return map;
}

// src/index.ts
function parse2(source, options) {
  return parse(source, options);
}
function render2(doc, options) {
  return render(doc, options);
}
function decode(source, options) {
  const doc = parse2(source, options);
  return render2(doc, options);
}
async function renderAsync(doc, options) {
  const html = render2(doc, options);
  return enhanceDiagrams(html, options);
}
async function decodeAsync(source, options) {
  const doc = parse2(source, options);
  const html = render2(doc, options);
  return enhanceDiagrams(html, options);
}
export {
  EdumarkError,
  IncludeError,
  ParseError,
  RefError,
  decode,
  decodeAsync,
  enhanceDiagrams,
  parse2 as parse,
  render2 as render,
  renderAsync,
  setKatex
};
//# sourceMappingURL=index.js.map