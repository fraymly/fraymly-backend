import { validate as validateUuid } from 'uuid'

export function validateUuidParam(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName]

    if (!validateUuid(value)) {
      return res.status(400).json({
        success: false,
        message: `${paramName} must be a valid UUID`,
      })
    }

    next()
  }
}

export function requireFields(fields = []) {
  return (req, res, next) => {
    const missing = fields.filter((field) => {
      const value = req.body?.[field]
      return value === undefined || value === null || value === ''
    })

    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`,
      })
    }

    next()
  }
}

