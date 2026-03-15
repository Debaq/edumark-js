import { describe, it, expect } from 'vitest'
import { parseImageFields } from '../../src/blocks/image.js'

describe('parseImageFields', () => {
  it('parses image fields', () => {
    const content = `file: animal_cell.jpg
title: "Typical animal cell"
description: "Electron micrograph showing nucleus."
source: "Alberts et al., 6th ed."
alt: "Animal cell"`

    const result = parseImageFields(content)
    expect(result.file).toBe('animal_cell.jpg')
    expect(result.title).toBe('Typical animal cell')
    expect(result.alt).toBe('Animal cell')
    expect(result.source).toContain('Alberts')
  })

  it('parses unquoted values', () => {
    const result = parseImageFields('file: image.png')
    expect(result.file).toBe('image.png')
  })
})
