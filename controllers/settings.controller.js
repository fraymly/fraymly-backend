import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/api.js'
import {
  getWorkspaceSettings,
  updateWorkspaceSettings,
} from '../services/settings.service.js'

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await getWorkspaceSettings(req.auth.sub)
  return sendSuccess(res, 'Settings loaded', { settings })
})

export const updateSettings = asyncHandler(async (req, res) => {
  const settings = await updateWorkspaceSettings(req.auth.sub, req.body)
  return sendSuccess(res, 'Settings updated', { settings })
})

