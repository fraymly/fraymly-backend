import * as service from '../services/workflows.service.js'
import { sendSuccess } from '../utils/api.js'

export async function handleListAllWorkflows(req, res, next) {
  try {
    const workflows = await service.listAllWorkflows()
    res.json({
      success: true,
      data: { workflows },
    })
  } catch (err) {
    next(err)
  }
}

export async function handleListProjectWorkflowRuns(req, res, next) {
  try {
    const runs = await service.listProjectWorkflowRuns(req.params.projectId)
    return sendSuccess(res, 'Workflow runs loaded', { runs })
  } catch (err) {
    next(err)
  }
}

export async function handleGetProjectWorkflowRun(req, res, next) {
  try {
    const run = await service.getProjectWorkflowRun(req.params.projectId, req.params.runId)
    return sendSuccess(res, 'Workflow run loaded', { run })
  } catch (err) {
    next(err)
  }
}

export async function handleGetWorkflow(req, res, next) {
  try {
    const workflow = await service.getWorkflowTemplate(req.params.workflowId);
    return sendSuccess(res, 'Workflow template loaded', { workflow });
  } catch (err) {
    next(err)
  }
}

export async function handleListProjectWorkflows(req, res, next) {
  try {
    const workflows = await service.listProjectWorkflows(req.params.projectId)
    return sendSuccess(res, 'Project workflows loaded', { workflows })
  } catch (err) {
    next(err)
  }
}

export async function handleAddWorkflowToProject(req, res, next) {
  try {
    const workflow = await service.createProjectWorkflow(req.params.projectId, req.body)
    return sendSuccess(res, 'Workflow added to project', { workflow }, 201)
  } catch (err) {
    next(err)
  }
}

export async function handleRunProjectWorkflow(req, res, next) {
  try {
    const run = await service.createWorkflowRun(req.params.projectId, req.params.workflowId, req.body)
    return sendSuccess(res, 'Workflow run started', { run })
  } catch (err) {
    next(err)
  }
}

export async function handleCreateWorkflow(req, res, next) {
  try {
    const workflow = await service.createWorkflowTemplate(req.body)
    return sendSuccess(res, 'Workflow template created', workflow, 201)
  } catch (err) {
    next(err)
  }
}

export async function handleUpdateWorkflow(req, res, next) {
  try {
    const workflow = await service.updateWorkflowTemplate(req.params.workflowId, req.body)
    return sendSuccess(res, 'Workflow template updated', workflow)
  } catch (err) {
    next(err)
  }
}

export async function handleDeleteWorkflow(req, res, next) {
  try {
    await service.deleteWorkflowTemplate(req.params.workflowId)
    return sendSuccess(res, 'Workflow template deleted', {})
  } catch (err) {
    next(err)
  }
}

export async function handleStopProjectWorkflowRun(req, res, next) {
  try {
    const run = await service.stopProjectWorkflowRun(req.params.projectId, req.params.runId)
    return sendSuccess(res, 'Workflow run stopped', { run })
  } catch (err) {
    next(err)
  }
}

export async function handlePauseProjectWorkflowRun(req, res, next) {
  try {
    const run = await service.pauseProjectWorkflowRun(req.params.projectId, req.params.runId)
    return sendSuccess(res, 'Workflow run paused', { run })
  } catch (err) {
    next(err)
  }
}

export async function handleResumeProjectWorkflowRun(req, res, next) {
  try {
    const run = await service.resumeProjectWorkflowRun(req.params.projectId, req.params.runId)
    return sendSuccess(res, 'Workflow run resumed', { run })
  } catch (err) {
    next(err)
  }
}

export async function handleDeleteProjectWorkflow(req, res, next) {
  try {
    await service.deleteProjectWorkflow(req.params.projectId, req.params.workflowId)
    return sendSuccess(res, 'Project workflow deleted', {})
  } catch (err) {
    next(err)
  }
}