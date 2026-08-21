import os

def load_env_file():
    # Look for .env in current dir or parent dir
    possible_paths = [
        '.env',
        '../.env',
        '../../.env',
    ]
    for p in possible_paths:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        k, v = line.split('=', 1)
                        os.environ[k.strip()] = v.strip().strip('"').strip("'")
            break

# Load the environment variables from .env if present
load_env_file()

class AIConfig:
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    OPENAI_MODEL = os.getenv('OPENAI_MODEL', 'gpt-5.4-nano')
    WHISPER_MODEL = os.getenv('WHISPER_MODEL', 'large-v3-turbo')
    PYANNOTE_MODEL = os.getenv('PYANNOTE_MODEL', 'pyannote/speaker-diarization-community-1')
    SCENEDETECT_THRESHOLD = float(os.getenv('SCENEDETECT_THRESHOLD', '27.0'))
    FACE_DETECTION_CONFIDENCE = float(os.getenv('FACE_DETECTION_CONFIDENCE', '0.5'))
    YOLO_MODEL = os.getenv('YOLO_MODEL', 'yolov8n.pt')
    SIGLIP_MODEL = os.getenv('SIGLIP_MODEL', 'google/siglip-base-patch16-224')    
    MODEL_CACHE_DIR = os.getenv('MODEL_CACHE_DIR', os.path.join(os.getcwd(), 'model_cache'))
config = AIConfig()
