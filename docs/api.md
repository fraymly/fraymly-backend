# API

All success responses follow:

```json
{
  "success": true,
  "message": "",
  "data": {}
}
```

All errors follow:

```json
{
  "success": false,
  "message": "Project not found"
}
```

Implemented routes:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/:projectId`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`
- `GET /api/jobs`
- `POST /api/jobs/shorts`
- `GET /api/jobs/:jobId`
- `POST /api/jobs/:jobId/retry`
- `DELETE /api/jobs/:jobId`
- `GET /api/videos`
- `GET /api/videos/:videoId`
- `PATCH /api/videos/:videoId`
- `DELETE /api/videos/:videoId`
- `GET /api/clips`
- `GET /api/clips/:clipId`
- `PATCH /api/clips/:clipId`
- `DELETE /api/clips/:clipId`
- `GET /api/exports`
- `GET /api/exports/:exportId`
- `PATCH /api/exports/:exportId`
- `DELETE /api/exports/:exportId`
- `GET /api/settings`
- `PUT /api/settings`
- `GET /api/editor/projects/:projectId`
- `PATCH /api/editor/clips/:clipId`

Important request flow:

- `POST /api/jobs/shorts` accepts multipart form data with `video`, `projectName`, `projectDescription`, `shortCount`, `targetDuration`, `aspectRatio`, and `tone`.
- The backend creates the project, video, and job immediately.
- The job processor then plans clips and renders them in the background.

