import { MongoClient } from 'mongodb'
import { env } from '../config/env.js'

const client = new MongoClient(env.mongoUri)

let db

export async function connectMongo() {
  if (!db) {
    await client.connect()
    db = client.db(env.mongoDbName)
  }

  return db
}

export function getDb() {
  if (!db) {
    throw new Error('MongoDB has not been connected yet.')
  }

  return db
}

export function getCollection(name) {
  return getDb().collection(name)
}

export async function closeMongo() {
  await client.close()
  db = undefined
}