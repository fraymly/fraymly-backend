import { access } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { AppError } from '../utils/errors.js'
import { env } from '../config/env.js'

const hasFile = async (filePath) => {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

const runCommand = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let stderr = ''

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString()
  })

  child.on('error', reject)
  child.on('close', (code) => {
    if (code === 0) {
      resolve()
      return
    }

    reject(new Error(stderr || `Command failed with exit code ${code}`))
  })
})

export async function isFfmpegAvailable() {
  return hasFile(env.ffmpegPath) || env.ffmpegPath === 'ffmpeg'
}

export async function probeVideoDuration(filePath) {
  const probeArgs = [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]

  try {
    const output = await new Promise((resolve, reject) => {
      const child = spawn(env.ffprobePath, probeArgs, { stdio: ['ignore', 'pipe', 'pipe'] })
      let stdout = ''
      let stderr = ''

      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString()
      })

      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString()
      })

      child.on('error', reject)
      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim())
          return
        }

        reject(new Error(stderr || `ffprobe exited with ${code}`))
      })
    })

    const duration = Number(output)
    return Number.isFinite(duration) ? duration : null
  } catch (error) {
    throw new AppError(`Unable to probe video: ${error.message}`, 500)
  }
}

export async function renderClip({
  inputPath,
  outputPath,
  startTime,
  durationSeconds,
}) {
  const args = [
    '-y',
    '-ss',
    String(startTime),
    '-i',
    inputPath,
    '-t',
    String(durationSeconds),
    '-vf',
    "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1",
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '20',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-movflags',
    '+faststart',
    outputPath,
  ]

  await runCommand(env.ffmpegPath, args)
}