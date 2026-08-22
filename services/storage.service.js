import path from 'node:path'
import { access, mkdir } from 'node:fs/promises'
import { Storage } from '@google-cloud/storage'
import { env } from '../config/env.js'

let storage
if (env.storageDriver === 'gcs') {
  storage = new Storage()
}

/**
 * @typedef {'gcs'} StorageDriverType
 */

/**
 * Gets the configured storage driver.
 * @returns {StorageDriverType}
 */
function getDriver() {
  return 'gcs'
}

/**
 * Commits a file from a temporary path to its final destination in storage.
 * For a cloud driver, this would be the upload step.
 * @param {string} outputPath - The final path as determined by the AI service.
 * @returns {Promise<{storagePath: string}>}
 */
export async function commitFile(outputPath) {
  const driver = getDriver()

  if (driver === 'gcs') {
    const bucket = storage.bucket(env.gcsBucketName)
    const destination = path.relative(path.join(env.uploadDir, '..'), outputPath)
    await bucket.upload(outputPath, {
      destination,
    })
    return { storagePath: `gs://${env.gcsBucketName}/${destination}` }
  }

  throw new Error(`Unknown storage driver: ${driver}`)
}

/**
 * Gets a URL or path to download a file from storage.
 * @param {string} storagePath
 * @returns {Promise<{downloadUrl: string, isRedirect: boolean}>}
 */
export async function getDownloadUrl(storagePath) {
  const driver = getDriver()

  if (driver === 'gcs') {
    const bucketName = env.gcsBucketName
    const fileName = storagePath.replace(`gs://${bucketName}/`, '')
    try {
      const [signedUrl] = await storage
        .bucket(bucketName)
        .file(fileName)
        .getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          cname: 'https://cdn.fraymly.com',
        })
      return { downloadUrl: signedUrl, isRedirect: true }
    } catch (err) {
      if (err.message.includes('client_email')) {
        // Suppress loud warning for local development where user credentials (ADC) don't support local signing
        console.log(`[GCS] Local credentials (ADC) detected. Using public fallback URL: https://cdn.fraymly.com/${fileName}`)
      } else {
        console.warn("Failed to generate Signed URL, falling back to public CNAME URL:", err.message)
      }
      return { downloadUrl: `https://cdn.fraymly.com/${fileName}`, isRedirect: true }
    }
  }

  throw new Error(`Unknown storage driver: ${driver}`)
}

/**
 * Generates a signed upload URL for uploading files directly to Google Cloud Storage.
 * @param {string} fileName - The name of the file being uploaded.
 * @param {string} contentType - The MIME type of the file.
 * @returns {Promise<{signedUrl: string, storagePath: string, fileName: string} | null>}
 */
export async function getUploadUrl(fileName, contentType) {
  const driver = getDriver()

  if (driver === 'gcs') {
    const bucketName = env.gcsBucketName
    const uniqueFileName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]+/g, '_')}`
    const destination = `uploads/videos/${uniqueFileName}`

    try {
      const [signedUrl] = await storage
        .bucket(bucketName)
        .file(destination)
        .getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + 30 * 60 * 1000, // 30 minutes
          contentType,
        })
      return {
        signedUrl,
        storagePath: `gs://${bucketName}/${destination}`,
        fileName: uniqueFileName,
      }
    } catch (err) {
      console.error("Failed to generate signed GCS upload URL:", err)
      throw new Error(`Failed to generate signed GCS upload URL: ${err.message}`)
    }
  }

  return null
}

/**
 * Gets a read stream for a file from GCS along with size and content-type.
 * @param {string} storagePath
 * @param {object} options - Options passed to createReadStream (e.g. { start, end })
 * @returns {Promise<{stream: any, size: number, contentType: string}>}
 */
export async function getGcsFileStream(storagePath, options = {}) {
  if (env.storageDriver === 'gcs') {
    const bucketName = env.gcsBucketName
    const fileName = storagePath.replace(`gs://${bucketName}/`, '')
    const file = storage.bucket(bucketName).file(fileName)
    
    const [metadata] = await file.getMetadata()
    const size = parseInt(metadata.size)
    const contentType = metadata.contentType || 'video/mp4'
    
    const stream = file.createReadStream(options)
    return { stream, size, contentType }
  }
  throw new Error("Only GCS storage driver supports streaming")
}