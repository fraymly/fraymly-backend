import http from 'node:http'
import path from 'node:path'
import { Server } from 'socket.io'
import { createApp } from './app.js'
import { connectMongo } from './database/mongodb.js'
import { env } from './config/env.js'
import { ensureDirectory } from './utils/paths.js'
import { setSocketServer } from './services/socket.service.js'

const AI_SERVICE_HOST = new URL(env.aiServiceUrl).origin
const AI_SERVICE_HEALTH = `${AI_SERVICE_HOST}/health`

async function waitForAIService(timeoutMs = 30000, intervalMs = 500) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(AI_SERVICE_HEALTH)
      if (res.ok) {
        return true
      }
    } catch (err) {
      // ignore until ready
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }
  throw new Error(`AI service did not become available at ${AI_SERVICE_HEALTH}`)
}

async function start() {
  try {
    console.log('Waiting for AI service to be available...')
    await waitForAIService()
    console.log('AI service is available')
  } catch (error) {
    throw error
  }
  await connectMongo()
  await ensureDirectory(path.resolve(env.uploadDir))
  await ensureDirectory(path.join(env.uploadDir, 'videos'))
  await ensureDirectory(path.join(env.uploadDir, 'clips'))

  const app = createApp()
  const server = http.createServer(app)
  const io = new Server(server, {
    cors: {
      origin: env.clientOrigin,
      credentials: true,
    },
  })

  setSocketServer(io)

  io.on('connection', (socket) => {
    socket.emit('connected', {
      success: true,
      message: 'Socket connected',
      data: {
        socketId: socket.id,
      },
    })
  })

  server.listen(env.port, () => {
    console.log(`fraymly API listening on port ${env.port}`)
  })
}

start().catch((error) => {
  console.error(error)
  process.exit(1)
})