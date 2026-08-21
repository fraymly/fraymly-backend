const hits = new Map()

export function createRateLimit({ windowMs = 60_000, limit = 120 } = {}) {
  return (req, res, next) => {
    const key = req.ip ?? 'anonymous'
    const now = Date.now()
    const bucket = hits.get(key) ?? []
    const active = bucket.filter((timestamp) => now - timestamp < windowMs)

    active.push(now)
    hits.set(key, active)

    if (active.length > limit) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests',
      })
    }

    next()
  }
}

