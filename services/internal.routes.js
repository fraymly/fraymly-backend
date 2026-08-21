import { Router } from 'express'
import { requireInternalAuth } from './auth.internal.middleware.js'
import { createWorkflowExport } from '../services/workflows.service.js'
import { AppError } from '../utils/errors.js'
import { uploadExport } from '../middleware/upload.middleware.js'
import { sendSuccess } from '../utils/api.js'
import { toPublicStoragePath } from '../utils/paths.js'
import { updateWorkflowRun, getWorkflowRun } from '../repositories/workflow-runs.repository.js'
import { emitSocketEvent } from './socket.service.js'
import { commitFile } from './storage.service.js'
import { unlink } from 'node:fs/promises'

const router = Router()

router.use(requireInternalAuth)

router.get('/workflows/runs/:runId', async (req, res, next) => {
  try {
    const run = await getWorkflowRun(req.params.runId)
    if (!run) {
      throw new AppError('Workflow run not found', 404)
    }
    return sendSuccess(res, 'Workflow run loaded', { run })
  } catch (err) {
    next(err)
  }
})

router.patch('/workflows/runs/:runId/state', async (req, res, next) => {
  try {
    const run = await updateWorkflowRun(req.params.runId, req.body)
    if (!run) {
      throw new AppError('Workflow run not found', 404)
    }
    emitSocketEvent('workflow-runs:updated', { run })
    return sendSuccess(res, 'Workflow run updated', { run })
  } catch (err) {
    next(err)
  }
})

router.post('/exports', uploadExport.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400)
    }
    const { storagePath } = await commitFile(req.file.path)
    const payload = {
      ...req.body, // Contains projectId, videoId, etc.
      outputPath: storagePath,
      outputUrl: storagePath, // Handled by /storage endpoint if needed, or getDownloadUrl
    }
    const item = await createWorkflowExport(payload)
    
    // Cleanup temporary file
    await unlink(req.file.path).catch(() => {})

    return sendSuccess(res, 'Export created', { item })
  } catch (err) {
    next(err)
  }
})

export default router