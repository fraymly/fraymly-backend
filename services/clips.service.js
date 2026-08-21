import { AppError } from '../utils/errors.js'
import {
  createClip,
  createClips,
  deleteClip,
  findClips,
  getClip,
  updateClip,
} from '../repositories/clips.repository.js'

export async function createWorkspaceClip(data) {
  return createClip(data)
}

export async function createWorkspaceClips(data) {
  return createClips(data)
}

export async function listWorkspaceClips(filter = {}) {
  return findClips(filter, { sort: { index: 1, createdAt: -1 } })
}

export async function getWorkspaceClip(clipId) {
  const clip = await getClip(clipId)
  if (!clip) {
    throw new AppError('Clip not found', 404)
  }

  return clip
}

export async function updateWorkspaceClip(clipId, updates) {
  const clip = await updateClip(clipId, updates)
  if (!clip) {
    throw new AppError('Clip not found', 404)
  }

  return clip
}

export async function deleteWorkspaceClip(clipId) {
  return deleteClip(clipId)
}

