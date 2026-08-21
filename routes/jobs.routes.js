import { Router } from 'express'
import {
  createShorts,
  deleteJob,
  getJob,
  listJobs,
  retryJob,
} from '../controllers/jobs.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validateUuidParam } from '../middleware/validate.middleware.js'
import { uploadVideo } from '../middleware/upload.middleware.js'

const router = Router()

router.use(requireAuth)

router.get('/', listJobs)
router.post('/shorts', uploadVideo.single('video'), createShorts)
router.get('/:jobId', validateUuidParam('jobId'), getJob)
router.post('/:jobId/retry', validateUuidParam('jobId'), retryJob)
router.delete('/:jobId', validateUuidParam('jobId'), deleteJob)

export default router

