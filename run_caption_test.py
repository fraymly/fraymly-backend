import os
import sys
import subprocess

# Add ai-service to Python path to import our actual ffmpeg_service
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "ai-service")))

# Let's find a local video in uploads/videos
video_dir = "/Users/ayan/Projects/fraymlyAI-backend/uploads/videos"
videos = [f for f in os.listdir(video_dir) if f.endswith(".mp4")]

if not videos:
    print("No mp4 videos found in uploads/videos!")
    sys.exit(1)

input_video = os.path.join(video_dir, videos[0])
output_video = os.path.join(os.path.dirname(__file__), "caption_test_result.mp4")

print(f"Using input video: {input_video}")
print(f"Output video: {output_video}")

# Mock payload
payload = {
    "workflow": {
        "nodes": [
            {
                "type": "caption_generation",
                "config": {
                    "fontName": "Impact",
                    "fontSize": 24, # base font size
                    "textColor": "#FFFF00",
                    "strokeColor": "#000000",
                    "strokeWidth": 2,
                    "alignment": "bottom",
                    "textCase": "uppercase",
                    "cropMode": "cropped",
                    "zoomLevel": 100,
                    "verticalOffset": 50, # base vertical offset (from bottom)
                    "language": "en"
                }
            }
        ]
    },
    "speech_to_text": {
        "wordTimestamps": [
            {"word": "Hello", "start": 384.0, "end": 384.3},
            {"word": "World", "start": 384.3, "end": 384.6},
            {"word": "This", "start": 384.6, "end": 384.9},
            {"word": "Is", "start": 384.9, "end": 385.2},
            {"word": "A", "start": 385.2, "end": 385.4},
            {"word": "Test", "start": 385.4, "end": 385.7},
            {"word": "Of", "start": 385.7, "end": 386.0},
            {"word": "Precision", "start": 386.0, "end": 386.5},
            {"word": "Captions", "start": 386.5, "end": 387.0}
        ]
    }
}

def group_words_into_phrases(words, max_words=3, max_chars=18, max_gap=1.0):
    phrases = []
    current_phrase_words = []
    
    for w in words:
        word_text = w.get("word", "").strip()
        if not word_text:
            continue
        w_start = w.get("start", 0.0)
        w_end = w.get("end", 0.0)
        
        should_split = False
        if len(current_phrase_words) >= max_words:
            should_split = True
        elif current_phrase_words:
            last_word = current_phrase_words[-1]
            if w_start - last_word["end"] > max_gap:
                should_split = True
            elif len(" ".join([x["word"] for x in current_phrase_words]) + " " + word_text) > max_chars:
                should_split = True
                
        if should_split and current_phrase_words:
            phrase_text = " ".join([x["word"] for x in current_phrase_words])
            phrase_start = current_phrase_words[0]["start"]
            phrase_end = current_phrase_words[-1]["end"]
            
            if w_start - phrase_end < max_gap:
                phrase_end = w_start
                
            phrases.append({
                "text": phrase_text,
                "start": phrase_start,
                "end": phrase_end
            })
            current_phrase_words = []
            
        current_phrase_words.append({
            "word": word_text,
            "start": w_start,
            "end": w_end
        })
        
    if current_phrase_words:
        phrase_text = " ".join([x["word"] for x in current_phrase_words])
        phrase_start = current_phrase_words[0]["start"]
        phrase_end = current_phrase_words[-1]["end"]
        phrases.append({
            "text": phrase_text,
            "start": phrase_start,
            "end": phrase_end
        })
        
    return phrases

start_time = 384.0
duration = 10.0
clip_end = start_time + duration
ass_path = f"temp_subs_test.ass"

# Scale 6.0x (base font size 24 -> 144, stroke 2 -> 12, verticalOffset 50 -> 300)
scaled_font_size = 24 * 6
scaled_stroke_width = 2 * 6
scaled_vertical_offset = 50 * 6

# Generate mock .ass lines
ass_lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    "PlayResX: 1080",
    "PlayResY: 1920",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    f"Style: Default,Impact,{scaled_font_size},&H0000FFFF,&H000000FF,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,{scaled_stroke_width},0,2,10,10,{scaled_vertical_offset},1",
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
]

def fmt_time(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    cs = int(round((sec % 1) * 100))
    if cs >= 100:
        s += cs // 100
        cs = cs % 100
        if s >= 60:
            m += s // 60
            s = s % 60
            if m >= 60:
                h += m // 60
                m = m % 60
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

phrases = group_words_into_phrases(payload["speech_to_text"]["wordTimestamps"])

# Write dialogue lines with RELATIVE timestamps
for p in phrases:
    p_start = p["start"]
    p_end = p["end"]
    if p_end > start_time and p_start < clip_end:
        rel_start = max(0.0, p_start - start_time)
        rel_end = min(duration, p_end - start_time)
        if rel_end - rel_start > 0.02:
            ass_lines.append(f"Dialogue: 0,{fmt_time(rel_start)},{fmt_time(rel_end)},Default,,0,0,0,,{p['text'].upper()}")

with open(ass_path, "w", encoding="utf-8") as f:
    f.write("\n".join(ass_lines))

print(f"Written .ass file with relative timestamps:\n" + "\n".join(ass_lines[-5:]))

# setpts=PTS-STARTPTS filter perfectly resets the stream presentation timestamps to 0.0!
vf_filters = "setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,scale=1080:1920,setsar=1,subtitles=filename=temp_subs_test.ass"

# Input seeking: -ss and -t BEFORE -i
command = [
    'ffmpeg',
    '-y',
    '-ss', str(start_time),
    '-i', input_video,
    '-t', str(duration),
    '-vf', vf_filters,
    '-map', '0:v',
    '-map', '0:a?',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '20',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    output_video
]

print("Executing FFmpeg command (Input seeking with PTS reset):")
print(" ".join(command))

res = subprocess.run(command, capture_output=True)
print("\n=== FFmpeg STDOUT ===")
print(res.stdout.decode())
print("\n=== FFmpeg STDERR ===")
print(res.stderr.decode())

# Clean up
if os.path.exists(ass_path):
    os.remove(ass_path)
