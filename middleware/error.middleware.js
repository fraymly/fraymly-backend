import { AppError } from '../utils/errors.js'

export function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  })
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error)
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    })
  }

  console.error(error)

  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  })
}

