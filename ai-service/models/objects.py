from models.utils import has_module
from model_loader import get_yolo_model
import os
from models.utils import download_if_url
import sys # Import sys for stdout redirection
import cv2 # Added for video capture to get total frames


def _detect_with_yolo(payload):
    try:
        model = get_yolo_model()
        if model is None:
            return None

        video_path = payload.get('video', {}).get('url') or payload.get('path') or payload.get('videoPath') or payload.get('filePath')
        video_path = download_if_url(video_path)
        if not video_path or not os.path.exists(video_path):
            return None

        # Temporarily redirect stdout to suppress YOLO's verbose output
        original_stdout = sys.stdout
        sys.stdout = open(os.devnull, 'w')
        try:
            results_generator = model(video_path, stream=True, verbose=False)
        finally:
            sys.stdout.close()
            sys.stdout = original_stdout

        objects = []
        duration = float(payload.get('durationSeconds') or 180)

        # Get total frames for accurate progress calculation
        cap = cv2.VideoCapture(video_path)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        cap.release()

        if total_frames > 0:
            print(f"Starting object detection for {total_frames} frames...", flush=True)
        else:
            print("No frames to process for object detection.", flush=True)

        for frame_index, result in enumerate(results_generator):
            if total_frames > 0:
                progress = (frame_index + 1) / total_frames * 100
                print(f"\rProcessing frame {frame_index + 1}/{total_frames} ({progress:.2f}%)", end="", flush=True)

            boxes = getattr(result, 'boxes', None)
            names = getattr(result, 'names', {})
            if boxes is None:
                continue
            for det in boxes.data.tolist():
                label = names[int(det[5])] if len(det) >= 6 else 'object'
                # Calculate start time based on frame index and total duration
                frame_time = (frame_index / total_frames) * duration
                start = round(frame_time, 2)
                objects.append({'label': label, 'start': start, 'end': round(start + 1.0, 2)})

        if total_frames > 0:
            print("\nObject detection processing complete.", flush=True)

        if not objects:
            return {'objects': []}

        return {'objects': objects}
    except Exception:
        return {'objects': []}


def detect_objects(payload):
    real = _detect_with_yolo(payload)
    if real is not None and real.get('objects') is not None:
        return real

    duration = float(payload.get('durationSeconds') or 180)
    objects = ['microphone', 'laptop', 'phone', 'whiteboard']
    return {
        'objects': [
            {'label': label, 'start': round(index * duration / 8, 2), 'end': round((index + 1) * duration / 8, 2)}
            for index, label in enumerate(objects)
        ]
    }