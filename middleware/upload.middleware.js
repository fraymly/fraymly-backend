import multer from 'multer'
import path from 'node:path'
import { env } from '../config/env.js' 
import { ensureDirectory } from '../utils/paths.js'

const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const folder = path.join(env.uploadDir, 'videos')
    await ensureDirectory(folder)
    cb(null, folder)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_')}`
    cb(null, uniqueName)
  },
})

export const uploadVideo = multer({
  storage,
  limits: {
    fileSize: 1_000_000_000,
  },
  fileFilter: (req, file, cb) => {
    const allowed = file.mimetype.startsWith('video/')
    cb(allowed ? null : new Error('Only video files are allowed'), allowed)
  },
})

const exportStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    if (!req.body.workflowRunId) {
      return cb(new Error('workflowRunId is required in the request body'))
    }
    const folder = path.join(env.uploadDir, 'workflow-runs', req.body.workflowRunId)
    await ensureDirectory(folder)
    cb(null, folder)
  },
  filename: (req, file, cb) => {
    // Use the filename provided by the AI service if available, otherwise generate one
    const uniqueName = file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '_')
    cb(null, uniqueName)
  },
})

export const uploadExport = multer({
  storage: exportStorage,
  limits: {
    fileSize: 1_000_000_000, // 1GB limit for exported clips
  },
})
