# Events

Socket.IO is used for live updates.

Emitted events:

- `connected`
- `jobs:created`
- `jobs:updated`
- `projects:updated`
- `clips:updated`
- `exports:updated`

Typical client behavior:

- The frontend listens for job updates and invalidates job and project queries.
- Clip updates refresh the clip timeline and editor panels.
- Export updates refresh the exports list and download state.

Current event payload conventions:

- Job events include a `job` object when available.
- Clip events include `jobId`, `clipId`, `status`, and optional failure details.
- Project events include `projectId` and status information.
- Export events include `jobId`, `clipId`, and output information.

