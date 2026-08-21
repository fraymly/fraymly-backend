import { AppError } from '../utils/errors.js'
import {
  createExport,
  deleteExport,
  findExports,
  getExport,
  updateExport,
} from '../repositories/exports.repository.js'

export async function createWorkspaceExport(data) {
  return createExport(data)
}

export async function listWorkspaceExports(filter = {}) {
  return findExports(filter, { sort: { createdAt: -1 } })
}

export async function getWorkspaceExport(exportId) {
  const exportDoc = await getExport(exportId)
  if (!exportDoc) {
    throw new AppError('Export not found', 404)
  }

  return exportDoc
}

export async function updateWorkspaceExport(exportId, updates) {
  const exportDoc = await updateExport(exportId, updates)
  if (!exportDoc) {
    throw new AppError('Export not found', 404)
  }

  return exportDoc
}

export async function deleteWorkspaceExport(exportId) {
  return deleteExport(exportId)
}

