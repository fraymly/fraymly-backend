export class AppError extends Error {
  constructor(message, statusCode = 400, details = undefined) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.details = details
  }
}

export const notFoundError = (message = 'Resource not found') => new AppError(message, 404)

