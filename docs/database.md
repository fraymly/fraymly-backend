# Database

MongoDB is accessed only through the official `mongodb` driver.

Rules used by this codebase:

- Every document uses a UUID string `_id`.
- No `ObjectId` is used anywhere.
- Collections are split by domain.

Collections currently implemented:

- `users`
- `projects`
- `videos`
- `clips`
- `jobs`
- `exports`
- `settings`
- `sessions`

Core document roles:

- `users` store login identity and role data.
- `projects` group one upload and its derivative assets.
- `videos` store source upload metadata and filesystem paths.
- `jobs` track the processing pipeline and progress state.
- `clips` store generated short-form candidates and render metadata.
- `exports` store downloadable output files.
- `settings` store workspace defaults.
- `sessions` exist for future session tracking.

Document shape conventions:

- `createdAt` and `updatedAt` are ISO strings.
- `status` is used for pipeline states.
- `ownerId`, `projectId`, `videoId`, `jobId`, and `clipId` are UUID strings.

