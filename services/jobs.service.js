import path from 'node:path'
import { v4 as uuidv4 } from 'uuid'
import { env } from '../config/env.js'
import { AppError } from '../utils/errors.js'
import { ensureDirectory, toPublicStoragePath } from '../utils/paths.js'
import { emitSocketEvent } from './socket.service.js'
import { probeVideoDuration, renderClip } from './ffmpeg.service.js'
import { buildShortPlan } from './shorts.service.js'
import { analyzeVideoForShorts } from './ai.service.js'
import { createWorkspaceProject } from './projects.service.js'
import { createWorkspaceVideo } from './videos.service.js'
import { getWorkspaceProject } from './projects.service.js'
import { getWorkspaceVideo } from './videos.service.js'
import {
  createJob,
  deleteJob,
  findJobs,
  getJob,
  updateJob,
} from '../repositories/jobs.repository.js'
import {
  createWorkspaceClips,
  listWorkspaceClips,
  updateWorkspaceClip,
} from './clips.service.js'
import {
  createWorkspaceExport,
  listWorkspaceExports,
  updateWorkspaceExport,
} from './exports.service.js'

const updateAndEmitJob = async (jobId, updates) => {
  const job = await updateJob(jobId, updates)
  emitSocketEvent('jobs:updated', { job })
  return job
}

async function processShortsJob({ jobId }) {
  const job = await getJob(jobId)

  if (!job) {
    return
  }

  const [project, video] = await Promise.all([
    getWorkspaceProject(job.projectId),
    getWorkspaceVideo(job.videoId),
  ])

  if (!project || !video) {
    await updateAndEmitJob(jobId, {
      status: 'failed',
      progress: 100,
      currentStep: 'Missing project or video record',
    })
    return
  }

  try {
    const durationSeconds = video.durationSeconds ?? (await probeVideoDuration(video.path))
    const aiNotes = await analyzeVideoForShorts({
      transcript: video.transcript ?? '',
      videoTitle: project.name,
      durationSeconds,
      targetCount: job.shortCount,
      targetDuration: job.targetDuration,
      path: video.path,
      audioPath: video.path,
    })

    const clipPlan = buildShortPlan({
      videoDurationSeconds: durationSeconds,
      shortCount: job.shortCount,
      targetDurationSeconds: job.targetDuration,
      title: project.name,
    })

    await updateAndEmitJob(jobId, {
      status: 'rendering',
      progress: 15,
      currentStep: 'Planning short clips',
      analysisSummary: aiNotes.summary ?? '',
    })

    const clipRecords = await createWorkspaceClips(
      clipPlan.map((clip) => ({
        _id: uuidv4(),
        jobId,
        projectId: project._id,
        videoId: video._id,
        index: clip.index,
        title: clip.title,
        slug: clip.slug,
        startTime: clip.startTime,
        endTime: clip.endTime,
        durationSeconds: clip.durationSeconds,
        score: clip.score,
        notes: clip.notes,
        status: 'queued',
      })),
    )

    const outputDir = path.join(env.uploadDir, 'clips', jobId)
    await ensureDirectory(outputDir)

    for (let index = 0; index < clipRecords.length; index += 1) {
      const clip = clipRecords[index]
      const outputPath = path.join(outputDir, `${clip.index}-${clip.slug}.mp4`)
      const outputUrl = toPublicStoragePath(outputPath)

      await updateWorkspaceClip(clip._id, {
        status: 'rendering',
      })

      emitSocketEvent('clips:updated', {
        jobId,
        clipId: clip._id,
        index: clip.index,
        status: 'rendering',
      })

      try {
        await renderClip({
          inputPath: video.path,
          outputPath,
          startTime: clip.startTime,
          durationSeconds: clip.durationSeconds,
        })

        const updatedClip = await updateWorkspaceClip(clip._id, {
          status: 'ready',
          outputPath,
          outputUrl,
        })

        await createWorkspaceExport({
          _id: uuidv4(),
          jobId,
          clipId: updatedClip._id,
          projectId: project._id,
          videoId: video._id,
          status: 'ready',
          outputPath,
          outputUrl,
        })

        emitSocketEvent('exports:updated', {
          jobId,
          clipId: updatedClip._id,
          outputUrl,
          status: 'ready',
        })

        emitSocketEvent('clips:updated', {
          jobId,
          clipId: updatedClip._id,
          status: 'ready',
          outputUrl,
        })
      } catch (error) {
        await updateWorkspaceClip(clip._id, {
          status: 'failed',
          failureReason: error.message,
        })

        emitSocketEvent('clips:updated', {
          jobId,
          clipId: clip._id,
          status: 'failed',
          failureReason: error.message,
        })
      }

      const progress = Math.round(25 + ((index + 1) / clipRecords.length) * 70)
      await updateAndEmitJob(jobId, {
        progress,
        currentStep: `Processed clip ${index + 1} of ${clipRecords.length}`,
      })
    }

    await updateJob(jobId, {
      status: 'completed',
      progress: 100,
      currentStep: 'All shorts are ready',
    })

    emitSocketEvent('jobs:updated', {
      job: await getJob(jobId),
    })
    emitSocketEvent('projects:updated', {
      projectId: project._id,
      status: 'completed',
    })
  } catch (error) {
    const formattedError = error.message === 'fetch failed'
      ? 'AI Service unreachable (fetch failed). Please check if backend AI service is running.'
      : (error.message || 'Pipeline process failed')

    await updateJob(jobId, {
      status: 'failed',
      progress: 100,
      currentStep: formattedError,
      failureReason: error.message,
    })

    emitSocketEvent('jobs:updated', {
      job: await getJob(jobId),
    })
  }
}

export async function createShortsJob({
  ownerId,
  file,
  projectName,
  projectDescription,
  shortCount,
  targetDuration,
  aspectRatio,
  tone,
}) {
  if (!file) {
    throw new AppError('A video file is required', 400)
  }

  const project = await createWorkspaceProject({
    ownerId,
    name: projectName ?? file.originalname.replace(/\.[^.]+$/, ''),
    description: projectDescription,
    sourceVideoId: null,
  })

  const video = await createWorkspaceVideo({
    ownerId,
    projectId: project._id,
    originalName: file.originalname,
    fileName: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    status: 'uploaded',
  })

  const durationSeconds = await probeVideoDuration(file.path).catch(() => null)
  const clips = buildShortPlan({
    videoDurationSeconds: durationSeconds ?? Number(shortCount) * Number(targetDuration) * 1.5,
    shortCount,
    targetDurationSeconds: targetDuration,
    title: project.name,
  })

  const analysis = await analyzeVideoForShorts({
    transcript: '',
    videoTitle: project.name,
    durationSeconds: durationSeconds ?? 0,
    targetCount: Number(shortCount) || 3,
    targetDuration: Number(targetDuration) || 30,
    path: file.path,
    audioPath: file.path,
  }).catch(() => ({ summary: '' }))

  const job = await createJob({
    ownerId,
    projectId: project._id,
    videoId: video._id,
    status: 'queued',
    progress: 5,
    currentStep: 'Video uploaded',
    shortCount: Number(shortCount) || 3,
    targetDuration: Number(targetDuration) || 30,
    aspectRatio: aspectRatio ?? '9:16',
    tone: tone ?? 'energetic',
    durationSeconds,
    analysisSummary: analysis.summary ?? '',
  })

  await createWorkspaceClips(
    clips.map((clip) => ({
      _id: uuidv4(),
      jobId: job._id,
      projectId: project._id,
      videoId: video._id,
      index: clip.index,
      title: clip.title,
      slug: clip.slug,
      startTime: clip.startTime,
      endTime: clip.endTime,
      durationSeconds: clip.durationSeconds,
      score: clip.score,
      notes: clip.notes,
      status: 'queued',
    })),
  )

  emitSocketEvent('jobs:created', { job, project, video })
  queueMicrotask(() => {
    processShortsJob({ jobId: job._id }).catch((error) => {
      console.error(error)
    })
  })

  return { project, video, job }
}

export async function listWorkspaceJobs(filter = {}) {
  return findJobs(filter, { sort: { createdAt: -1 } })
}

export async function getWorkspaceJob(jobId) {
  const job = await getJob(jobId)
  if (!job) {
    throw new AppError('Job not found', 404)
  }

  const [clips, exportsList] = await Promise.all([
    listWorkspaceClips({ jobId }),
    listWorkspaceExports({ jobId }),
  ])

  return {
    job,
    clips,
    exports: exportsList,
  }
}

export async function retryWorkspaceJob(jobId) {
  const job = await getJob(jobId)
  if (!job) {
    throw new AppError('Job not found', 404)
  }

  await updateJob(jobId, {
    status: 'queued',
    progress: 0,
    currentStep: 'Retrying job',
    failureReason: null,
  })

  queueMicrotask(() => {
    processShortsJob({ jobId }).catch((error) => {
      console.error(error)
    })
  })

  return getJob(jobId)
}

export async function deleteWorkspaceJob(jobId) {
  return deleteJob(jobId)
}
