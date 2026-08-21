import { v4 as uuidv4 } from 'uuid'
import { createCollectionModel } from './base.model.js'

const users = createCollectionModel('users', { createId: uuidv4 })

export const createUser = (data) => users.create(data)
export const createUsers = (data) => users.createMany(data)
export const getUser = (id) => users.findById(id)
export const findUser = (filter) => users.findOne(filter)
export const findUsers = (filter = {}, options = {}) => users.find(filter, options)
export const updateUser = (id, updates) => users.updateById(id, updates)
export const deleteUser = (id) => users.deleteById(id)
export const findUserByEmail = (email) => users.findOne({ email: email.toLowerCase() })
export const countUsers = (filter = {}) => users.count(filter)

