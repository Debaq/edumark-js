import { describe, it, expect } from 'vitest'
import { parseDiagram } from '../../src/blocks/diagram.js'

describe('parseDiagram', () => {
  it('parses text-only diagram', () => {
    const result = parseDiagram('Circular diagram showing evaporation and condensation.')
    expect(result.description).toContain('Circular diagram')
    expect(result.diagramCode).toBeUndefined()
  })

  it('parses code-only diagram', () => {
    const content = '```mermaid\ngraph TD\n    A --> B\n```'
    const result = parseDiagram(content)
    expect(result.diagramCode).toBeDefined()
    expect(result.diagramCode!.language).toBe('mermaid')
    expect(result.diagramCode!.code).toContain('A --> B')
  })

  it('parses both text and code', () => {
    const content = 'A flowchart showing steps.\n\n```mermaid\ngraph TD\n    A --> B\n```'
    const result = parseDiagram(content)
    expect(result.description).toContain('flowchart')
    expect(result.diagramCode).toBeDefined()
    expect(result.diagramCode!.language).toBe('mermaid')
  })
})
