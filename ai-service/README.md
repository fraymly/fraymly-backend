# fraymly AI Service

Separate Python 3.11 service for AI orchestration.

This service is responsible for:

- Speech-to-text
- Speaker diarization
- Scene detection
- Face detection
- Object detection
- Image embeddings
- Director-style workflow orchestration

Run with Python 3.11.

Optional real-model integrations
--------------------------------
This service ships with lightweight stubs for fast local development. To enable real model behavior install the corresponding Python packages and ensure the AI service is given access to the source video/audio files via the `path` field in requests.

Suggested packages (install in the ai-service virtualenv):

```
pip install whisper openai pyannote.audio scenedetect mediapipe yolov5 siglip fastapi uvicorn
```

If a package is missing the service will fallback to deterministic stub outputs so the rest of the system remains functional.

How the integration works
- The AI service will prefer real model code when package imports succeed.
- Provide `path` (local file path) in analyze requests to let the model load the media.
- The Node backend orchestrates requests and streams progress back to the frontend via Socket.IO.

Model pre-download script
-------------------------
This service supports pre-downloading and caching heavy AI models before the backend starts.

Run this from the `ai-service` directory:

```bash
python3 download_models.py
```

This will download and cache:
- Whisper weights
- Pyannote speaker diarization pipeline
- SigLIP embedding model
- YOLO model weights

The backend Node server also starts the Python service automatically when `server.js` launches, and the Python AI service will load models into memory on startup.

Notes
- Full production deployments should use GPU-enabled environments and dedicated model-serving infra for large models (Whisper large, YOLOv11, etc.).
- For reproducible results, pin package versions and test each model step independently before running full pipelines.
