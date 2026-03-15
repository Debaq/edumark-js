import { describe, it, expect } from 'vitest'
import { resolveIncludes } from '../../src/parser/include.js'
import { IncludeError } from '../../src/utils/errors.js'

describe('resolveIncludes', () => {
  it('resolves a simple include', () => {
    const source = `# Book\n::include file="ch01.edm"\n# End`
    const resolver = (path: string) => {
      if (path === 'ch01.edm') return '## Chapter 1\nContent here'
      return ''
    }

    const result = resolveIncludes(source, resolver)
    expect(result).toContain('## Chapter 1')
    expect(result).toContain('Content here')
    expect(result).not.toContain('::include')
  })

  it('resolves nested includes', () => {
    const resolver = (path: string) => {
      if (path === 'a.edm') return '::include file="b.edm"'
      if (path === 'b.edm') return 'nested content'
      return ''
    }

    const result = resolveIncludes('::include file="a.edm"', resolver)
    expect(result).toBe('nested content')
  })

  it('detects circular includes', () => {
    const resolver = (path: string) => {
      if (path === 'a.edm') return '::include file="b.edm"'
      if (path === 'b.edm') return '::include file="a.edm"'
      return ''
    }

    expect(() => resolveIncludes('::include file="a.edm"', resolver))
      .toThrow(IncludeError)
  })

  it('leaves text without includes unchanged', () => {
    const source = '# Title\nSome content'
    const result = resolveIncludes(source, () => '')
    expect(result).toBe(source)
  })
})
