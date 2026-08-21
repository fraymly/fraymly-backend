import { Router } from 'express'
import * as controller from '../controllers/workflows.controller.js'

const router = Router()

// Route to get all workflow templates
router.get('/', controller.handleListAllWorkflows)

// Route to create a new workflow template
router.post('/', controller.handleCreateWorkflow)

// Route to get a single workflow template by ID
router.get('/:workflowId', controller.handleGetWorkflow)

// Route to update a workflow template
router.patch('/:workflowId', controller.handleUpdateWorkflow)

// Route to delete a workflow template
router.delete('/:workflowId', controller.handleDeleteWorkflow)

export default router