import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser/index.js'

describe('conditional blocks', () => {
  const source = `:::teacher-only\nTeacher content\n:::\n\n:::student-only\nStudent content\n:::`

  it('includes both in "all" mode', () => {
    const doc = parse(source, { mode: 'all' })
    expect(doc.blocks).toHaveLength(2)
  })

  it('filters teacher-only in student mode', () => {
    const doc = parse(source, { mode: 'student' })
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks[0].blockType).toBe('student-only')
  })

  it('filters student-only in teacher mode', () => {
    const doc = parse(source, { mode: 'teacher' })
    expect(doc.blocks).toHaveLength(1)
    expect(doc.blocks[0].blockType).toBe('teacher-only')
  })
})
