import { Router } from 'express'
import { getEditorProject, updateEditorClip } from '../controllers/editor.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validateUuidParam } from '../middleware/validate.middleware.js'

const router = Router()

router.use(requireAuth)

router.get('/projects/:projectId', validateUuidParam('projectId'), getEditorProject)
router.patch('/clips/:clipId', validateUuidParam('clipId'), updateEditorClip)

export default router