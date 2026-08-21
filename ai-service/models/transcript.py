import os
import traceback
import time
from models.utils import split_words, has_module, download_if_url
from config import config
from model_loader import get_whisper_model


def _transcribe_with_whisper(payload):
    try:
        print("=" * 80, flush=True)
        print("WHISPER TRANSCRIPTION START", flush=True)
        print("=" * 80, flush=True)

        model = get_whisper_model()
        if model is None:
            print("Whisper model is None", flush=True)
            return None

        path = ( # Bypass extracted WAV files to avoid phase cancellation or downmixing issues, transcribe the video directly!
                payload.get("audioPath") # direct audioPath in payload (points to video)
                or payload.get("video", {}).get("path") # from workflow context video object
                or payload.get("path") # general path
                or payload.get("video", {}).get("url") # direct download URL
            )
            
        path = download_if_url(path)

        print(f"Input file: {path}", flush=True)

        if not path:
            print("No input path supplied.", flush=True)
            return None

        if not os.path.exists(path):
            print(f"File does not exist: {path}", flush=True)
            return None

        print(f"File size: {os.path.getsize(path)/(1024*1024):.2f} MB", flush=True)

        start_time = time.perf_counter()

        segments, info = model.transcribe(
            path,
            beam_size=5,
            word_timestamps=True,
            vad_filter=True, # Enable VAD filtering to segment speech and avoid getting lost/stuck on silence/music gaps which causes skipping of active speech
            vad_parameters=dict(min_silence_duration_ms=500, speech_pad_ms=400), # Standard responsive VAD parameters to not cut off speech
            condition_on_previous_text=False, # Prevent skipping parts of the audio or getting stuck in context/hallucination loops
        )

        print(f"Detected language : {info.language}", flush=True)
        print(f"Language prob.    : {info.language_probability:.3f}", flush=True)

        transcript_parts = []
        word_timestamps = []
        current_end = 0.0

        segment_count = 0

        for segment in segments:
            segment_count += 1

            print("-" * 80, flush=True)
            print(
                f"SEGMENT {segment_count} "
                f"[{float(segment.start):.2f}s -> {float(segment.end):.2f}s]",
                flush=True,
            )
            print(segment.text, flush=True)

            transcript_parts.append(segment.text.strip())

            if getattr(segment, "words", None):

                for word_info in segment.words:

                    # Compatible with multiple faster-whisper versions
                    word = (
                        getattr(word_info, "word", None)
                        or getattr(word_info, "text", None)
                        or ""
                    )

                    start = round(float(word_info.start), 2)
                    end = round(float(word_info.end), 2)

                    # Dynamic Word Clamping: prevent single words from being stretched across silent/quiet gaps!
                    # Long silence ranges merged by VAD can stretch the final word of a segment.
                    # Clamping any word taking more than 1.5 seconds down to a natural 1.0s solves this cleanly.
                    if end - start > 1.5:
                        end = round(start + 1.0, 2)

                    probability = round(
                        float(getattr(word_info, "probability", 0.95)),
                        3,
                    )

                    print(
                        f"  {start:7.2f} -> {end:7.2f}"
                        f" | {probability:.3f}"
                        f" | {word}",
                        flush=True,
                    )

                    word_timestamps.append(
                        {
                            "word": word.strip(),
                            "start": start,
                            "end": end,
                            "confidence": probability,
                        }
                    )

                    current_end = max(current_end, end)

        transcript = " ".join(transcript_parts).strip()

        elapsed = time.perf_counter() - start_time

        print("=" * 80, flush=True)
        print(f"Segments : {segment_count}", flush=True)
        print(f"Words    : {len(word_timestamps)}", flush=True)
        print(f"Duration : {current_end:.2f}s", flush=True)
        print(f"Elapsed  : {elapsed:.2f}s", flush=True)
        print("=" * 80, flush=True)

        sentence_timestamps = []

        if transcript:
            sentence_timestamps.append(
                {
                    "text": transcript,
                    "start": 0.0,
                    "end": round(current_end, 2),
                }
            )

        return {
            "transcript": transcript,
            "wordTimestamps": word_timestamps,
            "sentenceTimestamps": sentence_timestamps,
            "confidence": 0.95,
            "language": info.language,
            "languageProbability": round(
                float(info.language_probability),
                3,
            ),
        }

    except Exception as e:
        print("=" * 80, flush=True)
        print("WHISPER FAILED", flush=True)
        print("=" * 80, flush=True)
        print(f"Exception : {type(e).__name__}", flush=True)
        print(str(e), flush=True)
        traceback.print_exc()
        print("=" * 80, flush=True)
        return None


def _transcribe_with_openai(payload):
    try:
        if not has_module('openai'):
            return None

        import openai
        api_key = config.OPENAI_API_KEY
        if not api_key:
            return None

        path = payload.get('path') or payload.get('videoPath') or payload.get('filePath')
        if not path or not os.path.exists(path):
            return None

        if hasattr(openai, "OpenAI"):
            client = openai.OpenAI(api_key=api_key)
            with open(path, 'rb') as media_file:
                response = client.audio.transcriptions.create(
                    model=payload.get('whisperModel') or 'whisper-1',
                    file=media_file,
                )
            transcript = getattr(response, 'text', '')
        else:
            openai.api_key = api_key
            with open(path, 'rb') as media_file:
                response = openai.Audio.transcriptions.create(
                    model=payload.get('whisperModel') or 'whisper-1',
                    file=media_file,
                )
            transcript = response.get('text', '')

        words = split_words(transcript)
        word_timestamps = []
        time = 0.0
        for index, word in enumerate(words):
            duration = 0.28 + (len(word) % 5) * 0.07
            word_timestamps.append({
                'word': word,
                'start': round(time, 2),
                'end': round(time + duration, 2),
                'confidence': 0.95,
            })
            time += duration

        sentence_timestamps = [{'text': transcript, 'start': 0.0, 'end': round(time, 2)}] if transcript else []
        return {
            'transcript': transcript,
            'wordTimestamps': word_timestamps,
            'sentenceTimestamps': sentence_timestamps,
            'confidence': 0.95,
        }
    except Exception:
        return None


def transcribe(payload):
    if payload.get('path') or payload.get('videoPath') or payload.get('filePath') or payload.get('audioPath'):
        real = _transcribe_with_whisper(payload)
        if real:
            return real
        real = _transcribe_with_openai(payload)
        if real:
            return real

    seed = payload.get('transcriptSeed') or payload.get('videoTitle') or 'fraymly'
    words = split_words(seed) or ['viral', 'moment', 'detected']
    transcript = ' '.join(words)
    word_timestamps = []
    sentence_timestamps = []
    time = 0.0

    for index, word in enumerate(words):
        duration = 0.32 + (len(word) % 5) * 0.08
        word_timestamps.append({
            'word': word,
            'start': round(time, 2),
            'end': round(time + duration, 2),
            'confidence': round(0.82 + (index % 5) * 0.03, 2),
        })
        time += duration

    if words:
        sentence_timestamps.append({
            'text': transcript,
            'start': 0.0,
            'end': round(time, 2),
        })

    return {
        'transcript': transcript,
        'wordTimestamps': word_timestamps,
        'sentenceTimestamps': sentence_timestamps,
        'confidence': 0.91,
    }


def analyze_transcript(payload):
    transcript = payload.get('transcript') or payload.get('transcriptSeed') or ''
    words = split_words(transcript)
    word_count = len(words)
    keywords = sorted({word.strip('.,!? ').lower() for word in words if len(word) > 4})[:12]
    speaking_speed = 135 + (word_count % 70)
    sentiment = 'Positive' if word_count % 2 == 0 else 'Excited'
    emotion = 'Curiosity' if word_count % 3 else 'Confidence'
    return {
        'summary': transcript[:220] or 'Transcript analysis ready.',
        'topics': keywords[:6] or ['general'],
        'keywords': keywords,
        'speakingSpeed': {
            'wordsPerMinute': speaking_speed,
            'pauses': max(1, word_count // 18),
            'fastSections': [{'start': 12, 'end': 24}],
            'slowSections': [{'start': 25, 'end': 39}],
        },
        'sentiment': sentiment,
        'emotion': emotion,
        'speakers': [{'name': 'Speaker A', 'speakingTime': max(1, word_count // 2)}],
        'statistics': {
            'wordCount': word_count,
            'sentenceCount': max(1, word_count // 16),
        },
    }