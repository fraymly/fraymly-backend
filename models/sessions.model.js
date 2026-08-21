import { v4 as uuidv4 } from 'uuid'
import { createCollectionModel } from './base.model.js'

const sessions = createCollectionModel('sessions', { createId: uuidv4 })

export const createSession = (data) => sessions.create(data)
export const getSession = (id) => sessions.findById(id)
export const findSession = (filter) => sessions.findOne(filter)
export const findSessions = (filter = {}, options = {}) => sessions.find(filter, options)
export const updateSession = (id, updates) => sessions.updateById(id, updates)
export const deleteSession = (id) => sessions.deleteById(id)

