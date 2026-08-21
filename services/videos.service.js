import { AppError } from '../utils/errors.js'
import {
  createVideo,
  deleteVideo,
  findVideos,
  getVideo,
  updateVideo,
} from '../repositories/videos.repository.js'

export async function createWorkspaceVideo(data) {
  return createVideo(data)
}

export async function listWorkspaceVideos(filter = {}) {
  return findVideos(filter, { sort: { createdAt: -1 } })
}

export async function getWorkspaceVideo(videoId) {
  const video = await getVideo(videoId)
  if (!video) {
    throw new AppError('Video not found', 404)
  }

  return video
}

export async function updateWorkspaceVideo(videoId, updates) {
  const video = await updateVideo(videoId, updates)
  if (!video) {
    throw new AppError('Video not found', 404)
  }

  return video
}

export async function deleteWorkspaceVideo(videoId) {
  return deleteVideo(videoId)
}

