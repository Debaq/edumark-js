import type { QuestionOption } from '../types.js'

/**
 * Parse question block content based on type.
 * Handles GIFT-style markers: = (correct), ~ (incorrect), # (feedback)
 */
export function parseQuestion(content: string, type: string): {
  stem: string
  options: QuestionOption[]
  answers: string[]
} {
  const lines = content.split('\n')
  const stemLines: string[] = []
  const options: QuestionOption[] = []
  const answers: string[] = []
  let inOptions = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (!inOptions) stemLines.push('')
      continue
    }

    if (trimmed.startsWith('=') || trimmed.startsWith('~')) {
      inOptions = true

      if (type === 'open' || type === 'case') {
        // Model answer: = text
        if (trimmed.startsWith('=')) {
          answers.push(trimmed.slice(1).trim())
        }
        continue
      }

      if (type === 'true-false') {
        // = true/false # feedback
        if (trimmed.startsWith('=')) {
          const feedbackMatch = trimmed.match(/^=\s*(.+?)\s*(?:#\s*(.+))?$/)
          if (feedbackMatch) {
            answers.push(feedbackMatch[1].trim())
            if (feedbackMatch[2]) {
              options.push({
                correct: true,
                text: feedbackMatch[1].trim(),
                feedback: feedbackMatch[2].trim(),
              })
            }
          }
        }
        continue
      }

      // Choice question
      const correct = trimmed.startsWith('=')
      const rest = trimmed.slice(1).trim()

      // Split on # for feedback
      const feedbackIdx = rest.indexOf('#')
      let text: string
      let feedback: string | undefined

      if (feedbackIdx !== -1) {
        text = rest.slice(0, feedbackIdx).trim()
        feedback = rest.slice(feedbackIdx + 1).trim()
      } else {
        text = rest
      }

      options.push({ correct, text, feedback })
    } else {
      if (!inOptions) {
        stemLines.push(trimmed)
      }
    }
  }

  return {
    stem: stemLines.join('\n').trim(),
    options,
    answers,
  }
}
