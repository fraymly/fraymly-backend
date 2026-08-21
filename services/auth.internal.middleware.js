import { env } from '../config/env.js'

export function requireInternalAuth(req, res, next) {
  const internalSecret = req.headers['x-internal-api-secret']

  if (!internalSecret || internalSecret !== env.internalApiSecret) {
    return res.status(403).json({
      success: false,
      message: 'Forbidden',
    })
  }

  next()
}