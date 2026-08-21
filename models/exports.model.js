import { v4 as uuidv4 } from 'uuid'
import { createCollectionModel } from './base.model.js'

const exportsCollection = createCollectionModel('exports', { createId: uuidv4 })

export const createExport = (data) => exportsCollection.create(data)
export const getExport = (id) => exportsCollection.findById(id)
export const findExport = (filter) => exportsCollection.findOne(filter)
export const findExports = (filter = {}, options = {}) => exportsCollection.find(filter, options)
export const updateExport = (id, updates) => exportsCollection.updateById(id, updates)
export const deleteExport = (id) => exportsCollection.deleteById(id)

