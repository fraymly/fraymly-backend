import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, storedValue) {
  const [salt, hash] = storedValue.split(':')

  if (!salt || !hash) {
    return false
  }

  const computed = scryptSync(password, salt, 64)
  const storedBuffer = Buffer.from(hash, 'hex')

  if (storedBuffer.length !== computed.length) {
    return false
  }

  return timingSafeEqual(storedBuffer, computed)
}

