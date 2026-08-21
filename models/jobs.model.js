import { v4 as uuidv4 } from 'uuid'
import { createCollectionModel } from './base.model.js'

const jobs = createCollectionModel('jobs', { createId: uuidv4 })

export const createJob = (data) => jobs.create(data)
export const getJob = (id) => jobs.findById(id)
export const findJob = (filter) => jobs.findOne(filter)
export const findJobs = (filter = {}, options = {}) => jobs.find(filter, options)
export const updateJob = (id, updates) => jobs.updateById(id, updates)
export const deleteJob = (id) => jobs.deleteById(id)

