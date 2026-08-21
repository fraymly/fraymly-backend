import { Router } from 'express'
import {
  deleteExport,
  listExports,
  getExport,
  updateExport,
  handleDownloadExport,
} from '../controllers/exports.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validateUuidParam } from '../middleware/validate.middleware.js'

const router = Router()

router.use(requireAuth)

router.get('/', listExports)
router.get('/:exportId', validateUuidParam('exportId'), getExport)
router.patch('/:exportId', validateUuidParam('exportId'), updateExport)
router.delete('/:exportId', validateUuidParam('exportId'), deleteExport)
// New route to handle downloading an exported file
router.get('/:exportId/download', handleDownloadExport)

export default router
