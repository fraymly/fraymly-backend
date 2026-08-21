import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/api.js'
import { loginOrProvisionUser, getCurrentUser } from '../services/auth.service.js'

export const login = asyncHandler(async (req, res) => {
  const result = await loginOrProvisionUser(req.body)
  return sendSuccess(res, 'Authentication successful', result)
})

export const me = asyncHandler(async (req, res) => {
  const user = await getCurrentUser(req.auth.sub)
  return sendSuccess(res, 'Current user loaded', { user })
})

