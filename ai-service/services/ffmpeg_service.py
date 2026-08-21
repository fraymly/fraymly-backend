import subprocess
import os
from models.utils import download_if_url, devanagari_to_hinglish

def format_ass_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds % 1) * 100))
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

def hex_to_ass_color(hex_str, default="&H00FFFFFF"):
    if not hex_str:
        return default
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = ''.join(c*2 for c in hex_str)
    if len(hex_str) != 6:
        return default
    r, g, b = hex_str[0:2], hex_str[2:4], hex_str[4:6]
    return f"&H00{b}{g}{r}"

def contains_devanagari(text):
    """
    Checks if a string contains any Devanagari (Hindi) script characters.
    Unicode range for Devanagari is U+0900 to U+097F.
    """
    if not text:
        return False
    for char in text:
        if 0x0900 <= ord(char) <= 0x097F:
            return True
    return False

def group_words_into_phrases(words, max_words=3, max_chars=18, max_gap=1.0):
    """
    Groups rapid-fire word-level timestamps into smooth, readable phrases.
    Also dynamically extends phrase end times to the next phrase's start to eliminate flickering.
    """
    if not words:
        return []
        
    # Chronologically sort the words by start time (ensuring floats) to handle multiple speaker turns correctly!
    try:
        sorted_words = sorted(words, key=lambda x: float(x.get("start", 0.0)))
    except Exception:
        sorted_words = words # fallback if sorting has type errors
    
    phrases = []
    current_phrase_words = []
    
    for w in sorted_words:
        word_text = w.get("word", "").strip()
        if not word_text:
            continue
        try:
            w_start = float(w.get("start", 0.0))
            w_end = float(w.get("end", 0.0))
        except (ValueError, TypeError):
            continue
            
        # Check if we should start a new phrase
        should_split = False
        if len(current_phrase_words) >= max_words:
            should_split = True
        elif current_phrase_words:
            # If there's a silence gap between words, split
            last_word = current_phrase_words[-1]
            if w_start - last_word["end"] > max_gap:
                should_split = True
            # Or if character length exceeds max, split
            elif len(" ".join([x["word"] for x in current_phrase_words]) + " " + word_text) > max_chars:
                should_split = True
                
        if should_split and current_phrase_words:
            phrase_text = " ".join([x["word"] for x in current_phrase_words])
            phrase_start = current_phrase_words[0]["start"]
            phrase_end = current_phrase_words[-1]["end"]
            
            # Smooth out gap flickering: extend current phrase's end to the start of this next word
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

def render_video_clip(input_path, output_path, start_time, duration, payload=None):
    """
    Renders a video clip using ffmpeg with styled subtitles.
    Supports smart Hindi font-fallback and boundary clamping to prevent word dropouts.
    """
    input_path = download_if_url(input_path)
    
    # setpts=PTS-STARTPTS perfectly resets decoded frame timestamps to 0.0, matching relative subtitle files perfectly
    vf_filters = "setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1"
    ass_path = None
    
    if payload:
        # Check for caption configuration in the workflow nodes
        caption_node = next((node for node in payload.get("workflow", {}).get("nodes", []) if node.get("type") == "caption_generation"), None)
        if caption_node:
            config = caption_node.get("config", {})
            font_name = config.get("fontName", "Impact")
            
            font_size = config.get("fontSize", 24)
            # Mathematically exact 6.0x scale factor to perfectly match our 180x320 frontend preview mockup on our 1080x1920 video!
            scaled_font_size = int(round(font_size * 6.0))
            
            text_color = hex_to_ass_color(config.get("textColor", "#FFFF00"))
            stroke_color = hex_to_ass_color(config.get("strokeColor", "#000000"))
            
            stroke_width = config.get("strokeWidth", 2)
            # Scale stroke width up proportionally to match the scaled font size!
            scaled_stroke_width = int(round(stroke_width * 6.0))
            
            alignment_val = 2 # default bottom-center
            alignment_cfg = str(config.get("alignment", "bottom")).lower()
            if alignment_cfg == "center":
                alignment_val = 10
            elif alignment_cfg == "top":
                alignment_val = 6
                
            text_case = str(config.get("textCase", "uppercase")).lower()
            
            # Retrieve crop mode, zoom level, and vertical offset
            crop_mode = str(config.get("cropMode", "cropped")).lower()
            zoom_level = float(config.get("zoomLevel", 100)) / 100.0
            if zoom_level < 1.0:
                zoom_level = 1.0
            vertical_offset = int(config.get("verticalOffset", 50))
            # Scale vertical offset up proportionally to match the scaled 320px vertical height preview!
            scaled_vertical_offset = int(round(vertical_offset * 6.0))
            
            # Construct dynamic crop/zoom filter chain with setpts=PTS-STARTPTS prepended
            if crop_mode == "cropped":
                crop_w = int(round(1080 / zoom_level))
                crop_h = int(round(1920 / zoom_level))
                vf_filters = f"setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop={crop_w}:{crop_h},scale=1080:1920,setsar=1"
            else: # uncropped (letterboxed)
                scale_w = int(round(1080 * zoom_level))
                scale_h = int(round(1920 * zoom_level))
                vf_filters = f"setpts=PTS-STARTPTS,scale={scale_w}:{scale_h}:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1"
            
            # Find word timestamps
            speech_result = payload.get("speech_to_text") or payload.get("outputs", {}).get("speech_to_text", {})
            if not speech_result:
                speech_result = {}
            words = speech_result.get("wordTimestamps", [])
            language_config = str(config.get("language", "en")).lower()
            
            if words:
                # If language is set to Hinglish, we transliterate Devanagari to Roman
                is_hinglish = (language_config == "hinglish")
                
                # Auto-detect Hindi Devanagari (only if not forcing Hinglish Roman script)
                has_hindi = False
                if not is_hinglish:
                    has_hindi = any(contains_devanagari(w.get("word", "")) for w in words)
                    if has_hindi:
                        font_name = "Kohinoor Devanagari"
                        print(f"[FFmpeg] Hindi Devanagari detected. Forcing native font: {font_name}", flush=True)
                    
                ass_lines = [
                    "[Script Info]",
                    "ScriptType: v4.00+",
                    "PlayResX: 1080",
                    "PlayResY: 1920",
                    "",
                    "[V4+ Styles]",
                    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
                    f"Style: Default,{font_name},{scaled_font_size},{text_color},&H000000FF,{stroke_color},&H00000000,-1,0,0,0,100,100,0,0,1,{scaled_stroke_width},0,{alignment_val},10,10,{scaled_vertical_offset},1",
                    "",
                    "[Events]",
                    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text"
                ]
                
                clip_end = start_time + duration
                # Group words into smooth phrases to avoid flicker, fast flashing, and empty gaps!
                phrases = group_words_into_phrases(words)
                
                for p in phrases:
                    p_start = p.get("start", 0.0)
                    p_end = p.get("end", 0.0)
                    
                    # SMART CLAMPING: check if the phrase overlaps with the clip window
                    if p_end > start_time and p_start < clip_end:
                        # With PTS reset to 0.0, subtitle timestamps must be relative to start_time
                        rel_start = max(0.0, p_start - start_time)
                        rel_end = min(duration, p_end - start_time)
                        
                        if rel_end - rel_start > 0.02:
                            phrase_text = p.get("text", "")
                            
                            # If transliterating to Hinglish (Roman Hindi)
                            if is_hinglish:
                                phrase_text = devanagari_to_hinglish(phrase_text)
                                
                            # Keep Hindi text casing original (uppercasing Hindi has no effect but normal is safer)
                            if not has_hindi:
                                if text_case == "uppercase":
                                    phrase_text = phrase_text.upper()
                                elif text_case == "lowercase":
                                    phrase_text = phrase_text.lower()
                                    
                            ass_lines.append(
                                f"Dialogue: 0,{format_ass_time(rel_start)},{format_ass_time(rel_end)},Default,,0,0,0,,{phrase_text}"
                            )
                
                # Write to local relative file in current directory to avoid path escaping issues in FFmpeg subtitles filter
                ass_path = f"temp_subs_{str(start_time).replace('.', '_')}.ass"
                with open(ass_path, "w", encoding="utf-8") as f:
                    f.write("\n".join(ass_lines))
                    
                vf_filters += f",subtitles=filename={ass_path}"

    # Input seeking (-ss BEFORE -i) with setpts=PTS-STARTPTS for blazing-fast 15x speeds and 100% perfect subtitle sync!
    command = [
        'ffmpeg',
        '-y',
        '-ss', str(start_time),
        '-i', input_path,
        '-t', str(duration),
        '-vf', vf_filters,
        '-map', '0:v',
        '-map', '0:a?',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '20',
        '-c:a', 'aac', # Encode audio to AAC for flawless browser playability and perfect synchronization!
        '-movflags', '+faststart',
        output_path
    ]

    try:
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        print(f"Successfully rendered clip to {output_path}", flush=True)
    except subprocess.CalledProcessError as e:
        print(f"Error rendering clip: {e.stderr.decode()}", flush=True)
        raise
    finally:
        # Cleanup temporary local .ass file if created
        if ass_path and os.path.exists(ass_path):
            try:
                os.remove(ass_path)
            except Exception as cleanup_err:
                print(f"Failed to remove temp .ass file: {cleanup_err}", flush=True)