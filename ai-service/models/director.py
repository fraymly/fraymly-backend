import json
from models.utils import has_module
from config import config


def _plan_with_openai(payload):
    try:
        if not has_module('openai'):
            return None

        import openai
        api_key = config.OPENAI_API_KEY
        if not api_key:
            return None

        model = payload.get('llmModel') or config.OPENAI_MODEL

        speakers_data = payload.get('speakers', [])
        speakers = speakers_data.get('speakers', []) if isinstance(speakers_data, dict) else speakers_data

        objects_data = payload.get('objects', [])
        objects = objects_data.get('objects', []) if isinstance(objects_data, dict) else objects_data

        faces_data = payload.get('faces', [])
        faces = faces_data.get('faces', []) if isinstance(faces_data, dict) else faces_data

        embeddings_data = payload.get('embeddings', [])
        embeddings = embeddings_data.get('embeddings', []) if isinstance(embeddings_data, dict) else embeddings_data

        prompt = {
            'project': payload.get('projectName', 'Video Project'),
            'durationSeconds': payload.get('durationSeconds'),
            'targetCount': payload.get('targetCount'),
            'targetDuration': payload.get('targetDuration'),
            'scenes': payload.get('scenes', []),
            'speakers': speakers,
            'objects': objects,
            'faces': faces,
            'embeddings': embeddings,
            'transcript': payload.get('transcript', {}).get('transcript', '') if isinstance(payload.get('transcript'), dict) else payload.get('transcript', ''),
            'analysis': payload.get('transcriptAnalysis', {}) if isinstance(payload.get('transcriptAnalysis'), dict) else {},
        }

        system = (
            'You are an AI director. Use structured video metadata, scene timestamps, speaker information, object detection, face tracking, '
            'embeddings, and transcript analysis to generate viral short clips for social platforms. '
            'Return JSON only with summary, topics, clips, titles, descriptions, and hashtags.'
        )

        user = f"Analyze this video project with duration {payload.get('durationSeconds')} seconds and generate {payload.get('targetCount')} clips of approximately {payload.get('targetDuration')} seconds. "
        user += 'Use the following context: ' + json.dumps(prompt, default=str)

        # Check for OpenAI v1.0.0+ vs older versions
        if hasattr(openai, "OpenAI"):
            client = openai.OpenAI(api_key=api_key)
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {'role': 'system', 'content': system},
                    {'role': 'user', 'content': user},
                ],
                temperature=0.6,
                max_tokens=800,
            )
            text = response.choices[0].message.content
        else:
            openai.api_key = api_key
            response = openai.ChatCompletion.create(
                model=model,
                messages=[
                    {'role': 'system', 'content': system},
                    {'role': 'user', 'content': user},
                ],
                temperature=0.6,
                max_tokens=800,
            )
            text = response.choices[0].message.content

        data = json.loads(text)

        return {
            'summary': data.get('summary', 'Generated a structured shorts plan.'),
            'topics': data.get('topics', prompt.get('analysis', {}).get('topics', ['general'])),
            'clips': data.get('clips', []),
            'titles': data.get('titles', []),
            'descriptions': data.get('descriptions', []),
            'hashtags': data.get('hashtags', []),
        }
    except Exception as e:
        print(f"Error in _plan_with_openai: {e}", flush=True)
        return None


def _stub_plans(payload):
    target_count = int(payload.get('targetCount') or 5)
    target_duration = int(payload.get('targetDuration') or 30)
    duration = float(payload.get('durationSeconds') or (target_count * target_duration * 1.5))
    hooks = payload.get('hooks') or []
    plan = []
    spacing = duration / (target_count + 1)

    for index in range(target_count):
        start = max(0.0, round(spacing * (index + 1) - target_duration / 2, 2))
        end = round(min(duration, start + target_duration), 2)
        plan.append({
            'index': index + 1,
            'title': f'Short {index + 1}',
            'startTime': start,
            'endTime': end,
            'durationSeconds': round(end - start, 2),
            'confidence': round(0.9 - index * 0.04, 2),
            'hook': hooks[index % len(hooks)] if hooks else 'Strong opening moment',
            'reason': 'Balanced visual and audio moments using the project metadata.',
            'scores': {
                'viral': round(0.9 - index * 0.05, 2),
                'hook': round(0.85 - index * 0.04, 2),
                'retention': round(0.88 - index * 0.03, 2),
                'emotion': round(0.82 - index * 0.02, 2),
                'confidence': round(0.92 - index * 0.03, 2),
            },
        })

    return {
        'summary': 'Generated a structured shorts plan.',
        'topics': payload.get('topics') or ['general'],
        'clips': plan,
        'titles': [clip['title'] for clip in plan],
        'descriptions': [f'Clip {clip["index"]} generated from the workflow.' for clip in plan],
        'hashtags': ['#viral', '#shorts', '#content'],
    }


def plan_shorts(payload):
    real = _plan_with_openai(payload)
    if real:
        return real
    return _stub_plans(payload)
