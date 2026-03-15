export class EdumarkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EdumarkError'
  }
}

export class ParseError extends EdumarkError {
  constructor(message: string, public line?: number) {
    super(line !== undefined ? `Line ${line}: ${message}` : message)
    this.name = 'ParseError'
  }
}

export class IncludeError extends EdumarkError {
  constructor(message: string, public path?: string) {
    super(path ? `Include "${path}": ${message}` : message)
    this.name = 'IncludeError'
  }
}

export class RefError extends EdumarkError {
  constructor(message: string, public refId?: string) {
    super(refId ? `Ref "${refId}": ${message}` : message)
    this.name = 'RefError'
  }
}
