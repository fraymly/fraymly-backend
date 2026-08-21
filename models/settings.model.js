import { v4 as uuidv4 } from 'uuid'
import { createCollectionModel } from './base.model.js'

const settings = createCollectionModel('settings', { createId: uuidv4 })

export const createSettings = (data) => settings.create(data)
export const getSettings = (id) => settings.findById(id)
export const findSettings = (filter) => settings.findOne(filter)
export const findSettingsList = (filter = {}, options = {}) => settings.find(filter, options)
export const updateSettings = (id, updates) => settings.updateById(id, updates)
export const deleteSettings = (id) => settings.deleteById(id)

