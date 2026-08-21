import { Router } from 'express'
import {
  deleteVideo,
  getVideo,
  listVideos,
  updateVideo,
} from '../controllers/videos.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validateUuidParam } from '../middleware/validate.middleware.js'

const router = Router()

router.use(requireAuth)

router.get('/', listVideos)
router.get('/:videoId', validateUuidParam('videoId'), getVideo)
router.patch('/:videoId', validateUuidParam('videoId'), updateVideo)
router.delete('/:videoId', validateUuidParam('videoId'), deleteVideo)

export default router

