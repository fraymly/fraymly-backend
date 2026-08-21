import {
  listWorkspaceExports,
  getWorkspaceExport,
  updateWorkspaceExport,
  deleteWorkspaceExport,
} from '../services/exports.service.js'
import * as storageService from '../services/storage.service.js'
import { AppError } from '../utils/errors.js'
import { sendSuccess } from '../utils/api.js'
import { asyncHandler } from '../utils/async-handler.js'
import { findProjects } from '../repositories/projects.repository.js'

export const listExports = asyncHandler(async (req, res) => {
  let filter;
  if (req.query.projectId) {
    filter = { projectId: req.query.projectId }
  } else {
    const userProjects = await findProjects({ ownerId: req.auth.sub })
    const projectIds = userProjects.map(p => p._id)
    filter = {
      $or: [
        { ownerId: req.auth.sub },
        { projectId: { $in: projectIds } }
      ]
    }
  }
  const exports = await listWorkspaceExports(filter)
  
  // Resolve signed/download URLs for each export to let the browser play it directly
  const resolvedExports = await Promise.all(exports.map(async (item) => {
    try {
      const { downloadUrl } = await storageService.getDownloadUrl(item.outputPath)
      return { ...item, downloadUrl }
    } catch (e) {
      return item
    }
  }))

  return sendSuccess(res, 'Exports loaded', { exports: resolvedExports })
})

export const getExport = asyncHandler(async (req, res) => {
  const item = await getWorkspaceExport(req.params.exportId)
  return sendSuccess(res, 'Export loaded', { item })
})

export const updateExport = asyncHandler(async (req, res) => {
  const item = await updateWorkspaceExport(req.params.exportId, req.body)
  return sendSuccess(res, 'Export updated', { item })
})

export const deleteExport = asyncHandler(async (req, res) => {
  await deleteWorkspaceExport(req.params.exportId)
  return sendSuccess(res, 'Export deleted', {})
})

export async function handleDownloadExport(req, res, next) {
  try {
    const { exportId } = req.params
    const item = await getWorkspaceExport(exportId)

    if (!item) {
      throw new AppError('Export not found', 404)
    }

    const range = req.headers.range
    const isDownload = req.query.download === 'true'

    if (isDownload) {
      const safeTitle = (item.title || 'short').replace(/[^a-zA-Z0-9._-]+/g, '_')
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.mp4"`)
    }

    if (range) {
      // Get the file stream metadata/size using a quick metadata stream read
      const { size: totalSize } = await storageService.getGcsFileStream(item.outputPath, { start: 0, end: 0 })
      
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1

      const chunksize = (end - start) + 1
      const { stream, contentType } = await storageService.getGcsFileStream(item.outputPath, { start, end })

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      })

      stream.pipe(res)
    } else {
      const { stream, size, contentType } = await storageService.getGcsFileStream(item.outputPath)

      res.writeHead(200, {
        'Content-Length': size,
        'Content-Type': contentType,
      })

      stream.pipe(res)
    }
  } catch (err) {
    next(err)
  }
}