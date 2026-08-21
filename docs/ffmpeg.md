# FFmpeg

FFmpeg is used as the native rendering engine for short-form clips.

Current pipeline:

1. Probe source video duration with `ffprobe`.
2. Build a clip plan from the requested short count and target duration.
3. Render each clip to `uploads/clips/<jobId>/`.
4. Expose the rendered files through `/storage/...`.

Implementation notes:

- The render path uses `child_process.spawn`.
- Output clips are formatted for a vertical 9:16 canvas by default.
- If FFmpeg is unavailable, the job fails and the error is persisted to the job and clip records.

Environment variables:

- `FFMPEG_PATH`
- `FFPROBE_PATH`

