import { v4 as uuidv4 } from 'uuid'
import { createCollectionModel } from './base.model.js'

const workflows = createCollectionModel('workflows', { createId: uuidv4 })

export const createWorkflow = (data) => workflows.create(data)
export const createWorkflows = (data) => workflows.createMany(data)
export const getWorkflow = (id) => workflows.findById(id)
export const findWorkflow = (filter) => workflows.findOne(filter)
export const findWorkflows = (filter = {}, options = {}) => workflows.find(filter, options)
export const updateWorkflow = (id, updates) => workflows.updateById(id, updates)
export const deleteWorkflow = (id) => workflows.deleteById(id)

