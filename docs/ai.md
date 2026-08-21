# AI

AI stays separate from Node.js.

The backend only provides the orchestration layer and the provider wrapper:

- `services/ai.service.js` sends requests to the Python AI service.
- The Python service owns the model-specific modules and the orchestration graph.

Defaults used by the current codebase:

- Model: `gpt-5.4-nano`
- API style: OpenAI Responses API

When no AI service or OpenAI key is configured, the system falls back to deterministic clip planning so the rest of the workflow still works.

Planned AI service contract:

- Python 3.11 service
- HTTP API
- Receives transcript, duration, count, and target duration
- Returns summary text and short-selection guidance

Implemented AI model modules in the Python service:

- Speech-to-text
- Speaker diarization
- Scene detection
- Face detection
- Object detection
- Image embeddings
- Director / workflow planning

Environment variables:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `AI_SERVICE_URL`

