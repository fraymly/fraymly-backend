import { v4 as uuidv4 } from 'uuid'
import { createCollectionModel } from './base.model.js'

const videos = createCollectionModel('videos', { createId: uuidv4 })

export const createVideo = (data) => videos.create(data)
export const getVideo = (id) => videos.findById(id)
export const findVideo = (filter) => videos.findOne(filter)
export const findVideos = (filter = {}, options = {}) => videos.find(filter, options)
export const updateVideo = (id, updates) => videos.updateById(id, updates)
export const deleteVideo = (id) => videos.deleteById(id)

