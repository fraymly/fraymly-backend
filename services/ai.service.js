import { env } from '../config/env.js'

export async function callAi(path, payload) {
  const url = `${env.aiServiceUrl}${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-API-Secret': env.internalApiSecret,
    },
    body: JSON.stringify(payload || {}),
    // For fire-and-forget calls, we don't want to wait for the full response.
    // We just need to know the request was accepted.
    // Abort the request after a short timeout. The Python service will continue in the background.
    // A 5-second timeout is more than enough for the AI service to accept the job.
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AI service ${path} failed: ${res.status} ${text}`)
  }
  console.log(`AI service call to ${path} successful.`)
  // The Python service will run in the background.
  if (path === '/workflow/run') {
    res.body?.cancel() // Discard the body
    return { success: true, message: 'Workflow triggered' }
  }
  return res.json()
}

export async function analyzeVideoForShorts(payload = {}) {
  try {
    const res = await callAi('/analyze/shorts', payload)
    return res.data || res
  } catch (err) {
    return { summary: '', error: String(err) }
  }
}

export default {
  callAi,
  analyzeVideoForShorts,
}