import { env } from '../config/env.js'
import { AppError } from '../utils/errors.js'

export function createOpenAIProvider() {
  return {
    async createResponse({ input, model = env.openaiModel, temperature = 0.2, responseFormat = undefined }) {
      if (!env.openaiApiKey) {
        throw new AppError('OpenAI API key is not configured', 503)
      }

      const payload = {
        model,
        input,
        temperature,
        ...(responseFormat ? { text: { format: responseFormat } } : {}),
      }

      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new AppError(`OpenAI request failed: ${errorText}`, response.status)
      }

      return response.json()
    },
  }
}

