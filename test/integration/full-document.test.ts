import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse, decode } from '../../src/index.js'

const fixture = readFileSync(join(__dirname, '../fixtures/capitulo_ejemplo.edm'), 'utf-8')

describe('full document integration', () => {
  it('parses the example chapter', () => {
    const doc = parse(fixture)

    // Frontmatter
    expect(doc.frontmatter.title).toBe('Kinematics: The Study of Motion')
    expect(doc.frontmatter.author).toBe('Edumark Example')
    expect((doc.frontmatter.topics as string[])).toHaveLength(6)

    // Should find multiple blocks
    expect(doc.blocks.length).toBeGreaterThan(10)
  })

  it('finds all expected block types', () => {
    const doc = parse(fixture)
    const types = new Set(doc.blocks.map(b => b.blockType))

    expect(types.has('objective')).toBe(true)
    expect(types.has('definition')).toBe(true)
    expect(types.has('warning')).toBe(true)
    expect(types.has('diagram')).toBe(true)
    expect(types.has('key-concept')).toBe(true)
    expect(types.has('example')).toBe(true)
    expect(types.has('history')).toBe(true)
    expect(types.has('note')).toBe(true)
    expect(types.has('comparison')).toBe(true)
    expect(types.has('mnemonic')).toBe(true)
    expect(types.has('exercise')).toBe(true)
    expect(types.has('application')).toBe(true)
    expect(types.has('aside')).toBe(true)
    expect(types.has('summary')).toBe(true)
    expect(types.has('question')).toBe(true)
    expect(types.has('reference')).toBe(true)
    expect(types.has('teacher-only')).toBe(true)
    expect(types.has('student-only')).toBe(true)
    expect(types.has('image')).toBe(true)
    expect(types.has('math')).toBe(true)
  })

  it('correctly parses definitions', () => {
    const doc = parse(fixture)
    const defs = doc.blocks.filter(b => b.blockType === 'definition')
    expect(defs.length).toBeGreaterThanOrEqual(4)

    const posDef = defs.find(d => d.attributes.id === 'def-position')
    expect(posDef).toBeDefined()
    expect(posDef!.definitions).toHaveLength(1)
    expect(posDef!.definitions![0].term).toBe('Position')
  })

  it('parses nested exercise/solution', () => {
    const doc = parse(fixture)
    const exercises = doc.blocks.filter(b => b.blockType === 'exercise')
    expect(exercises.length).toBeGreaterThanOrEqual(1)

    const ex = exercises[0]
    expect(ex.children).toHaveLength(1)
    expect(ex.children[0].blockType).toBe('solution')
  })

  it('parses questions correctly', () => {
    const doc = parse(fixture)
    const questions = doc.blocks.filter(b => b.blockType === 'question')
    expect(questions.length).toBeGreaterThanOrEqual(4)

    const choiceQ = questions.find(q => q.attributes.type === 'choice')
    expect(choiceQ).toBeDefined()
    expect(choiceQ!.options!.length).toBeGreaterThan(0)

    const tfQ = questions.find(q => q.attributes.type === 'true-false')
    expect(tfQ).toBeDefined()

    const caseQ = questions.find(q => q.attributes.type === 'case')
    expect(caseQ).toBeDefined()
    expect(caseQ!.answers!.length).toBeGreaterThan(0)

    const openQ = questions.find(q => q.attributes.type === 'open')
    expect(openQ).toBeDefined()
  })

  it('filters teacher-only in student mode', () => {
    const docAll = parse(fixture, { mode: 'all' })
    const docStudent = parse(fixture, { mode: 'student' })

    const allTeacher = docAll.blocks.filter(b => b.blockType === 'teacher-only')
    const studentTeacher = docStudent.blocks.filter(b => b.blockType === 'teacher-only')

    expect(allTeacher.length).toBeGreaterThan(0)
    expect(studentTeacher).toHaveLength(0)
  })

  it('generates valid HTML', () => {
    const html = decode(fixture)
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(500)

    // Check key HTML elements
    expect(html).toContain('edm-definition')
    expect(html).toContain('edm-warning')
    expect(html).toContain('edm-diagram')
    expect(html).toContain('edm-exercise')
    expect(html).toContain('edm-question')
    expect(html).toContain('edm-solution')
    expect(html).toContain('class="mermaid"')
    expect(html).toContain('edm-diagram-svg')
    expect(html).toContain('edm-image')
  })

  it('builds ref map', () => {
    const doc = parse(fixture)
    expect(doc.refs.size).toBeGreaterThan(5)
    expect(doc.refs.has('def-position')).toBe(true)
    expect(doc.refs.has('fig-displacement')).toBe(true)
    expect(doc.refs.has('q-free-fall-mass')).toBe(true)
  })
})
