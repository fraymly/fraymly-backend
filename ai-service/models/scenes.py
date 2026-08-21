from models.utils import has_module, download_if_url
import os


def _detect_with_scenemanager(payload):
    try:
        if not has_module('scenedetect'):
            return None

        from scenedetect import VideoManager, SceneManager
        from scenedetect.detectors import ContentDetector

        video_path = payload.get('video', {}).get('url') or payload.get('path') or payload.get('videoPath') or payload.get('filePath')
        video_path = download_if_url(video_path)
        
        if not video_path or not os.path.exists(video_path):
            return None

        video_manager = VideoManager([video_path])
        scene_manager = SceneManager()
        scene_manager.add_detector(ContentDetector(threshold=payload.get('threshold', 27.0)))
        video_manager.set_downscale_factor()
        video_manager.start()
        scene_manager.detect_scenes(frame_source=video_manager)
        scene_list = scene_manager.get_scene_list()

        scenes = [
            {'scene': idx + 1, 'start': round(start.get_seconds(), 2), 'end': round(end.get_seconds(), 2)}
            for idx, (start, end) in enumerate(scene_list)
        ]
        return {'scenes': scenes}
    except Exception:
        return None


def detect_scenes(payload):
    real = _detect_with_scenemanager(payload)
    if real:
        return real

    duration = float(payload.get('durationSeconds') or 180)
    scenes = []
    scene_length = max(10.0, round(duration / 5, 2))
    start = 0.0
    index = 1

    while start < duration:
        end = min(duration, round(start + scene_length, 2))
        scenes.append({'scene': index, 'start': round(start, 2), 'end': end})
        start = end
        index += 1

    return {'scenes': scenes}