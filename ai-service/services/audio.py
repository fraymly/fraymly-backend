import subprocess
import os
import uuid
from models.utils import download_if_url

def extract_audio_from_video(video_path, output_dir="/tmp/extracted_audio"):
    video_path = download_if_url(video_path)
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found: {video_path}")

    # Create a unique filename for the extracted audio
    audio_filename = f"{uuid.uuid4()}.wav"
    audio_path = os.path.join(output_dir, audio_filename)

    # Ensure the output directory exists
    os.makedirs(output_dir, exist_ok=True)

    # FFmpeg command to extract audio
    command = [
        "ffmpeg",
        "-i", video_path,
        "-vn",  # No video
        "-acodec", "pcm_s16le",  # PCM 16-bit little-endian audio codec (WAV compatible)
        "-ar", "16000",  # Audio sample rate (16kHz is common for speech models)
        "-ac", "1",  # Mono audio
        audio_path
    ]

    subprocess.run(command, check=True, capture_output=True)
    return audio_path