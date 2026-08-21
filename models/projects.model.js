import { v4 as uuidv4 } from 'uuid'
import { createCollectionModel } from './base.model.js'

const projects = createCollectionModel('projects', { createId: uuidv4 })

export const createProject = (data) => projects.create(data)
export const getProject = (id) => projects.findById(id)
export const findProject = (filter) => projects.findOne(filter)
export const findProjects = (filter = {}, options = {}) => projects.find(filter, options)
export const updateProject = (id, updates) => projects.updateById(id, updates)
export const deleteProject = (id) => projects.deleteById(id)
export const countProjects = (filter = {}) => projects.count(filter)

