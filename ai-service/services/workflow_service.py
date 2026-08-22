import os
import requests
import threading
from copy import deepcopy
from services.analysis_service import (
    analyze_transcript,
    analyze_speakers,
    analyze_scenes,
    analyze_faces,
    analyze_objects,
    analyze_embeddings,
    analyze_transcript_topics,
    analyze_story,
    analyze_hooks,
    analyze_viral_segments,
    analyze_clip_ranking,
    generate_timeline,
    generate_captions,
    auto_reframe_clips,
    render_clips,
    export_clips,
    create_export_record,
    generate_titles,
    generate_descriptions,
    generate_hashtags,
    auto_zoom,
    speaker_focus,
)

API_URL = os.getenv("API_URL", "http://localhost:5000/api/internal")


def fetch_run_state(run_id, context):
    try:
        api_url = context.get("apiUrl") if context else API_URL
        api_secret = context.get("internalApiSecret") if context else None
        
        url = f"{api_url}/workflows/runs/{run_id}"
        headers = {}
        if api_secret:
            headers["X-Internal-API-Secret"] = api_secret
            
        res = requests.get(url, headers=headers, timeout=30)
        if res.status_code == 200:
            return res.json().get("data", {}).get("run", {})
    except Exception as e:
        print(f"Failed to fetch run state: {e}", flush=True)
    return {}


def update_run_state(run_id, patch, context=None):
    try:
        api_url = context.get("apiUrl") if context else API_URL
        api_secret = context.get("internalApiSecret") if context else None
        
        url = f"{api_url}/workflows/runs/{run_id}/state"
        headers = {}
        if api_secret:
            headers["X-Internal-API-Secret"] = api_secret
            
        requests.patch(url, json=patch, headers=headers, timeout=30)
    except requests.RequestException as e:
        print(f"Failed to update run state for {run_id}: {e}", flush=True)


from services.audio import extract_audio_from_video # Import the new function

def handler_extract_metadata(context):
    video = context.get("video", {})
    return {
        "durationSeconds": video.get("durationSeconds"),
        "fileSize": video.get("size"),
        "mimeType": video.get("mimeType"),
        "originalName": video.get("originalName"),
    }


def handler_extract_audio(context):
    video_path = context.get("path")
    extracted_audio_path = extract_audio_from_video(video_path, output_dir="/tmp/extracted_audio") # Use a dedicated temp dir
    print(f"Extracted audio to: {extracted_audio_path}", flush=True)
    return {"extracted": True, "path": extracted_audio_path}


def get_node_handler(node_type):
    handlers = {
        "extract_metadata": handler_extract_metadata,
        "extract_audio": handler_extract_audio,
        "speech_to_text": analyze_transcript,
        "speaker_diarization": analyze_speakers,
        "scene_detection": analyze_scenes,
        "face_detection": analyze_faces,
        "object_detection": analyze_objects,
        "image_embeddings": analyze_embeddings,
        "transcript_analysis": analyze_transcript_topics,
        "topic_detection": analyze_transcript_topics,
        "story_detection": analyze_story,
        "hook_detection": analyze_hooks,
        "viral_segment_detection": analyze_viral_segments,
        "clip_ranking": analyze_clip_ranking,
        "timeline_generation": generate_timeline,
        "caption_generation": generate_captions,
        "auto_reframe": auto_reframe_clips,
        "render": render_clips,
        "export": export_clips,
        "create_export_record": create_export_record,
        "title_generation": generate_titles,
        "description_generation": generate_descriptions,
        "hashtag_generation": generate_hashtags,
        "auto_zoom": auto_zoom,
        "speaker_focus": speaker_focus,
    }
    return handlers.get(node_type)


from models.utils import download_if_url

def execute_workflow(payload):
    run_id = payload.get("runId")
    workflow = payload.get("workflow", {})
    video = payload.get("video", {})
    project = payload.get("project", {})
    settings = payload.get("settings", {})

    print(f"Starting workflow run {run_id}.", flush=True)

    local_video_path = download_if_url(video.get("path") or video.get("url"))

    user_types = [n.get("type") for n in workflow.get("nodes", [])]
    
    # Define dependency map for each node type
    node_dependencies = {
        'caption_generation': ['extract_metadata', 'extract_audio', 'speech_to_text'],
        'speaker_focus': ['extract_metadata', 'extract_audio', 'speech_to_text', 'speaker_diarization'],
        'auto_zoom': ['extract_metadata', 'extract_audio', 'speech_to_text'],
        'title_generation': ['extract_metadata', 'extract_audio', 'speech_to_text'],
        'description_generation': ['extract_metadata', 'extract_audio', 'speech_to_text'],
        'hashtag_generation': ['extract_metadata', 'extract_audio', 'speech_to_text'],
    }
    
    required_types = set(user_types)
    for t in user_types:
        deps = node_dependencies.get(t, [])
        for dep in deps:
            required_types.add(dep)
            
    # If we have editing or captioning nodes, we must have the standard clips workflow
    if any(t in required_types for t in ['caption_generation', 'speaker_focus', 'auto_zoom']):
        required_types.add('extract_metadata')
        required_types.add('extract_audio')
        required_types.add('speech_to_text')
        required_types.add('clip_ranking')
        required_types.add('timeline_generation')
        required_types.add('render')
        required_types.add('export')

    # Ensure only active and required standard default nodes are executed autonomously
    all_default_types = [
        'extract_metadata',
        'extract_audio',
        'speech_to_text',
        'speaker_diarization',
        'scene_detection',
        'face_detection',
        'object_detection',
        'image_embeddings',
        'transcript_analysis',
        'topic_detection',
        'story_detection',
        'hook_detection',
        'viral_segment_detection',
        'clip_ranking',
        'timeline_generation',
        'caption_generation',
        'auto_reframe',
        'render',
        'export',
    ]

    existing_nodes = {n.get("type"): n for n in workflow.get("nodes", [])}
    final_nodes = []
    
    # Keep only required types in default order
    active_types = [t for t in all_default_types if t in required_types]
    
    for order, t in enumerate(active_types):
        if t in existing_nodes:
            node = existing_nodes[t]
            node["order"] = order
            final_nodes.append(node)
        else:
            final_nodes.append({
                "id": f"auto-{t}",
                "type": t,
                "label": t.replace("_", " ").title(),
                "order": order,
                "config": {}
            })

    nodes = final_nodes

    context = {
        "runId": run_id,
        "video": video,
        "project": project,
        "settings": settings,
        "path": local_video_path,
        "audioPath": local_video_path,
        "videoPath": local_video_path,
        "durationSeconds": video.get("durationSeconds"),
        "internalApiSecret": payload.get("internalApiSecret"), # Ensure secret is in context
        "apiUrl": payload.get("apiUrl"), # Ensure apiUrl is in context
        "workflow": {"nodes": nodes} # Pass updated nodes with configuration to context
    }

    # Fetch initial run state to resume completed nodes and context outputs
    db_run = fetch_run_state(run_id, payload)
    completed_nodes = {}
    node_results = []
    
    if db_run:
        # Load pre-existing completed node results
        for res in db_run.get("nodeResults", []):
            if res.get("status") == "completed":
                completed_nodes[res.get("nodeId")] = res.get("output")
                node_results.append(res)
                
        # Load pre-existing context outputs from the last run
        last_outputs = db_run.get("outputs", {})
        if isinstance(last_outputs, dict):
            for k, v in last_outputs.items():
                if k not in ["runId", "video", "project", "settings", "path", "audioPath", "videoPath", "durationSeconds", "internalApiSecret", "apiUrl"]:
                    context[k] = v

    for index, node in enumerate(nodes):
        node_id = node.get("id")
        node_type = node.get("type")
        node_label = node.get("label", node_type)
        progress = round((index / len(nodes)) * 100)

        # Check if the run has been paused or cancelled
        current_run = fetch_run_state(run_id, context)
        if current_run and current_run.get("status") in ["paused", "cancelled", "stopping"]:
            print(f"Workflow run {run_id} is paused/cancelled. Stopping execution gracefully.", flush=True)
            return

        # Check if this node is already completed (from previous run)
        if node_id in completed_nodes:
            print(f"Node {node_label} ({node_type}) already completed. Restoring saved outputs.", flush=True)
            output = completed_nodes[node_id]
            context[node_type] = deepcopy(output)
            continue

        print(f"Executing node {index + 1}/{len(nodes)}: {node_label} ({node_type})", flush=True)

        update_run_state(
            run_id,
            {
                "status": "running",
                "progress": progress,
                "currentStep": f"Running: {node_label}",
                "activeNodeId": node_id,
            },
            context
        )

        handler = get_node_handler(node_type)
        if not handler:
            print(f"No handler for node type: {node_type}, skipping.", flush=True)
            continue

        try:
            output = handler(context)
            context[node_type] = deepcopy(output)
            node_results.append({"nodeId": node_id, "status": "completed", "output": output})
            print(f"Node {node_label} completed.", flush=True)
        except Exception as e:
            print(f"Node {node_label} failed: {e}", flush=True)
            update_run_state(
                run_id,
                {
                    "status": "failed",
                    "progress": 100,
                    "currentStep": f"Failed at: {node_label}",
                    "activeNodeId": None,
                    "outputs": context, # Save current context as outputs
                    "nodeResults": node_results,
                },
                context
            )
            return {"status": "failed", "error": str(e)}

    update_run_state(
        run_id,
        {
            "status": "completed",
            "progress": 100,
            "currentStep": "Workflow completed",
            "activeNodeId": None,
            "outputs": context, # Save final context as outputs
            "nodeResults": node_results,
        },
        context
    )

    print(f"Workflow run {run_id} completed successfully.", flush=True)

    return {
        "status": "completed",
        "results": context,
    }


def run_workflow(payload):
    # Run the actual workflow in a background thread so we can return immediately
    thread = threading.Thread(target=execute_workflow, args=(payload,))
    thread.daemon = True
    thread.start()
    return {"status": "queued", "runId": payload.get("runId")}
