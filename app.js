import express from 'express'
import cors from 'cors'
import path from 'node:path'
import { env } from './config/env.js'
import { requestLogger } from './middleware/logger.middleware.js'
import { createRateLimit } from './middleware/rate-limit.middleware.js' 
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import projectsRoutes from './routes/projects.routes.js'
import jobsRoutes from './routes/jobs.routes.js'
import videosRoutes from './routes/videos.routes.js'
import clipsRoutes from './routes/clips.routes.js'
import exportsRoutes from './routes/exports.routes.js'
import settingsRoutes from './routes/settings.routes.js'
import editorRoutes from './routes/editor.routes.js'
import workflowsRoutes from './routes/workflows.routes.js'
import internalRoutes from './services/internal.routes.js'

export function createApp() {
  const app = express()

  // Dynamic CORS configuration to allow local dev and production custom domains seamlessly
  const allowedOrigins = [
    env.clientOrigin,
    'https://www.fraymly.com',
    'https://fraymly.com',
    'http://localhost:5173'
  ].filter(Boolean)

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or server-to-server calls)
      if (!origin) return callback(null, true)

      const isAllowed = allowedOrigins.some(allowed => {
        if (allowed === '*') return true
        return allowed === origin || origin.endsWith('.fraymly.com')
      })

      if (isAllowed) {
        callback(null, true)
      } else {
        callback(null, false) // Fail gracefully instead of crashing
      }
    },
    credentials: true,
  }))

  app.use(express.json({ limit: '20mb' }))
  app.use(express.urlencoded({ extended: true, limit: '20mb' }))
  app.use(requestLogger)
  app.use(createRateLimit())
  app.use('/storage', express.static(path.resolve(env.uploadDir)))

  app.use('/api/health', healthRoutes)
  app.use('/api/auth', authRoutes)
  app.use('/api/projects', projectsRoutes)
  app.use('/api/jobs', jobsRoutes)
  app.use('/api/videos', videosRoutes)
  app.use('/api/clips', clipsRoutes)
  app.use('/api/exports', exportsRoutes)
  app.use('/api/settings', settingsRoutes)
  app.use('/api/editor', editorRoutes)
  app.use('/api/workflows', workflowsRoutes)
  app.use('/api/internal', internalRoutes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}