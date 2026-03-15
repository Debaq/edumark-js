import { describe, it, expect } from 'vitest'
import { parseAttributes, parseContainerLine } from '../../src/parser/attributes.js'

describe('parseAttributes', () => {
  it('parses empty string', () => {
    expect(parseAttributes('')).toEqual({})
  })

  it('parses single key-value attribute', () => {
    expect(parseAttributes('id="my-id"')).toEqual({ id: 'my-id' })
  })

  it('parses multiple attributes', () => {
    expect(parseAttributes('id="my-id" title="My Title"')).toEqual({
      id: 'my-id',
      title: 'My Title',
    })
  })

  it('parses flag attributes', () => {
    expect(parseAttributes('multiple')).toEqual({ multiple: true })
  })

  it('parses mixed attributes', () => {
    expect(parseAttributes('id="def-1" multiple')).toEqual({
      id: 'def-1',
      multiple: true,
    })
  })

  it('parses history attributes', () => {
    const result = parseAttributes('title="Discovery" characters="Fleming" year="1928"')
    expect(result).toEqual({
      title: 'Discovery',
      characters: 'Fleming',
      year: '1928',
    })
  })
})

describe('parseContainerLine', () => {
  it('parses simple block type', () => {
    const result = parseContainerLine(':::objective')
    expect(result).not.toBeNull()
    expect(result!.blockType).toBe('objective')
    expect(result!.attributes).toEqual({})
  })

  it('parses block with attributes', () => {
    const result = parseContainerLine(':::definition id="photosynthesis"')
    expect(result).not.toBeNull()
    expect(result!.blockType).toBe('definition')
    expect(result!.attributes.id).toBe('photosynthesis')
  })

  it('parses block with question type', () => {
    const result = parseContainerLine(':::question type="choice" id="q-1"')
    expect(result).not.toBeNull()
    expect(result!.blockType).toBe('question')
    expect(result!.attributes.type).toBe('choice')
    expect(result!.attributes.id).toBe('q-1')
  })

  it('returns null for invalid block type', () => {
    expect(parseContainerLine(':::invalid-type')).toBeNull()
  })

  it('returns null for closing fence', () => {
    expect(parseContainerLine(':::')).toBeNull()
  })

  it('parses all valid block types', () => {
    const types = [
      'objective', 'definition', 'key-concept', 'note', 'warning',
      'example', 'exercise', 'application', 'comparison', 'diagram',
      'image', 'question', 'mnemonic', 'history', 'summary',
      'reference', 'aside', 'teacher-only', 'student-only', 'solution',
    ]
    for (const t of types) {
      const result = parseContainerLine(`:::${t}`)
      expect(result, `Expected ${t} to parse`).not.toBeNull()
      expect(result!.blockType).toBe(t)
    }
  })
})
