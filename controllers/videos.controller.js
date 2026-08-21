import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/api.js'
import {
  deleteWorkspaceVideo,
  getWorkspaceVideo,
  listWorkspaceVideos,
  updateWorkspaceVideo,
} from '../services/videos.service.js'

export const listVideos = asyncHandler(async (req, res) => {
  const filter = req.query.projectId ? { projectId: req.query.projectId } : { ownerId: req.auth.sub }
  const videos = await listWorkspaceVideos(filter)
  return sendSuccess(res, 'Videos loaded', { videos })
})

export const getVideo = asyncHandler(async (req, res) => {
  const video = await getWorkspaceVideo(req.params.videoId)
  return sendSuccess(res, 'Video loaded', { video })
})

export const updateVideo = asyncHandler(async (req, res) => {
  const video = await updateWorkspaceVideo(req.params.videoId, req.body)
  return sendSuccess(res, 'Video updated', { video })
})

export const deleteVideo = asyncHandler(async (req, res) => {
  await deleteWorkspaceVideo(req.params.videoId)
  return sendSuccess(res, 'Video deleted', {})
})

