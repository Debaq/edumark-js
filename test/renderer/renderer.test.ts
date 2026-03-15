import { describe, it, expect } from 'vitest'
import { decode } from '../../src/index.js'

describe('HTML renderer', () => {
  it('renders definition as card with dl', () => {
    const html = decode(':::definition id="test"\n**Term** | The definition text.\n:::')
    expect(html).toContain('edm-card edm-definition')
    expect(html).toContain('<dt>')
    expect(html).toContain('<dd>')
    expect(html).toContain('id="test"')
    expect(html).toContain('edm-card-icon')
    expect(html).toContain('edm-card-label')
  })

  it('renders solution as collapsible details', () => {
    const html = decode(':::exercise id="ex-1" title="Test"\nProblem\n\n:::solution\nAnswer here\n:::\n:::')
    expect(html).toContain('<details class="edm-card edm-solution">')
    expect(html).toContain('<summary')
  })

  it('renders image as figure with frame', () => {
    const html = decode(':::image id="fig-1"\nfile: test.jpg\ntitle: "Test Image"\nalt: "Alt text"\n:::')
    expect(html).toContain('edm-card edm-image')
    expect(html).toContain('<img src="test.jpg"')
    expect(html).toContain('alt="Alt text"')
    expect(html).toContain('<figcaption>')
    expect(html).toContain('edm-fig-frame')
  })

  it('renders diagram with mermaid', () => {
    const html = decode(':::diagram id="fig-1" title="Test"\n```mermaid\ngraph TD\n    A --> B\n```\n:::')
    expect(html).toContain('<pre class="mermaid">')
    expect(html).toContain('edm-card edm-diagram')
  })

  it('renders choice question as card with options', () => {
    const html = decode(':::question type="choice" id="q-1"\nWhat?\n\n= Yes # Correct\n~ No # Wrong\n:::')
    expect(html).toContain('edm-card edm-question')
    expect(html).toContain('edm-q-option')
    expect(html).toContain('data-correct="true"')
    expect(html).toContain('edm-q-letter')
    expect(html).toContain('edm-q-type-badge')
  })

  it('renders note as card', () => {
    const html = decode(':::note\nA note.\n:::')
    expect(html).toContain('edm-card edm-note')
    expect(html).toContain('edm-card-header')
  })

  it('renders warning as card', () => {
    const html = decode(':::warning\nDanger!\n:::')
    expect(html).toContain('edm-card edm-warning')
  })

  it('renders comparison with table', () => {
    const source = `:::comparison title="A vs B"
| Feature | A | B |
|---|---|---|
| Speed | Fast | Slow |
:::`
    const html = decode(source)
    expect(html).toContain('edm-card edm-comparison')
    expect(html).toContain('<table>')
    expect(html).toContain('edm-table-wrap')
  })

  it('renders history block with metadata', () => {
    const html = decode(':::history title="Discovery" characters="Newton" year="1687"\nStory here.\n:::')
    expect(html).toContain('edm-card edm-history')
    expect(html).toContain('edm-hist-who')
    expect(html).toContain('Newton')
    expect(html).toContain('1687')
  })

  it('renders :::hero block', () => {
    const source = `:::hero
title: "Test Chapter"
subject: "Physics"
level: "Undergraduate"
author: "Dr. Test"
- Topic 1
- Topic 2
:::

# Content`
    const html = decode(source)
    expect(html).toContain('edm-hero')
    expect(html).toContain('edm-hero-title')
    expect(html).toContain('Test Chapter')
    expect(html).toContain('edm-hero-badge')
    expect(html).toContain('Physics')
    expect(html).toContain('edm-hero-topics')
    expect(html).toContain('Topic 1')
  })
})
