# Architecture

fraymly AI is split into two separate projects:

- `fraymlyAI-frontend`: React, Vite, TailwindCSS, React Query, Zustand, Socket.IO client.
- `fraymlyAI-backend`: Express, MongoDB driver, Socket.IO, FFmpeg orchestration, JWT auth.

The app follows a guided video-processing workflow:

1. User logs in.
2. User uploads a source video from the dashboard.
3. Backend creates a project, video record, job record, and planned clip records.
4. The job processor probes duration, plans short-form segments, and renders clips when FFmpeg is available.
5. Socket.IO pushes status updates to the frontend live.
6. The user reviews shorts in the project page and fine-tunes them in the editor.
7. Completed clips become exports with downloadable storage URLs.

Backend layering:

- Routes only define URLs and middleware.
- Controllers only translate HTTP requests into service calls.
- Services contain business logic and orchestration.
- Repositories abstract MongoDB access.
- Models own the collection-level CRUD helpers.

The backend entrypoint is `server.js`.

