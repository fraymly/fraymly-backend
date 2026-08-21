import { AppError } from '../utils/errors.js'
import {
  createProject,
  deleteProject,
  findProjects,
  getProject,
  updateProject,
} from '../repositories/projects.repository.js'
import { findVideos } from '../repositories/videos.repository.js'
import { createWorkspaceVideo } from './videos.service.js'
import { findJobs } from '../repositories/jobs.repository.js'
import { findClips } from '../repositories/clips.repository.js'
import { findExports } from '../repositories/exports.repository.js'
import { findWorkflows } from '../repositories/workflows.repository.js'
import { findWorkflowRuns } from '../repositories/workflow-runs.repository.js'
import { commitFile } from './storage.service.js'

import { unlink } from 'node:fs/promises'

export async function createWorkspaceProject({ ownerId, name, description, file }) {
  const project = await createProject({
    ownerId,
    name: name ?? file?.originalname.replace(/\.[^.]+$/, ''),
    description: description ?? '',
    status: 'processing',
  })

  let video = null
  if (file) {
    const { storagePath } = await commitFile(file.path)
    video = await createWorkspaceVideo({
      ownerId,
      projectId: project._id,
      originalName: file.originalname,
      fileName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: storagePath,
      status: 'uploaded',
    })
    
    await unlink(file.path).catch(() => {})
    await updateProject(project._id, { sourceVideoId: video._id })
  }

  return { project, video }
}

export async function listWorkspaceProjects({ ownerId }) {
  return findProjects({ ownerId }, { sort: { createdAt: -1 } })
}

export async function getWorkspaceProject(projectId) {
  const project = await getProject(projectId)

  if (!project) {
    throw new AppError('Project not found', 404)
  }

  return project
}

export async function updateWorkspaceProject(projectId, updates) {
  const project = await updateProject(projectId, updates)

  if (!project) {
    throw new AppError('Project not found', 404)
  }

  return project
}

export async function deleteWorkspaceProject(projectId) {
  return deleteProject(projectId)
}

export async function getProjectDashboard(projectId) {
  const project = await getWorkspaceProject(projectId)
  const [videos, jobs, clips, exportsList, workflows, workflowRuns] = await Promise.all([
    findVideos({ projectId }, { sort: { createdAt: -1 } }),
    findJobs({ projectId }, { sort: { createdAt: -1 } }),
    findClips({ projectId }, { sort: { createdAt: -1 } }),
    findExports({ projectId }, { sort: { createdAt: -1 } }),
    findWorkflows({ projectId }, { sort: { createdAt: -1 } }),
    findWorkflowRuns({ projectId }, { sort: { createdAt: -1 } }),
  ])

  return {
    project,
    videos,
    jobs,
    clips,
    exports: exportsList,
    workflows,
    workflowRuns,
    totals: {
      videos: videos.length,
      jobs: jobs.length,
      clips: clips.length,
      exports: exportsList.length,
      workflows: workflows.length,
      workflowRuns: workflowRuns.length,
    },
  }
}
