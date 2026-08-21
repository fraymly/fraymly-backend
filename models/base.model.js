import { getCollection } from '../database/mongodb.js'

const nowIso = () => new Date().toISOString()

export function createCollectionModel(collectionName, { createId }) {
  const collection = () => getCollection(collectionName)

  const normalize = (document = {}) => {
    const now = nowIso()
    const id = document._id ?? createId()

    return {
      ...document,
      _id: id,
      createdAt: document.createdAt ?? now,
      updatedAt: document.updatedAt ?? now,
    }
  }

  return {
    async create(document) {
      const record = normalize(document)
      await collection().insertOne(record)
      return record
    },
    async createMany(documents) {
      const records = documents.map((document) => normalize(document))
      if (records.length === 0) {
        return []
      }

      await collection().insertMany(records)
      return records
    },
    async findById(id) {
      return collection().findOne({ _id: id })
    },
    async findOne(filter = {}) {
      return collection().findOne(filter)
    },
    async find(filter = {}, options = {}) {
      const cursor = collection().find(filter)

      if (options.sort) {
        cursor.sort(options.sort)
      }

      if (Number.isFinite(options.limit)) {
        cursor.limit(options.limit)
      }

      if (Number.isFinite(options.skip)) {
        cursor.skip(options.skip)
      }

      return cursor.toArray()
    },
    async updateById(id, updates = {}) {
      const payload = {
        ...updates,
        updatedAt: nowIso(),
      }

      await collection().updateOne({ _id: id }, { $set: payload })
      return collection().findOne({ _id: id })
    },
    async updateOne(filter = {}, updates = {}) {
      const payload = {
        ...updates,
        updatedAt: nowIso(),
      }

      await collection().updateOne(filter, { $set: payload })
      return collection().findOne(filter)
    },
    async deleteById(id) {
      return collection().deleteOne({ _id: id })
    },
    async deleteMany(filter = {}) {
      return collection().deleteMany(filter)
    },
    async count(filter = {}) {
      return collection().countDocuments(filter)
    },
  }
}

