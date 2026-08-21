import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? ''
  let token = header.startsWith('Bearer ') ? header.slice(7) : null

  // Fallback to token inside query string parameters to support native browser elements like <video> tags and standard download links
  if (!token && req.query.token) {
    token = req.query.token
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    })
  }

  try {
    req.auth = jwt.verify(token, env.jwtSecret)
    next()
  } catch {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
    })
  }
}

