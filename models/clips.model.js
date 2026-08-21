import { v4 as uuidv4 } from 'uuid'
import { createCollectionModel } from './base.model.js'

const clips = createCollectionModel('clips', { createId: uuidv4 })

export const createClip = (data) => clips.create(data)
export const createClips = (data) => clips.createMany(data)
export const getClip = (id) => clips.findById(id)
export const findClip = (filter) => clips.findOne(filter)
export const findClips = (filter = {}, options = {}) => clips.find(filter, options)
export const updateClip = (id, updates) => clips.updateById(id, updates)
export const deleteClip = (id) => clips.deleteById(id)

