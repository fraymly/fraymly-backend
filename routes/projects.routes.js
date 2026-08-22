import { Router } from 'express'
import * as projectController from '../controllers/projects.controller.js'
import * as workflowController from '../controllers/workflows.controller.js'
import { uploadVideo } from '../middleware/upload.middleware.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

// All project routes should be protected
router.use(requireAuth)

// Project routes
router.get('/', projectController.listProjects)
router.post('/signed-upload-url', projectController.requestSignedUploadUrl)
router.post('/', uploadVideo.single('video'), projectController.createProject)
router.get('/:projectId', projectController.getProject)
router.patch('/:projectId', projectController.updateProject)
router.delete('/:projectId', projectController.deleteProject)

// Project-specific workflow routes
router.get('/:projectId/workflows', workflowController.handleListProjectWorkflows)
router.post('/:projectId/workflows', workflowController.handleAddWorkflowToProject)
router.get('/:projectId/workflows/runs', workflowController.handleListProjectWorkflowRuns)
router.get('/:projectId/workflows/runs/:runId', workflowController.handleGetProjectWorkflowRun)
router.delete('/:projectId/workflows/:workflowId', workflowController.handleDeleteProjectWorkflow)
router.delete('/:projectId/workflows/runs/:runId', workflowController.handleStopProjectWorkflowRun)
router.post('/:projectId/workflows/runs/:runId/pause', workflowController.handlePauseProjectWorkflowRun)
router.post('/:projectId/workflows/runs/:runId/resume', workflowController.handleResumeProjectWorkflowRun)
router.post('/:projectId/workflows/:workflowId/run', workflowController.handleRunProjectWorkflow)

export default router