import { mkdir } from 'node:fs/promises'

export async function ensureDirectory(pathname) {
  await mkdir(pathname, { recursive: true })
}

export function toPublicStoragePath(filePath) {
  const normalized = filePath.replaceAll('\\', '/')
  const marker = '/uploads/'
  const index = normalized.lastIndexOf(marker)
  const relativePath = index >= 0 ? normalized.slice(index + marker.length) : normalized.split('/').at(-1)
  return `/storage/${relativePath}`
}
