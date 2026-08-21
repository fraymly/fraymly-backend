import { v4 as uuidv4 } from 'uuid'
import { createCollectionModel } from './base.model.js'

const workflowRuns = createCollectionModel('workflow_runs', { createId: uuidv4 })

export const createWorkflowRun = (data) => workflowRuns.create(data)
export const getWorkflowRun = (id) => workflowRuns.findById(id)
export const findWorkflowRun = (filter) => workflowRuns.findOne(filter)
export const findWorkflowRuns = (filter = {}, options = {}) => workflowRuns.find(filter, options)
export const updateWorkflowRun = (id, updates) => workflowRuns.updateById(id, updates)
export const deleteWorkflowRun = (id) => workflowRuns.deleteById(id)