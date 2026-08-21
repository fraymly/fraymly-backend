import dotenv from 'dotenv'

dotenv.config()

const toNumber = (value, fallback) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: toNumber(process.env.PORT, 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017',
  mongoDbName: process.env.MONGODB_DB_NAME ?? 'fraymlyDB',
  jwtSecret: process.env.JWT_SECRET ?? 'fraymly-development-secret',
  internalApiSecret: process.env.INTERNAL_API_SECRET ?? 'fraymly-internal-secret',
  uploadDir: process.env.UPLOAD_DIR ?? new URL('../uploads/', import.meta.url).pathname,
  ffmpegPath: process.env.FFMPEG_PATH ?? 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH ?? 'ffprobe',
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  openaiModel: process.env.OPENAI_MODEL ?? 'gpt-5.4-nano',
  aiServiceUrl: process.env.AI_SERVICE_URL ?? 'http://localhost:8000',
  apiUrl: process.env.API_URL ?? 'http://localhost:4000/api/internal',
  redisUrl: process.env.REDIS_URL ?? '',
  storageDriver: process.env.STORAGE_DRIVER ?? 'gcs',
  gcsBucketName: process.env.GCS_BUCKET_NAME ?? ''
}