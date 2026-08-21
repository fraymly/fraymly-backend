import { asyncHandler } from '../utils/async-handler.js'
import { sendSuccess } from '../utils/api.js'
import {
  createWorkspaceProject,
  deleteWorkspaceProject,
  getProjectDashboard,
  listWorkspaceProjects,
  updateWorkspaceProject,
} from '../services/projects.service.js'

export const listProjects = asyncHandler(async (req, res) => {
  const projects = await listWorkspaceProjects({ ownerId: req.auth.sub })
  return sendSuccess(res, 'Projects loaded', { projects })
})

export const createProject = asyncHandler(async (req, res) => {
  const { project } = await createWorkspaceProject({
    ownerId: req.auth.sub,
    name: req.body.projectName,
    description: req.body.projectDescription,
    file: req.file,
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
