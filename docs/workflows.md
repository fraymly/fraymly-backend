# Workflows

Workflows are project-scoped templates built from node-based steps.

Purpose:

- Let the user define the editing pipeline before execution.
- Keep all available operations visible as nodes.
- Allow the workflow to be saved, reloaded, and rerun.

Collections:

- `workflows` stores workflow templates.
- `workflow_runs` stores execution history and outputs.

Template shape:

- `name`
- `description`
- `nodes`
- `edges`
- `settings`
- `status`

Node catalog examples:

- `extract_metadata`
- `extract_audio`
- `speech_to_text`
- `speaker_diarization`
- `scene_detection`
- `face_detection`
- `object_detection`
- `image_embeddings`
- `transcript_analysis`
- `topic_detection`
- `story_detection`
- `hook_detection`
- `viral_segment_detection`
- `clip_ranking`
- `timeline_generation`
- `caption_generation`
- `title_generation`
- `description_generation`
- `hashtag_generation`
- `auto_zoom`
- `auto_reframe`
- `speaker_focus`
- `render`
- `export`

Execution behavior:

- The frontend saves a template first.
- The user triggers the workflow from the project whiteboard.
- The Node backend creates a workflow run.
- The Python AI service orchestrates model-specific steps.
- FFmpeg renders clips when a `render` node is part of the graph.

Current MVP note:

- The whiteboard supports drag repositioning and manual connection creation.
- The execution engine follows the stored nodes in order.
- The system is ready for richer branching logic later if needed.

