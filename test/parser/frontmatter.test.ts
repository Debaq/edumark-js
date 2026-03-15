import { describe, it, expect } from 'vitest'
import { extractFrontmatter } from '../../src/parser/frontmatter.js'

describe('extractFrontmatter', () => {
  it('extracts YAML frontmatter', () => {
    const source = `---
title: "My Book"
author: "Test"
---
# Content here`

    const { frontmatter, content } = extractFrontmatter(source)
    expect(frontmatter.title).toBe('My Book')
    expect(frontmatter.author).toBe('Test')
    expect(content.trim()).toBe('# Content here')
  })

  it('returns empty frontmatter when none present', () => {
    const source = '# No frontmatter'
    const { frontmatter, content } = extractFrontmatter(source)
    expect(frontmatter).toEqual({})
    expect(content).toBe(source)
  })

  it('handles topics array', () => {
    const source = `---
title: "Physics"
topics:
  - Kinematics
  - Dynamics
---
content`

    const { frontmatter } = extractFrontmatter(source)
    expect(frontmatter.title).toBe('Physics')
    expect(frontmatter.topics).toEqual(['Kinematics', 'Dynamics'])
  })

  it('handles invalid YAML gracefully', () => {
    const source = `---
: invalid yaml [
---
content`

    const { frontmatter } = extractFrontmatter(source)
    expect(frontmatter).toEqual({})
  })

  it('handles missing closing delimiter', () => {
    const source = `---
title: "No close"
content`

    const { frontmatter, content } = extractFrontmatter(source)
    expect(frontmatter).toEqual({})
    expect(content).toBe(source)
  })
})
