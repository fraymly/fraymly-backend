import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/api.js'
import {
  deleteWorkspaceClip,
  getWorkspaceClip,
  listWorkspaceClips,
  updateWorkspaceClip,
} from '../services/clips.service.js'

export const listClips = asyncHandler(async (req, res) => {
  const filter = req.query.jobId
    ? { jobId: req.query.jobId }
    : req.query.projectId
      ? { projectId: req.query.projectId }
      : { ownerId: req.auth.sub }

  const clips = await listWorkspaceClips(filter)
  return sendSuccess(res, 'Clips loaded', { clips })
})

export const getClip = asyncHandler(async (req, res) => {
  const clip = await getWorkspaceClip(req.params.clipId)
  return sendSuccess(res, 'Clip loaded', { clip })
})

export const updateClip = asyncHandler(async (req, res) => {
  const clip = await updateWorkspaceClip(req.params.clipId, req.body)
  return sendSuccess(res, 'Clip updated', { clip })
})

export const deleteClip = asyncHandler(async (req, res) => {
  await deleteWorkspaceClip(req.params.clipId)
  return sendSuccess(res, 'Clip deleted', {})
})

