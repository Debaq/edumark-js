import { IncludeError } from '../utils/errors.js'

const INCLUDE_RE = /^::include\s+file="([^"]+)"\s*$/gm

/**
 * Resolve ::include directives in source text.
 * Replaces each directive with the resolved file content recursively.
 * Detects circular includes.
 */
export function resolveIncludes(
  source: string,
  resolver: (path: string) => string,
  seen: Set<string> = new Set(),
): string {
  return source.replace(INCLUDE_RE, (_match, filePath: string) => {
    if (seen.has(filePath)) {
      throw new IncludeError('Circular include detected', filePath)
    }

    const newSeen = new Set(seen)
    newSeen.add(filePath)

    let content: string
    try {
      content = resolver(filePath)
    } catch (err) {
      if (err instanceof IncludeError) throw err
      throw new IncludeError(`Failed to resolve include`, filePath)
    }

    return resolveIncludes(content, resolver, newSeen)
  })
}
