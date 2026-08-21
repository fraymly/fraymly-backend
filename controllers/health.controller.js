import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/api.js'

export const health = asyncHandler(async (req, res) => {
  return sendSuccess(res, 'fraymly API is healthy', {
    service: 'fraymly-backend',
    timestamp: new Date().toISOString(),
  })
})

