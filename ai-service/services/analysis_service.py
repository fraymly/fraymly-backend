import os
import tempfile

import requests
from models.transcript import transcribe, analyze_transcript as _analyze_transcript_model
from models.speakers import diarize
from models.director import plan_shorts
from models.scenes import detect_scenes
from models.faces import detect_faces
from models.objects import detect_objects
from models.embeddings import embed_scene
from models.director import plan_shorts
from services.ffmpeg_service import render_video_clip

REQUIRE_TRANSCRIPT_FOR_DIARIZATION = False

API_URL = os.getenv("API_URL", "http://localhost:4000/api/internal")

def analyze_transcript(payload):
    return transcribe(payload)

# def analyze_speakers(payload):
#     if "transcript" not in payload and "speech_to_text" not in payload:
#         print("No transcript in payload, transcribing for diarization fallback.", flush=True)
#         # If transcript is not in payload, and speech_to_text node hasn't run,
#         # then we need to transcribe. Pass the full payload (context) to transcribe.
#         payload["transcript"] = transcribe(payload)
#     return diarize(payload)

def analyze_speakers(payload):
    if (
        REQUIRE_TRANSCRIPT_FOR_DIARIZATION
        and "transcript" not in payload
        and "speech_to_text" not in payload
    ):
        print(
            "No transcript in payload, transcribing for diarization.",
            flush=True,
        )
        payload["transcript"] = transcribe(payload)

    return diarize(payload)

def analyze_transcript_topics(payload):
    return _analyze_transcript_model(payload)

def analyze_story(payload):
    return {"summary": _analyze_transcript_model(payload)["summary"]}

def analyze_hooks(payload):
    return {"hooks": analyze_shorts(payload)["hooks"]}

def analyze_viral_segments(payload):
    return {"clips": analyze_shorts(payload)["clips"]}

def analyze_clip_ranking(payload):
    # The analyze_shorts function already returns clips in a ranked order.
    return {"clips": analyze_shorts(payload)["clips"]}


def analyze_video(payload):
    # This function is a heavy-duty analysis that runs multiple models.
    # It should check for existing results in the payload (context) before running.
    transcript = payload.get("speech_to_text") or transcribe(payload) # transcribe will use audioPath from payload

    transcript_analysis = payload.get("transcript_analysis") or analyze_transcript_topics({ # analyze_transcript_topics will use transcript from payload
        "transcript": transcript.get("transcript"),
        "transcriptSeed": payload.get("transcriptSeed") or payload.get("video", {}).get("originalName"),
    })

    speakers = payload.get("speaker_diarization") or diarize({ # diarize will use audioPath from payload
        **payload.get("video", {}),
        "transcript": transcript,
    })

    scenes = payload.get("scene_detection") or detect_scenes(payload) # detect_scenes will use videoPath from payload
    faces = payload.get("face_detection") or detect_faces(payload)
    objects = payload.get("object_detection") or detect_objects(payload)
    embeddings = payload.get("image_embeddings") or embed_scene(payload)

    director = plan_shorts({
        # Pass all existing and newly-generated data to the director
        "projectName": payload.get("projectName") or payload.get("videoTitle"),
        "durationSeconds": payload.get("durationSeconds"),
        "targetCount": payload.get("targetCount"),
        "targetDuration": payload.get("targetDuration"),
        "hooks": ["Question", "Curiosity", "Story", "Shock"],
        "topics": transcript_analysis["topics"],
        "scenes": scenes.get("scenes") if isinstance(scenes, dict) else scenes,
        "speakers": speakers,
        "faces": faces,
        "objects": objects,
        "embeddings": embeddings,
        "transcript": transcript,
        "transcriptAnalysis": transcript_analysis,
    })

    return {
        "transcript": transcript,
        "speakerDiarization": speakers,
        "sceneDetection": scenes,
        "faceDetection": faces,
        "objectDetection": objects,
        "imageEmbeddings": embeddings,
        "transcriptAnalysis": transcript_analysis,
        "director": director,
    }


def analyze_shorts(payload):
    # Use pre-computed transcript if available in context
    # transcript = payload.get("speech_to_text")
    # if not transcript:
    #     transcript = transcribe(payload)  # Fallback if not pre-computed
    transcript = payload.get("speech_to_text") or transcribe(payload) # transcribe will use audioPath from payload

    # Use pre-computed transcript analysis if available in context
    # transcript_analysis = payload.get("transcript_analysis")
    # if not transcript_analysis:
    #     transcript_analysis = analyze_transcript_topics({
    #         "transcript": transcript["transcript"],
    #         "transcriptSeed": payload.get("transcriptSeed") or payload.get("videoTitle") or "",
    #     })
    transcript_analysis = payload.get("transcript_analysis") or analyze_transcript_topics({ # analyze_transcript_topics will use transcript from payload
        "transcript": transcript.get("transcript"),
        "transcriptSeed": payload.get("transcriptSeed") or payload.get("video", {}).get("originalName") or "",
    })

    # Use pre-computed scenes if available in context
    # scenes = payload.get("scene_detection")
    # if not scenes and "scene_detection" in payload: # Check for explicit null from a skipped step
    #     scenes = detect_scenes(payload)
    scenes = payload.get("scene_detection") or detect_scenes(payload) # detect_scenes will use videoPath from payload

    # Use pre-computed speakers if available in context
    # speakers = payload.get("speaker_diarization")
    # if not speakers and "speaker_diarization" in payload: # Check for explicit null
    #     speakers = analyze_speakers(payload)  # Fallback if not pre-computed
    speakers = payload.get("speaker_diarization") or analyze_speakers(payload) # analyze_speakers will use audioPath from payload

    director = plan_shorts({
        "projectName": payload.get("projectName") or payload.get("videoTitle"),
        "durationSeconds": payload.get("durationSeconds"),
        "targetCount": payload.get("targetCount"),
        "targetDuration": payload.get("targetDuration"),
        "hooks": ["Question", "Curiosity", "Story", "Shock"],
        "topics": transcript_analysis.get("topics", []),
        "scenes": scenes.get("scenes", []) if isinstance(scenes, dict) else scenes,
        "speakers": speakers.get("speakers", []) if isinstance(speakers, dict) else speakers,
        "transcript": transcript,
        "transcriptAnalysis": transcript_analysis,
    })
    return {
        "summary": director["summary"],
        "hooks": ["Question", "Curiosity", "Story", "Shock"],
        "clips": director["clips"],
        "topics": director["topics"],
        "titles": director["titles"],
        "descriptions": director["descriptions"],
        "hashtags": director["hashtags"],
        "analysis": {
            "transcript": transcript,
            "transcriptAnalysis": transcript_analysis,
            "scenes": scenes,
            "speakers": speakers,
            "director": director,
        },
    }


def analyze_scenes(payload):
    return detect_scenes(payload)

def analyze_faces(payload):
    return detect_faces(payload)

def analyze_objects(payload):
    return detect_objects(payload)

def analyze_embeddings(payload):
    return embed_scene(payload)

def generate_timeline(payload):
    # This would generate a timeline based on detected scenes, speakers, etc.
    # For now, we'll return a placeholder based on scene detection.
    scenes = payload.get("scene_detection", {"scenes": []})
    return {"timeline": scenes.get("scenes")}

def generate_captions(payload):
    # Placeholder for generating captions for viral clips
    return {"captions": ["Caption for clip 1", "Caption for clip 2"]}

def auto_reframe_clips(payload):
    # Placeholder for auto-reframing logic
    return {"reframed": True, "clipCount": len(payload.get("viral_segment_detection", {}).get("clips", []))}

def render_clips(payload):
    # This handler will generate clips based on the director's plan
    # and then trigger the creation of export records in the Node.js backend.
    director_plan = plan_shorts(payload) # Assuming plan_shorts can take the full context
    clips = director_plan.get("clips", [])

    created_exports = []
    # The main payload for the workflow run contains the secret.
    # We need to pass it to the create_export_record function.
    api_secret = payload.get("internalApiSecret")

    # Use a temporary directory within the container to render the clip
    temp_dir = tempfile.mkdtemp(prefix="rendered_clip_")

    for clip in clips:
        output_filename = f"{clip['index']}-{clip['title']}.mp4".replace(" ", "_") 
        output_path = os.path.join(temp_dir, output_filename)


        export_payload = {
            "projectId": payload["project"]["_id"],
            "ownerId": payload["project"].get("ownerId"),
            "videoId": payload["video"]["_id"],
            "workflowRunId": payload["runId"],
            "status": "ready",
            "filePath": output_path, # Temporary path for the file to be uploaded
            "durationSeconds": clip["durationSeconds"],
            "title": clip["title"],
            "clipIndex": clip["index"],
            # Pass the secret along in the payload to the helper function
            "internalApiSecret": api_secret,
            "apiUrl": payload.get("apiUrl"), # Pass apiUrl to create_export_record
        }
        
        # Actually render the video clip using ffmpeg
        render_video_clip(
            input_path=payload.get("video", {}).get("path"),
            output_path=output_path,
            start_time=clip["startTime"],
            duration=clip["durationSeconds"],
            payload=payload
        )

        created_exports.append(create_export_record(export_payload))

    return {"rendered": True, "clips": clips, "exports": created_exports}

def export_clips(payload):
    return {"exported": True, "exportCount": len(payload.get("viral_segment_detection", {}).get("clips", []))}

def generate_titles(payload):
    # Retrieve titles from context or analyze_shorts fallback
    return {"titles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]}

def generate_descriptions(payload):
    return {"descriptions": ["Description 1", "Description 2", "Description 3"]}

def generate_hashtags(payload):
    return {"hashtags": ["#shorts", "#viral", "#video"]}

def auto_zoom(payload):
    return {"zoom": True}

def speaker_focus(payload):
    return {"focused": True}

def create_export_record(payload):
    api_url = payload.pop("apiUrl", None) or API_URL
    api_secret = payload.pop("internalApiSecret", None)
    file_path = payload.pop("filePath", None)

    if not file_path or not os.path.exists(file_path):
        raise ValueError(f"File to upload does not exist at path: {file_path}")

    headers = {
        "X-Internal-API-Secret": api_secret
    }

    try:
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f, "video/mp4")}
            # The rest of the payload is sent as form data (increased timeout to 180s for uploading large video files)
            response = requests.post(f"{api_url}/exports", headers=headers, data=payload, files=files, timeout=180)
            response.raise_for_status()
            print(f"Export record created: {response.json()}", flush=True)
            return response.json()
    except requests.RequestException as e:
        print(f"Failed to create export record: {e}", flush=True)
        raise e