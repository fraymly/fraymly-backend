import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/api.js'
import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  getProjectDashboard,
  listWorkspaceProjects,
  updateWorkspaceProject,
} from '../services/projects.service.js'
import { getUploadUrl } from '../services/storage.service.js'

export const listProjects = asyncHandler(async (req, res) => {
  const projects = await listWorkspaceProjects({ ownerId: req.auth.sub })
  return sendSuccess(res, 'Projects loaded', { projects })
})

export const requestSignedUploadUrl = asyncHandler(async (req, res) => {
  const { fileName, contentType } = req.body
  if (!fileName || !contentType) {
    return res.status(400).json({ success: false, message: 'fileName and contentType are required' })
  }
  const result = await getUploadUrl(fileName, contentType)
  return sendSuccess(res, 'Signed upload URL generated', { uploadData: result })
})

export const createProject = asyncHandler(async (req, res) => {
  const { projectName, projectDescription, storagePath, originalName, size, mimeType, fileName } = req.body

  let directVideo = null
  if (storagePath) {
    directVideo = {
      storagePath,
      originalName,
      size: Number(size),
      mimeType,
      fileName,
    }
  }

  const { project } = await createWorkspaceProject({
    ownerId: req.auth.sub,
    name: projectName,
    description: projectDescription,
    file: req.file,
    directVideo,
  })
  return sendSuccess(res, 'Project created', { project }, 201)
})

export const getProject = asyncHandler(async (req, res) => {
  const project = await getProjectDashboard(req.params.projectId)
  return sendSuccess(res, 'Project loaded', project)
})

export const updateProject = asyncHandler(async (req, res) => {
  const project = await updateWorkspaceProject(req.params.projectId, req.body)
  return sendSuccess(res, 'Project updated', { project })
})

export const deleteProject = asyncHandler(async (req, res) => {
  await deleteWorkspaceProject(req.params.projectId)
  return sendSuccess(res, 'Project deleted', {})
})
