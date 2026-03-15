import { describe, it, expect } from 'vitest'
import { decode } from '../../src/index.js'

describe('inline ref plugin', () => {
  it('renders a simple ref', () => {
    const html = decode('See ref{my-id}.')
    expect(html).toContain('<a href="#my-id" class="edm-ref">my-id</a>')
  })

  it('renders a ref with custom text', () => {
    const html = decode('See ref{my-id the thing}.')
    expect(html).toContain('<a href="#my-id" class="edm-ref">the thing</a>')
  })

  it('renders a cross-file ref', () => {
    const html = decode('See ref{ch02.edm#block-id}.')
    expect(html).toContain('href="ch02.edm#block-id"')
  })

  it('renders a cross-file ref with text', () => {
    const html = decode('See ref{ch02.edm#block-id custom text}.')
    expect(html).toContain('href="ch02.edm#block-id"')
    expect(html).toContain('>custom text</a>')
  })
})
