import os

print("=" * 80, flush=True)
print("RUNNING APP:", os.path.abspath(__file__), flush=True)
print("=" * 80, flush=True)

import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from services.analysis_service import (
    analyze_video,
    analyze_shorts,
    analyze_transcript,
    analyze_speakers,
    analyze_scenes,
    analyze_faces,
    analyze_objects,
    analyze_embeddings,
    analyze_transcript_topics,
)
from services.workflow_service import run_workflow
from model_loader import load_all_models

# Load AI models once at service startup so weights are cached in RAM.
load_all_models()


def read_json(handler):
    length = int(handler.headers.get("Content-Length", "0"))
    raw = handler.rfile.read(length) if length > 0 else b"{}"
    return json.loads(raw.decode("utf-8"))


def write_json(handler, status, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


class fraymlyHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(
            f"[HTTP] {self.command} {self.path} | "
            f"{self.client_address[0]} | "
            f"{fmt % args}",
            flush=True,
        )
        
    def do_GET(self):
        if self.path == "/health":
            return write_json(self, 200, {"success": True, "message": "AI service healthy", "data": {}})
        return write_json(self, 404, {"success": False, "message": "Not found"})

    def do_POST(self):
        print(f"\n=== POST {self.path} ===", flush=True)

        payload = read_json(self)

        print(payload, flush=True)

        if self.path == "/analyze/video":
            return write_json(self, 200, {"success": True, "message": "Video analyzed", "data": analyze_video(payload)})

        if self.path == "/analyze/shorts":
            return write_json(self, 200, {"success": True, "message": "Shorts analyzed", "data": analyze_shorts(payload)})

        if self.path == "/analyze/transcript":
            return write_json(self, 200, {"success": True, "message": "Transcript ready", "data": analyze_transcript(payload)})

        if self.path == "/analyze/speakers":
            return write_json(self, 200, {"success": True, "message": "Speaker analysis ready", "data": analyze_speakers(payload)})

        if self.path == "/analyze/scenes":
            return write_json(self, 200, {"success": True, "message": "Scene analysis ready", "data": analyze_scenes(payload)})

        if self.path == "/analyze/faces":
            return write_json(self, 200, {"success": True, "message": "Face analysis ready", "data": analyze_faces(payload)})

        if self.path == "/analyze/objects":
            return write_json(self, 200, {"success": True, "message": "Object analysis ready", "data": analyze_objects(payload)})

        if self.path == "/analyze/embeddings":
            return write_json(self, 200, {"success": True, "message": "Embeddings ready", "data": analyze_embeddings(payload)})

        if self.path == "/analyze/transcript-analysis":
            return write_json(self, 200, {"success": True, "message": "Transcript analysis ready", "data": analyze_transcript_topics(payload)})

        if self.path == "/analyze/topics":
            return write_json(self, 200, {"success": True, "message": "Topics ready", "data": {"topics": analyze_transcript_topics(payload).get("topics", [])}})

        if self.path == "/analyze/story":
            analysis = analyze_video(payload)
            return write_json(self, 200, {"success": True, "message": "Story analysis ready", "data": {"story": analysis["transcriptAnalysis"]["summary"]}})

        if self.path == "/analyze/hooks":
            analysis = analyze_shorts(payload)
            return write_json(self, 200, {"success": True, "message": "Hook analysis ready", "data": {"hooks": analysis["director"]["clips"]}})

        if self.path == "/analyze/viral-segments":
            return write_json(self, 200, {"success": True, "message": "Viral segments ready", "data": analyze_shorts(payload)["director"]["clips"]})

        if self.path == "/analyze/clip-ranking":
            analysis = analyze_shorts(payload)
            return write_json(self, 200, {"success": True, "message": "Clip ranking ready", "data": {"ranking": analysis["director"]["clips"]}})

        if self.path == "/analyze/timeline":
            analysis = analyze_shorts(payload)
            return write_json(self, 200, {"success": True, "message": "Timeline ready", "data": {"timeline": analysis["director"]["clips"]}})

        if self.path == "/analyze/captions":
            analysis = analyze_shorts(payload)
            return write_json(self, 200, {"success": True, "message": "Captions ready", "data": {"captions": [clip["title"] for clip in analysis["director"]["clips"]]}})

        if self.path == "/analyze/title":
            analysis = analyze_shorts(payload)
            return write_json(self, 200, {"success": True, "message": "Title ready", "data": {"title": analysis["director"]["titles"][0] if analysis["director"]["titles"] else "Viral Short"}})

        if self.path == "/analyze/description":
            analysis = analyze_shorts(payload)
            return write_json(self, 200, {"success": True, "message": "Description ready", "data": {"description": analysis["director"]["descriptions"][0] if analysis["director"]["descriptions"] else "Generated description"}})

        if self.path == "/analyze/hashtags":
            analysis = analyze_shorts(payload)
            return write_json(self, 200, {"success": True, "message": "Hashtags ready", "data": {"hashtags": analysis["director"]["hashtags"]}})

        if self.path == "/workflow/run":
            return write_json(self, 200, {"success": True, "message": "Workflow triggered", "data": run_workflow(payload)})

        return write_json(self, 404, {"success": False, "message": "Not found"})


def run(host="0.0.0.0", port=None):
    if port is None:
        port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer((host, port), fraymlyHandler)
    print(f"fraymly AI service listening on {host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    run()