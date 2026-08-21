import os
import time
import traceback
import platform
from pathlib import Path
from config import config
from models.utils import has_module
from huggingface_hub import get_token

token = os.getenv("HF_TOKEN") or get_token()

MODEL_CACHE_DIR = os.getenv("MODEL_CACHE_DIR", os.path.join(os.getcwd(), "model_cache"))
compute_type = "int8"

_whisper_model = None
_pyannote_pipeline = None
_siglip_processor = None
_siglip_model = None
_yolo_model = None


def _ensure_cache_dir():
    Path(MODEL_CACHE_DIR).mkdir(parents=True, exist_ok=True)
    os.environ.setdefault("TRANSFORMERS_CACHE", MODEL_CACHE_DIR)
    os.environ.setdefault("HF_HOME", MODEL_CACHE_DIR)
    os.environ.setdefault("HF_DATASETS_CACHE", MODEL_CACHE_DIR)
    os.environ.setdefault("XDG_CACHE_HOME", MODEL_CACHE_DIR)
    return MODEL_CACHE_DIR


def _log(message):
    print(message, flush=True)


def _load_with_trace(name, loader):
    start = time.perf_counter()
    _log(f"[{name}] starting...")
    try:
        value = loader()
        elapsed = time.perf_counter() - start
        _log(f"[{name}] done in {elapsed:.2f}s")
        return value
    except Exception:
        elapsed = time.perf_counter() - start
        _log(f"[{name}] failed in {elapsed:.2f}s")
        traceback.print_exc()
        return None


def load_whisper_model(model_name=None):
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model

    if not has_module("faster_whisper"):
        _log("[Whisper] faster_whisper not installed")
        return None

    from faster_whisper import WhisperModel

    model_name = model_name or config.WHISPER_MODEL
    _ensure_cache_dir()

    def _loader():
        nonlocal model_name
        return WhisperModel(model_name, device="cpu", compute_type=compute_type)

    _whisper_model = _load_with_trace(f"Whisper {model_name}", _loader)
    return _whisper_model


def load_pyannote_pipeline(model_name=None):
    global _pyannote_pipeline
    if _pyannote_pipeline is not None:
        return _pyannote_pipeline

    if not has_module("pyannote.audio"):
        _log("[Pyannote] pyannote.audio not installed")
        return None

    from pyannote.audio import Pipeline

    model_name = model_name or config.PYANNOTE_MODEL
    _ensure_cache_dir()

    def _loader():
        token = os.getenv("HF_TOKEN")
        if token:
            return Pipeline.from_pretrained(model_name, token=token, cache_dir=MODEL_CACHE_DIR)
        return Pipeline.from_pretrained(model_name, cache_dir=MODEL_CACHE_DIR)

    _pyannote_pipeline = _load_with_trace(f"Pyannote {model_name}", _loader)
    return _pyannote_pipeline


def load_siglip_model(model_name=None):
    global _siglip_processor, _siglip_model
    if _siglip_processor is not None and _siglip_model is not None:
        return _siglip_processor, _siglip_model

    if not has_module("transformers"):
        _log("[SigLIP] transformers not installed")
        return None, None

    from transformers import AutoProcessor, AutoModel

    model_name = model_name or config.SIGLIP_MODEL
    _ensure_cache_dir()

    def _loader():
        processor = AutoProcessor.from_pretrained(model_name)
        model = AutoModel.from_pretrained(model_name)
        return processor, model

    result = _load_with_trace(f"SigLIP {model_name}", _loader)
    if result is None:
        _siglip_processor = None
        _siglip_model = None
    else:
        _siglip_processor, _siglip_model = result
    return _siglip_processor, _siglip_model


def load_yolo_model(model_name=None):
    global _yolo_model
    if _yolo_model is not None:
        return _yolo_model

    if not has_module("ultralytics"):
        _log("[YOLO] ultralytics not installed")
        return None

    from ultralytics import YOLO

    model_name = model_name or config.YOLO_MODEL
    _ensure_cache_dir()

    def _loader():
        return YOLO(model_name)

    _yolo_model = _load_with_trace(f"YOLO {model_name}", _loader)
    return _yolo_model


def load_all_models():
    _ensure_cache_dir()
    _log("Loading AI models into memory...")
    _log(f"Platform      : {platform.platform()}")
    _log(f"Python        : {platform.python_version()}")
    _log(f"Compute type  : {compute_type}")
    _log(f"Cache dir     : {MODEL_CACHE_DIR}")

    whisper = load_whisper_model()
    _log(f"Whisper loaded: {whisper is not None}")

    pyannote = load_pyannote_pipeline()
    _log(f"Pyannote loaded: {pyannote is not None}")

    processor, siglip = load_siglip_model()
    _log(f"SigLIP loaded : {processor is not None and siglip is not None}")

    yolo = load_yolo_model()
    _log(f"YOLO loaded   : {yolo is not None}")

    return {
        "whisper": whisper,
        "pyannote": pyannote,
        "siglip_processor": processor,
        "siglip_model": siglip,
        "yolo": yolo,
    }


def get_whisper_model():
    return _whisper_model


def get_pyannote_pipeline():
    return _pyannote_pipeline


def get_siglip_processor_model():
    return _siglip_processor, _siglip_model


def get_yolo_model():
    return _yolo_model


def download_models():
    _ensure_cache_dir()
    _log("Downloading AI models to cache...")
    load_all_models()
    _log("Model download complete.")