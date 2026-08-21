import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/api.js'
import { getProjectDashboard } from '../services/projects.service.js'
import { updateWorkspaceClip } from '../services/clips.service.js'

export const getEditorProject = asyncHandler(async (req, res) => {
  const project = await getProjectDashboard(req.params.projectId)
  return sendSuccess(res, 'Editor data loaded', project)
})

export const updateEditorClip = asyncHandler(async (req, res) => {
  const clip = await updateWorkspaceClip(req.params.clipId, req.body)
  return sendSuccess(res, 'Editor clip updated', { clip })
})

