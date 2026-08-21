import { Router } from 'express'
import { login, me } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireFields } from '../middleware/validate.middleware.js'

const router = Router()

router.post('/login', requireFields(['email', 'password']), login)
router.get('/me', requireAuth, me)

export default router

