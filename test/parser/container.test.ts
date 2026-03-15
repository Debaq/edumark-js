import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser/index.js'

describe('container plugin', () => {
  it('parses a simple block', () => {
    const source = `:::note\nSome note content.\n:::`
    const doc = parse(source)
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks[0].blockType).toBe('note')
    expect(doc.blocks[0].content).toContain('Some note content.')
  })

  it('parses block with attributes', () => {
    const source = `:::definition id="test-def"\n**Term** | Meaning\n:::`
    const doc = parse(source)
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks[0].attributes.id).toBe('test-def')
  })

  it('handles nested blocks (exercise + solution)', () => {
    const source = `:::exercise id="ex-1" title="Test"\nProblem text\n\n:::solution\nSolution text\n:::\n:::`
    const doc = parse(source)
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks[0].blockType).toBe('exercise')
    expect(doc.blocks[0].children).toHaveLength(1)
    expect(doc.blocks[0].children[0].blockType).toBe('solution')
  })

  it('handles code fences inside blocks without confusion', () => {
    const source = ":::diagram id=\"fig-1\" title=\"Test\"\nDescription\n\n```mermaid\ngraph TD\n    A --> B\n```\n:::"
    const doc = parse(source)
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks[0].blockType).toBe('diagram')
  })

  it('parses multiple sequential blocks', () => {
    const source = `:::note\nNote 1\n:::\n\n:::warning\nWarning 1\n:::`
    const doc = parse(source)
    expect(doc.blocks).toHaveLength(2)
    expect(doc.blocks[0].blockType).toBe('note')
    expect(doc.blocks[1].blockType).toBe('warning')
  })
})
