import { v4 as uuidv4 } from 'uuid'
import { AppError } from '../utils/errors.js'
import { WORKFLOW_NODE_CATALOG, DEFAULT_WORKFLOW_NODES } from '../utils/workflow-catalog.js'
import { createWorkflow, deleteWorkflow, findWorkflows, getWorkflow as getWorkflowFromRepo, updateWorkflow } from '../repositories/workflows.repository.js'
import { createWorkflowRun as createWorkflowRunRecord, findWorkflowRuns, getWorkflowRun, updateWorkflowRun } from '../repositories/workflow-runs.repository.js'
import { getWorkspaceProject, updateWorkspaceProject } from './projects.service.js'
import { createExport, updateExport } from '../repositories/exports.repository.js'
import { findVideos } from '../repositories/videos.repository.js'
import { getWorkspaceVideo } from './videos.service.js'
import { probeVideoDuration } from './ffmpeg.service.js'
import { emitSocketEvent } from './socket.service.js'
import { callAi } from './ai.service.js'
import { env } from '../config/env.js'
import { getDownloadUrl } from './storage.service.js'

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const getValueAtPath = (source, pathExpression) => {
  if (!source || !pathExpression) {
    return undefined
  }
}

const createDefaultNodes = () => DEFAULT_WORKFLOW_NODES.map((type, index) => {
  const catalogEntry = WORKFLOW_NODE_CATALOG.find((item) => item.type === type)
  return {
    id: uuidv4(),
    type,
    label: catalogEntry?.label ?? type,
    position: {
      x: 80 + (index % 4) * 270,
      y: 80 + Math.floor(index / 4) * 180,
    },
    inputLabel: 'In',
    outputLabel: 'Out',
    branchKey: '',
    config: {},
    order: index,
  }
})

export async function listWorkflowCatalog() {
  return WORKFLOW_NODE_CATALOG
}

export async function getWorkflowTemplate(workflowId) {
  return getWorkflowFromRepo(workflowId)
}

export async function listAllWorkflows() {
  return findWorkflows({}, { sort: { createdAt: -1 } })
}

export async function listProjectWorkflows(projectId) {
  return findWorkflows({ projectId }, { sort: { createdAt: -1 } })
}

export async function createWorkflowTemplate(payload) {
  const newWorkflowData = {
    _id: uuidv4(),
    projectId: null, // This is a template, not tied to a project
    ownerId: 'system', // Or derive from authenticated user
    name: payload.name,
    description: payload.description ?? '',
    nodes: Array.isArray(payload.nodes) ? payload.nodes : [],
    edges: Array.isArray(payload.edges) ? payload.edges : [],
    settings: payload.settings ?? {},
    status: 'draft',
  };

  return createWorkflow(newWorkflowData);
}

export async function createProjectWorkflow(projectId, payload) {
  const newWorkflowData = {
    _id: uuidv4(),
    projectId,
    ownerId: 'system', // Or derive from authenticated user
    name: payload.name,
    description: payload.description ?? '',
    nodes: Array.isArray(payload.nodes) && payload.nodes.length > 0 ? payload.nodes : createDefaultNodes(),
    edges: Array.isArray(payload.edges) ? payload.edges : [],
    settings: payload.settings ?? {},
    status: 'draft',
  };

  const workflow = await createWorkflow(newWorkflowData);

  if (projectId) {
    await updateWorkspaceProject(projectId, {
      activeWorkflowId: workflow._id,
    })
  }

  return workflow
}

export async function updateProjectWorkflow(projectId, workflowId, payload) {
  const workflow = await getWorkflowFromRepo(workflowId)
  if (!workflow || (projectId && workflow.projectId !== projectId)) {
    throw new AppError('Workflow not found', 404)
  }

  return updateWorkflow(workflowId, {
    ...payload,
    status: payload.status ?? workflow.status,
  })
}

export async function updateWorkflowTemplate(workflowId, payload) {
  const workflow = await getWorkflowFromRepo(workflowId)
  if (!workflow) {
    throw new AppError('Workflow template not found', 404)
  }

  return updateWorkflow(workflowId, {
    name: payload.name,
    description: payload.description,
    nodes: payload.nodes,
    edges: payload.edges,
    settings: payload.settings,
  })
}

export async function deleteProjectWorkflow(projectId, workflowId) {
  const workflow = await getWorkflowFromRepo(workflowId)
  if (!workflow || (projectId && workflow.projectId !== projectId)) {
    throw new AppError('Workflow not found', 404)
  }

  return deleteWorkflow(workflowId)
}

export async function deleteWorkflowTemplate(workflowId) {
  const workflow = await getWorkflowFromRepo(workflowId)
  if (!workflow) {
    throw new AppError('Workflow template not found', 404)
  }

  return deleteWorkflow(workflowId)
}

export async function getProjectWorkflow(projectId, workflowId) {
  const workflow = await getWorkflowFromRepo(workflowId)
  if (!workflow || workflow.projectId !== projectId) {
    throw new AppError('Workflow not found', 404)
  }

  return workflow
}

export async function createWorkflowRun(projectId, workflowId, options = {}) {
  const workflow = await getProjectWorkflow(projectId, workflowId)
  const project = await getWorkspaceProject(projectId)
  const video = options.videoId ? await getWorkspaceVideo(options.videoId) : (await findVideos({ projectId }, { sort: { createdAt: -1 }, limit: 1 }))[0]

  if (!video) {
    throw new AppError('No source video found for workflow execution', 404)
  }

  let downloadUrl = null;
  try {
    const res = await getDownloadUrl(video.path);
    downloadUrl = res.downloadUrl;
  } catch (e) {
    console.error("Failed to get download url for video:", e);
  }

  const durationSeconds = video.durationSeconds ?? (await probeVideoDuration(video.path).catch(() => null))

  const run = await createWorkflowRunRecord({
    _id: uuidv4(),
    projectId,
    workflowId,
    ownerId: project.ownerId,
    status: 'queued',
    progress: 0,
    currentStep: 'Workflow queued',
    outputs: {}, // Initialize outputs
    videoId: video._id,
    nodeResults: [],
    settings: options.settings ?? {},
    startedAt: new Date().toISOString(),
  })

  emitSocketEvent('workflow-runs:created', { run })

  // console.log("API_URL: ", env.apiUrl);

  // Fire-and-forget call to the AI service to start the background job
  const cleanVideo = JSON.parse(JSON.stringify(video))
  callAi('/workflow/run', {
    runId: run._id,
    workflow,
    project,
    video: { ...cleanVideo, durationSeconds, url: downloadUrl },
    apiUrl: env.apiUrl,
    internalApiSecret: env.internalApiSecret,
    settings: options.settings ?? workflow.settings ?? {},
  }).catch((err) => {
    console.error(`Failed to trigger workflow run ${run._id} on AI service:`, err)
    // Optionally update the run status to failed here
  })

  return run
}

export async function listProjectWorkflowRuns(projectId) {
  const runs = await findWorkflowRuns({ projectId }, { sort: { createdAt: -1 } })
  // Heal any runs that were stuck in a 'stopping' state from a previous server shutdown
  const healedRuns = await Promise.all(
    runs.map(async (run) => {
      if (run.status === 'stopping') {
        const cancelled = await updateWorkflowRun(run._id, {
          status: 'cancelled',
          progress: 100,
          currentStep: 'Workflow cancelled by user',
          activeNodeId: null,
          finishedAt: new Date().toISOString(),
        })
        emitSocketEvent('workflow-runs:updated', { run: cancelled })
        return cancelled
      }
      return run
    })
  )
  return healedRuns
}

export async function getProjectWorkflowRun(projectId, runId) {
  let run = await getWorkflowRun(runId)
  if (!run || run.projectId !== projectId) {
    throw new AppError('Workflow run not found', 404)
  }

  if (run.status === 'stopping') {
    run = await updateWorkflowRun(runId, {
      status: 'cancelled',
      progress: 100,
      currentStep: 'Workflow cancelled by user',
      activeNodeId: null,
      finishedAt: new Date().toISOString(),
    })
    emitSocketEvent('workflow-runs:updated', { run })
  }

  return run
}

export async function stopProjectWorkflowRun(projectId, runId) {
  const run = await getProjectWorkflowRun(projectId, runId)

  if (['cancelled', 'completed', 'failed', 'stopped'].includes(run.status)) {
    throw new AppError('Workflow is already stopped or finished.', 400)
  }

  const updated = await updateWorkflowRun(runId, {
    status: 'cancelled',
    progress: 100,
    currentStep: 'Workflow cancelled by user',
    activeNodeId: null,
    finishedAt: new Date().toISOString(),
  })

  emitSocketEvent('workflow-runs:updated', { run: updated })
  emitSocketEvent('projects:updated', { projectId, workflowId: run.workflowId })

  return updated
}

export async function pauseProjectWorkflowRun(projectId, runId) {
  const run = await getProjectWorkflowRun(projectId, runId)

  if (!['running', 'queued'].includes(run.status)) {
    throw new AppError('Only running or queued workflows can be paused.', 400)
  }

  const updated = await updateWorkflowRun(runId, {
    status: 'paused',
    currentStep: 'Workflow paused by user',
  })

  emitSocketEvent('workflow-runs:updated', { run: updated })
  return updated
}

export async function resumeProjectWorkflowRun(projectId, runId) {
  const run = await getProjectWorkflowRun(projectId, runId)

  if (!['paused', 'failed'].includes(run.status)) {
    throw new AppError('Only paused or failed workflows can be resumed.', 400)
  }

  const workflow = await getProjectWorkflow(projectId, run.workflowId)
  const project = await getWorkspaceProject(projectId)
  const video = await getWorkspaceVideo(run.videoId)
  
  let downloadUrl = null
  try {
    const res = await getDownloadUrl(video.path)
    downloadUrl = res.downloadUrl
  } catch (e) {
    console.error("Failed to get download url:", e)
  }

  const durationSeconds = video.durationSeconds ?? (await probeVideoDuration(video.path).catch(() => null))

  const updated = await updateWorkflowRun(runId, {
    status: 'queued',
    currentStep: 'Workflow resumed',
    startedAt: new Date().toISOString(),
  })

  emitSocketEvent('workflow-runs:updated', { run: updated })

  const cleanVideo = JSON.parse(JSON.stringify(video))
  callAi('/workflow/run', {
    runId: run._id,
    workflow,
    project,
    video: { ...cleanVideo, durationSeconds, url: downloadUrl },
    apiUrl: env.apiUrl,
    internalApiSecret: env.internalApiSecret,
    settings: run.settings ?? {},
  }).catch((err) => {
    console.error(`Failed to trigger resumed workflow run ${run._id} on AI service:`, err)
  })

  return updated
}

export async function createWorkflowExport(payload) {
  // The file has already been saved by the upload middleware.
  // We just need to create the database record.
  const item = await createExport(payload)
  emitSocketEvent('exports:updated', { item })
  return item
}