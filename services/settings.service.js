import { v4 as uuidv4 } from 'uuid'
import { AppError } from '../utils/errors.js'
import {
  createSettings,
  findSettings,
  updateSettings,
} from '../repositories/settings.repository.js'

const DEFAULT_SETTINGS = {
  theme: 'system',
  defaultShortCount: 5,
  defaultShortDuration: 35,
  aspectRatio: '9:16',
  brandName: 'Fraymly AI',
}

export async function getWorkspaceSettings(ownerId) {
  const settings = await findSettings({ ownerId, scope: 'workspace' })
  if (settings) {
    return settings
  }

  return createSettings({
    _id: uuidv4(),
    ownerId,
    scope: 'workspace',
    ...DEFAULT_SETTINGS,
  })
}

export async function updateWorkspaceSettings(ownerId, updates) {
  const settings = await getWorkspaceSettings(ownerId)
  const updated = await updateSettings(settings._id, {
    ...updates,
    ownerId,
    scope: 'workspace',
  })

  if (!updated) {
    throw new AppError('Settings not found', 404)
  }

  return updated
}

