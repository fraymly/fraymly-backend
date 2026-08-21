import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError } from '../utils/errors.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import {
  createUser,
  findUserByEmail,
  findUsers,
  updateUser,
} from '../repositories/users.repository.js'

const sanitizeUser = (user) => {
  if (!user) {
    return null
  }

  const { passwordHash, ...rest } = user
  return rest
}

export async function loginOrProvisionUser({ email, password, name }) {
  const normalizedEmail = email.toLowerCase().trim()
  const existing = await findUserByEmail(normalizedEmail)

  if (!existing) {
    const user = await createUser({
      email: normalizedEmail,
      name: name ?? normalizedEmail.split('@')[0],
      passwordHash: hashPassword(password),
      role: 'admin',
      status: 'active',
    })

    return {
      token: jwt.sign({ sub: user._id, email: user.email, role: user.role }, env.jwtSecret, { expiresIn: '7d' }),
      user: sanitizeUser(user),
      created: true,
    }
  }

  if (!verifyPassword(password, existing.passwordHash)) {
    throw new AppError('Invalid email or password', 401)
  }

  const updated = await updateUser(existing._id, { lastLoginAt: new Date().toISOString() })

  return {
    token: jwt.sign({ sub: updated._id, email: updated.email, role: updated.role }, env.jwtSecret, { expiresIn: '7d' }),
    user: sanitizeUser(updated),
    created: false,
  }
}

export async function getCurrentUser(userId) {
  const user = await findUsers({ _id: userId }, { limit: 1 })
  return sanitizeUser(user[0] ?? null)
}

