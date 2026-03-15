import { describe, it, expect } from 'vitest'
import { parseDefinitions } from '../../src/blocks/definition.js'

describe('parseDefinitions', () => {
  it('parses a single definition', () => {
    const result = parseDefinitions('**Photosynthesis** | The process by which plants convert sunlight.')
    expect(result).toHaveLength(1)
    expect(result[0].term).toBe('Photosynthesis')
    expect(result[0].definition).toContain('process')
  })

  it('parses multiple definitions', () => {
    const content = `**Mitosis** | Cell division producing two identical cells.
**Meiosis** | Cell division producing four haploid cells.`
    const result = parseDefinitions(content)
    expect(result).toHaveLength(2)
    expect(result[0].term).toBe('Mitosis')
    expect(result[1].term).toBe('Meiosis')
  })

  it('skips blank lines', () => {
    const content = `**Term** | Def\n\n**Term2** | Def2`
    const result = parseDefinitions(content)
    expect(result).toHaveLength(2)
  })

  it('returns empty for non-definition content', () => {
    expect(parseDefinitions('Just some text')).toHaveLength(0)
  })
})
