import { describe, it, expect } from 'vitest'
import { parseQuestion } from '../../src/blocks/question.js'

describe('parseQuestion', () => {
  it('parses choice question', () => {
    const content = `What is the SI unit for force?

~ Joule # That's energy
~ Watt # That's power
= Newton # Correct
~ Pascal # That's pressure`

    const result = parseQuestion(content, 'choice')
    expect(result.stem).toBe('What is the SI unit for force?')
    expect(result.options).toHaveLength(4)
    expect(result.options[2].correct).toBe(true)
    expect(result.options[2].text).toBe('Newton')
    expect(result.options[2].feedback).toBe('Correct')
    expect(result.options[0].correct).toBe(false)
  })

  it('parses multiple-correct choice question', () => {
    const content = `Which are vector quantities?

= Velocity # Correct
~ Mass # Scalar
= Force # Correct`

    const result = parseQuestion(content, 'choice')
    const correct = result.options.filter(o => o.correct)
    expect(correct).toHaveLength(2)
  })

  it('parses true-false question', () => {
    const content = `Light speed depends on frequency.

= false # Speed of light is constant`

    const result = parseQuestion(content, 'true-false')
    expect(result.answers).toEqual(['false'])
  })

  it('parses open question with model answer', () => {
    const content = `Why are metals good conductors?

= Metals have delocalized electrons that flow freely.`

    const result = parseQuestion(content, 'open')
    expect(result.stem).toBe('Why are metals good conductors?')
    expect(result.answers).toHaveLength(1)
    expect(result.answers[0]).toContain('delocalized electrons')
  })

  it('parses case question with multiple answers', () => {
    const content = `A car brakes on 40m.

a) Speed?
b) Over limit?

= a) v = 84.3 km/h
= b) Yes, exceeding by 24.3 km/h`

    const result = parseQuestion(content, 'case')
    expect(result.answers).toHaveLength(2)
  })
})
