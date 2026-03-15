import { describe, it, expect } from 'vitest'
import { decode } from '../../src/index.js'
import { unicodeToLatex } from '../../src/parser/math.js'

describe('math inline m{...}', () => {
  it('renders inline math', () => {
    const html = decode('The formula m{E = mc²} is famous.')
    expect(html).toContain('edm-math-inline')
    expect(html).toContain('data-math=')
  })

  it('renders multiple inline math in same line', () => {
    const html = decode('Where m{v} is velocity and m{t} is time.')
    const matches = html.match(/edm-math-inline/g)
    expect(matches).toHaveLength(2)
  })

  it('does not match plain text with m', () => {
    const html = decode('In a metro there were 2 people.')
    expect(html).not.toContain('edm-math-inline')
  })

  it('renders math inside blocks', () => {
    const html = decode(':::note\nUse m{F = m·a} here.\n:::')
    expect(html).toContain('edm-math-inline')
  })
})

describe(':::math block', () => {
  it('renders display math block', () => {
    const html = decode(':::math\nv = v₀ + a·t\n:::')
    expect(html).toContain('edm-math-display')
    expect(html).toContain('edm-card edm-math')
  })

  it('renders multi-line math block', () => {
    const html = decode(':::math\nv = v₀ + a·t\nx = x₀ + v₀·t + ½·a·t²\n:::')
    const matches = html.match(/edm-math-display/g)
    expect(matches!.length).toBeGreaterThanOrEqual(2)
  })
})

describe('unicodeToLatex', () => {
  it('converts subscripts', () => {
    expect(unicodeToLatex('v₀')).toContain('_0')
  })

  it('converts superscripts', () => {
    expect(unicodeToLatex('t²')).toContain('^2')
  })

  it('converts greek Δ', () => {
    expect(unicodeToLatex('Δx')).toContain('\\Delta')
  })

  it('converts middle dot to cdot', () => {
    expect(unicodeToLatex('a·t')).toContain('\\cdot')
  })

  it('converts fractions a/b', () => {
    const result = unicodeToLatex('Δx/Δt')
    expect(result).toContain('\\frac')
  })

  it('converts square root', () => {
    expect(unicodeToLatex('√(2·g·h)')).toContain('\\sqrt')
  })

  it('converts vulgar fractions', () => {
    expect(unicodeToLatex('½')).toContain('\\tfrac{1}{2}')
  })

  it('converts v bar', () => {
    expect(unicodeToLatex('v̄')).toContain('\\bar{v}')
  })

  it('converts approximate', () => {
    expect(unicodeToLatex('≈')).toContain('\\approx')
  })

  it('converts proportional', () => {
    expect(unicodeToLatex('∝')).toContain('\\propto')
  })
})
