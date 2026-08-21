import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/api.js'
import {
  createShortsJob,
  deleteWorkspaceJob,
  getWorkspaceJob,
  listWorkspaceJobs,
  retryWorkspaceJob,
} from '../services/jobs.service.js'

export const createShorts = asyncHandler(async (req, res) => {
  const result = await createShortsJob({
    ownerId: req.auth.sub,
    file: req.file,
    projectName: req.body.projectName,
    projectDescription: req.body.projectDescription,
    shortCount: req.body.shortCount,
    targetDuration: req.body.targetDuration,
    aspectRatio: req.body.aspectRatio,
    tone: req.body.tone,
  })

  return sendSuccess(res, 'Shorts job created', result, 201)
})

export const listJobs = asyncHandler(async (req, res) => {
  const jobs = await listWorkspaceJobs({ ownerId: req.auth.sub })
  return sendSuccess(res, 'Jobs loaded', { jobs })
})

export const getJob = asyncHandler(async (req, res) => {
  const job = await getWorkspaceJob(req.params.jobId)
  return sendSuccess(res, 'Job loaded', job)
})

export const retryJob = asyncHandler(async (req, res) => {
  const job = await retryWorkspaceJob(req.params.jobId)
  return sendSuccess(res, 'Job retried', { job })
})

export const deleteJob = asyncHandler(async (req, res) => {
  await deleteWorkspaceJob(req.params.jobId)
  return sendSuccess(res, 'Job deleted', {})
})

