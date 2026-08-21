import { Router } from 'express'
import {
  deleteClip,
  getClip,
  listClips,
  updateClip,
} from '../controllers/clips.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validateUuidParam } from '../middleware/validate.middleware.js'

const router = Router()

router.use(requireAuth)

router.get('/', listClips)
router.get('/:clipId', validateUuidParam('clipId'), getClip)
router.patch('/:clipId', validateUuidParam('clipId'), updateClip)
router.delete('/:clipId', validateUuidParam('clipId'), deleteClip)

export default router

