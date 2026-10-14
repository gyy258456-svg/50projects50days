#!/usr/bin/env python3
"""Check actual browser MP4 decoding, seeking, playback and final ended event."""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import re
import shutil
import threading
import time

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
QA = ROOT / "exports" / "qa"
VIDEO = ROOT / "exports" / "cropped-self-18s.mp4"
HTML = b"""<!doctype html><meta charset=utf-8><title>MP4 playback verification</title>
<style>html,body{margin:0;background:#080d12}video{display:block;width:1920px;height:1080px}</style>
<video id=video muted playsinline preload=auto src='/exports/cropped-self-18s.mp4'></video>"""


class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

    def do_GET(self):
        if self.path == "/__videoqa__.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(HTML)))
            self.end_headers()
            self.wfile.write(HTML)
        elif self.path == "/exports/cropped-self-18s.mp4":
            # Browser seeking requires correct byte-range HTTP semantics.
            size = VIDEO.stat().st_size
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", self.headers.get("Range", ""))
            if match:
                a, b = match.groups()
                if a:
                    start, end = int(a), int(b) if b else size - 1
                else:
                    start, end = max(0, size - int(b or 0)), size - 1
                if start >= size or start > end:
                    self.send_response(416)
                    self.send_header("Content-Range", f"bytes */{size}")
                    self.end_headers()
                    return
                end = min(size - 1, end)
                self.send_response(206)
                self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
            else:
                start, end = 0, size - 1
                self.send_response(200)
            self.send_header("Content-Type", "video/mp4")
            self.send_header("Accept-Ranges", "bytes")
            self.send_header("Content-Length", str(end - start + 1))
            self.end_headers()
            with VIDEO.open("rb") as video:
                video.seek(start)
                remaining = end - start + 1
                try:
                    while remaining:
                        data = video.read(min(65536, remaining))
                        if not data:
                            break
                        self.wfile.write(data)
                        remaining -= len(data)
                except (BrokenPipeError, ConnectionResetError):
                    pass
        else:
            super().do_GET()


def main():
    assert VIDEO.exists(), f"Missing actual MP4: {VIDEO}"
    QA.mkdir(parents=True, exist_ok=True)
    errors = []
    started = time.monotonic()
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    report = {"file": str(VIDEO), "seek_checks": []}
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(executable_path=shutil.which("chromium"), args=["--no-sandbox", "--disable-dev-shm-usage"])
            page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(f"http://127.0.0.1:{server.server_port}/__videoqa__.html")
            page.wait_for_function("video.readyState >= 2", timeout=20000)
            metadata = page.evaluate("({duration:video.duration,width:video.videoWidth,height:video.videoHeight,codecSupport:video.canPlayType('video/mp4; codecs=\"avc1.64002a\"')})")
            assert metadata["width"] == 1920 and metadata["height"] == 1080, metadata
            assert abs(metadata["duration"] - 18) < .017, metadata
            report["metadata"] = metadata
            for t in [1.6, 3.0, 5.4, 6.0, 8.3, 9.0, 10.4, 12.4, 14.4, 15.6, 17.5, 17.95, 0]:
                page.evaluate("t => {video.pause();video.currentTime=t;}", t)
                page.wait_for_function("t => Math.abs(video.currentTime-t)<0.025 && video.readyState >= 2 && !video.seeking", arg=t, timeout=10000)
                result = page.evaluate("({time:video.currentTime,readyState:video.readyState,error:video.error ? video.error.code : null})")
                assert result["error"] is None, result
                report["seek_checks"].append(result)
            baseline = page.evaluate("({total:video.getVideoPlaybackQuality().totalVideoFrames,dropped:video.getVideoPlaybackQuality().droppedVideoFrames,corrupted:video.getVideoPlaybackQuality().corruptedVideoFrames})")
            report["before_continuous_playback_quality"] = baseline
            page.evaluate("video.play()")
            page.wait_for_function("video.currentTime > .15 && !video.paused", timeout=5000)
            page.wait_for_function("video.ended", timeout=28000)
            final = page.evaluate("({ended:video.ended,currentTime:video.currentTime,readyState:video.readyState,error:video.error ? video.error.code : null,playbackQuality:video.getVideoPlaybackQuality ? {total:video.getVideoPlaybackQuality().totalVideoFrames,dropped:video.getVideoPlaybackQuality().droppedVideoFrames,corrupted:video.getVideoPlaybackQuality().corruptedVideoFrames} : null})")
            if final["playbackQuality"]:
                report["continuous_playback_quality"] = {k: final["playbackQuality"][k]-baseline[k] for k in baseline}
            assert final["ended"] and final["error"] is None and abs(final["currentTime"] - 18) < .017, final
            assert not errors, errors
            report.update({"passed": True, "complete_browser_playback": final, "browser_errors": errors})
            browser.close()
    except Exception as error:
        report.update({"passed": False, "error": repr(error), "browser_errors": errors})
        raise
    finally:
        report["elapsed_seconds"] = round(time.monotonic() - started, 3)
        (QA / "browser-playback.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        server.shutdown()
        server.server_close()
        print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)


if __name__ == "__main__":
    main()
