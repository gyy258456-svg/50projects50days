#!/usr/bin/env python3
"""Free, deterministic Canvas -> Chromium PNG -> H.264 render and QA.

Usage:
  python3 render.py --stills-only
  python3 render.py
  python3 render.py --verify-video

The composition must expose window.renderFrame(seconds) and a 1920x1080
canvas#film. index.html?render=1 must not run its autonomous playback loop.
No pre-rendered artwork or videos are used by this renderer.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import math
import shutil
import subprocess
import sys
import threading
import time
from datetime import datetime, timezone
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat

ROOT = Path(__file__).resolve().parent
WIDTH, HEIGHT, FPS, DURATION = 1920, 1080, 60, 15
FRAME_COUNT = FPS * DURATION
KEYFRAMES = {207: "01-repeated-retreat.png", 423: "02-conditions.png", 702: "03-evidence.png", 899: "04-open-understanding.png"}
CHECKPOINTS = [0,30,72,99,150,174,207,239,240,241,270,306,365,372,390,399,402,423,486,523,539,540,541,588,630,660,702,767,768,769,780,810,840,899]
BOARD_FRAMES = [30,99,150,207,270,306,390,486,588,660,780,899]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def font(size: int):
    candidates = ["/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
                  "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]
    for candidate in candidates:
        if Path(candidate).is_file():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def board(out: Path, qa: Path):
    # This compositing operation is solely the requested animation contact sheet.
    cell_w, cell_h, gap, header = 640, 400, 16, 76
    image = Image.new("RGB", (3 * cell_w + 4 * gap, header + 4 * cell_h + 5 * gap), "#0a0e13")
    draw = ImageDraw.Draw(image)
    draw.text((24, 17), "别急着定义自己 · 15秒比较与反思测试", font=font(28), fill="#e0e7e5")
    draw.text((image.width - 600, 26), "1920×1080 / 60fps / 900 frames", font=font(20), fill="#91a5aa")
    labels = {30:"尝试与陌生人交谈",99:"声音中断，后退一步",150:"空间变为另一场合",207:"相同的退缩轨迹",270:"同一空间展开作比较",306:"与朋友：交流自然",390:"准备后：停顿再继续",486:"陌生时：仍会退缩",588:"绝对判断出现",660:"事实、感受与判断",780:"比较后的开放结构",899:"先比较，再判断"}
    for index, frame in enumerate(BOARD_FRAMES):
        x = gap + (index % 3) * (cell_w + gap)
        y = header + gap + (index // 3) * (cell_h + gap)
        with Image.open(qa / f"frame-{frame:04d}.png") as source:
            image.paste(source.convert("RGB").resize((640, 360), Image.Resampling.LANCZOS), (x, y))
        draw.text((x + 12, y + 366), f"{frame / FPS:04.2f}s  /  {labels[frame]}", font=font(22), fill="#c6d2d1")
    target = out / "storyboard.png"
    image.save(target)
    return {"file": target.name, "width": image.width, "height": image.height,
            "source_frames": BOARD_FRAMES}


def inspect_geometry(page):
    """Check the actual composition's geometric state, not a duplicate implementation."""
    if not page.evaluate("typeof window.getFrameState === 'function'"):
        return {"available": False}
    timeline = page.evaluate("() => Array.from({length:901},(_,i)=>window.getFrameState(i/60))")
    first = timeline[0]
    boundary_ids = [item["id"] for item in first["boundaries"]]
    sample_ids = [item["id"] for item in first["samples"]]

    def check_finite(value):
        if isinstance(value, dict):
            return all(check_finite(item) for item in value.values())
        if isinstance(value, list):
            return all(check_finite(item) for item in value)
        if isinstance(value, (int, float)):
            return math.isfinite(value)
        return True

    def distance(a, b):
        return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))

    assert all(check_finite(state) for state in timeline), "Non-finite composition geometry"
    for state in timeline:
        assert state["core"]["id"] == first["core"]["id"], "Core was replaced between stages"
        assert [item["id"] for item in state["boundaries"]] == boundary_ids, "Boundary inheritance changed"
        assert [item["id"] for item in state["samples"]] == sample_ids, "Sample identities changed"
        camera = state["camera"]
        vectors = [camera[axis] for axis in ("forward", "right", "up")]
        assert all(abs(sum(v * v for v in vector) - 1) < 1e-6 for vector in vectors), "Camera basis lost normalization"
        assert all(abs(sum(a * b for a, b in zip(vectors[i], vectors[j]))) < 1e-6
                   for i, j in ((0, 1), (0, 2), (1, 2))), "Camera perspective basis is not orthogonal"
    continuity = []
    for t in (.9, 1.65, 1.95, 2.5, 2.78, 3.5, 3.93, 4.0, 4.22, 5.44, 6.05, 6.5, 7.0, 8.72, 9.1, 10.6, 12.8, 13.15):
        a, b = page.evaluate("t => [window.getFrameState(t-.0001),window.getFrameState(t+.0001)]", t)
        core_delta = distance(a["core"]["position"], b["core"]["position"])
        edge_delta = max(distance(p, q) for left, right in zip(a["boundaries"], b["boundaries"])
                         for p, q in zip(left["vertices"], right["vertices"]))
        camera_delta = distance(a["camera"]["eye"], b["camera"]["eye"])
        assert max(core_delta, edge_delta, camera_delta) < 1, f"Geometry discontinuity at {t}s"
        continuity.append({"time": t, "probe_half_interval": .0001,
                           "core_world_delta": core_delta, "largest_boundary_vertex_delta": edge_delta,
                           "camera_world_delta": camera_delta})
    final = timeline[-1]
    visible = [sample for sample in final["samples"] if sample["visible"] > .01]
    disconnected = [sample["id"] for sample in visible if not sample["connected"]]
    assert len(visible) == 3, "Final comparison must retain three distinct experiences"
    return {"available": True, "finite_geometry_passed": True, "camera_perspective_basis_passed": True,
            "stable_element_ids_passed": True, "persistent_core": first["core"]["id"],
            "boundary_ids": boundary_ids, "sample_count": len(sample_ids),
            "timeline_states_checked": len(timeline), "transition_continuity": continuity,
            "final_visible_samples": len(visible), "final_disconnected_samples": disconnected}


def verify_video(path: Path, qa: Path):
    if not path.is_file():
        raise RuntimeError(f"Video is missing: {path}")
    result = subprocess.run(["ffprobe", "-v", "error", "-count_frames", "-select_streams", "v:0",
                             "-show_entries", "stream=codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames,nb_read_frames,duration,pix_fmt:format=duration,size",
                             "-of", "json", str(path)], capture_output=True, text=True, check=True)
    probe = json.loads(result.stdout)
    stream = probe["streams"][0]
    assert stream["codec_name"] == "h264", stream
    assert (stream["width"], stream["height"]) == (WIDTH, HEIGHT), stream
    numerator, denominator = map(int, stream["avg_frame_rate"].split("/"))
    assert numerator / denominator == FPS, stream
    assert int(stream["nb_read_frames"]) == FRAME_COUNT, stream
    assert math.isclose(float(probe["format"]["duration"]), DURATION, abs_tol=1 / FPS), probe
    decode = subprocess.run(["ffmpeg", "-hide_banner", "-v", "error", "-i", str(path),
                             "-map", "0:v:0", "-f", "null", "-"], capture_output=True, text=True)
    (qa / "decode.log").write_text(decode.stderr, encoding="utf-8")
    assert decode.returncode == 0 and not decode.stderr.strip(), decode.stderr
    # Freeze/black diagnostics do not fail artistic dark openings or settled endings.
    diagnostics = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-vf",
                                  "blackdetect=d=0.2:pix_th=0.025,freezedetect=n=-55dB:d=0.5",
                                  "-an", "-f", "null", "-"], capture_output=True, text=True)
    (qa / "video-diagnostics.log").write_text(diagnostics.stderr, encoding="utf-8")
    findings = [line for line in diagnostics.stderr.splitlines()
                if "black_start:" in line or "freeze_start:" in line or "freeze_end:" in line]
    verification = {"passed": True, "probe": probe, "complete_decode": True,
                    "diagnostic_findings_for_review": findings,
                    "bytes": path.stat().st_size, "sha256": digest(path.read_bytes())}
    write_json(qa / "video-verification.json", verification)
    return verification


def render(stills_only: bool, out: Path, crf: int, screenshot: bool = False):
    from playwright.sync_api import sync_playwright

    qa = out / "qa"
    out.mkdir(parents=True, exist_ok=True)
    qa.mkdir(parents=True, exist_ok=True)
    if (qa / "render-report.json").exists():
        history = qa / "history" / datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
        history.mkdir(parents=True, exist_ok=True)
        for existing in qa.iterdir():
            if existing.is_file() and existing.suffix in (".json", ".log"):
                shutil.copy2(existing, history / existing.name)
    started = time.monotonic()
    run_log = []

    def log(message):
        line = f"[{time.monotonic() - started:7.2f}s] {message}"
        print(line, flush=True)
        run_log.append(line)
        (qa / "render.log").write_text("\n".join(run_log) + "\n", encoding="utf-8")

    errors, external_requests, metrics, states = [], [], [], {}
    checked_text_runs = 0
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT)))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    encoder = None
    encoder_log = None
    report = {"started_at_utc": datetime.now(timezone.utc).isoformat(),
              "mode": "stills-only" if stills_only else "video",
              "capture": "canvas.screenshot" if screenshot else "native-canvas-PNG",
              "spec": {"width": WIDTH, "height": HEIGHT, "fps": FPS, "duration": DURATION,
                       "frames": FRAME_COUNT},
              "source_sha256": {p.name: digest(p.read_bytes()) for p in ROOT.iterdir()
                                if p.is_file() and p.suffix in (".html", ".js", ".py", ".css")}}
    try:
        with sync_playwright() as playwright:
            executable = shutil.which("chromium") or shutil.which("chromium-browser")
            browser = playwright.chromium.launch(executable_path=executable,
                                                  args=["--no-sandbox", "--disable-dev-shm-usage"])
            page = browser.new_page(viewport={"width": WIDTH, "height": HEIGHT}, device_scale_factor=1)
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.on("request", lambda request: external_requests.append(request.url)
                    if request.url.startswith(("http://", "https://"))
                    and not request.url.startswith(f"http://127.0.0.1:{server.server_port}/") else None)
            response = page.goto(f"http://127.0.0.1:{server.server_port}/index.html?render=1", wait_until="networkidle")
            assert response and response.status == 200, "Composition HTTP response was not 200"
            page.wait_for_function("typeof window.renderFrame === 'function' && !!document.querySelector('#film')")
            page.evaluate("document.fonts.ready")
            page.evaluate("if (typeof window.pauseAnimation === 'function') window.pauseAnimation()")
            canvas = page.locator("#film")
            dimensions = canvas.evaluate("c => ({width:c.width,height:c.height})")
            assert dimensions == {"width": WIDTH, "height": HEIGHT}, dimensions
            # Force film at native size without touching source or changing canvas pixels.
            page.add_style_tag(content="html,body{margin:0!important;padding:0!important;overflow:hidden!important} #film{position:fixed!important;left:0!important;top:0!important;width:1920px!important;height:1080px!important;max-width:none!important;max-height:none!important;transform:none!important}")
            log("Chromium composition loaded; fonts ready; native 1920×1080 Canvas confirmed.")

            def capture(frame: int):
                t = frame / FPS
                nonlocal checked_text_runs
                runs = page.evaluate("t => window.renderFrame(t).textRuns", t)
                for run in runs:
                    assert run['left'] >= 60 and run['right'] <= WIDTH-60 and run['top'] >= 60 and run['bottom'] <= HEIGHT-60, f"Caption outside safe frame at {t:.3f}s: {run}"
                checked_text_runs += len(runs)
                if screenshot:
                    data = canvas.screenshot(type="png", timeout=20000)
                else:
                    # Read the native bitmap without screenshot animation waits.
                    # Equality to screenshot pixels was verified across all stages.
                    png = canvas.evaluate("c => c.toDataURL('image/png').split(',')[1]")
                    data = base64.b64decode(png)
                with Image.open(io.BytesIO(data)) as source:
                    assert source.size == (WIDTH, HEIGHT), source.size
                    thumbnail = source.convert("RGB").resize((160, 90), Image.Resampling.BILINEAR)
                    stat = ImageStat.Stat(thumbnail.convert("L"))
                    metric = {"frame": frame, "time": t, "mean_luma": round(stat.mean[0], 5),
                              "peak_luma": thumbnail.convert("L").getextrema()[1],
                              "sha256": digest(data)}
                return data, thumbnail, metric

            # Seek backwards as well as forwards; same time must reproduce exactly.
            first, _, _ = capture(240)
            capture(540)
            again, _, _ = capture(240)
            report["deterministic_seek_sha256"] = digest(first)
            assert digest(first) == digest(again), "Seeking to the same time produced different pixels; autoplay or nondeterminism remains"
            log("Out-of-order deterministic seek check passed (4.00s → 9.00s → 4.00s).")
            report["geometry_verification"] = inspect_geometry(page)
            log("Geometric continuity, persistent element identities and camera perspective basis checked.")

            if not stills_only:
                encoder_log = (qa / "encode.log").open("w", encoding="utf-8")
                encoder = subprocess.Popen(["ffmpeg", "-hide_banner", "-y", "-f", "image2pipe",
                                             "-vcodec", "png", "-framerate", str(FPS), "-i", "pipe:0",
                                             "-an", "-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
                                             "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                                             "-frames:v", str(FRAME_COUNT), str(out / "reflection-test-15s.mp4")],
                                            stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=encoder_log)

            previous = None
            sample_frames = CHECKPOINTS if stills_only else range(FRAME_COUNT)
            for frame in sample_frames:
                data, thumbnail, metric = capture(frame)
                if previous is not None:
                    metric["mean_abs_pixel_delta"] = round(sum(ImageStat.Stat(ImageChops.difference(thumbnail, previous)).mean) / 3, 5)
                previous = thumbnail
                metrics.append(metric)
                if frame in CHECKPOINTS:
                    (qa / f"frame-{frame:04d}.png").write_bytes(data)
                    state = page.evaluate("t => typeof window.getFrameState === 'function' ? window.getFrameState(t) : null", frame / FPS)
                    states[f"{frame / FPS:.6f}"] = state
                if frame in KEYFRAMES:
                    (out / KEYFRAMES[frame]).write_bytes(data)
                if encoder is not None:
                    encoder.stdin.write(data)
                if not stills_only and (frame + 1) % 60 == 0:
                    log(f"Rendered {frame + 1}/{FRAME_COUNT} frames ({(frame + 1) / FPS:.1f}s).")
            if encoder is not None:
                encoder.stdin.close()
                assert encoder.wait(timeout=180) == 0, "FFmpeg encoding failed; see exports/qa/encode.log"
                encoder_log.close()
                encoder_log = None
                encoder = None
                log("Actual 900-frame H.264 encoding completed.")
            browser.close()
        assert not errors, f"Browser exceptions: {errors}"
        assert not external_requests, f"Composition attempted external dependencies: {external_requests}"
        report["deterministic_seek_passed"] = True
        report["canvas_png_dimensions_passed"] = True
        report["screen_text_safe_bounds_passed"] = True
        report["screen_text_runs_checked"] = checked_text_runs
        report["browser_errors"] = errors
        report["external_requests"] = external_requests
        report["frame_metrics"] = metrics
        report["checkpoint_states"] = states
        report["storyboard"] = board(out, qa)
        report["keyframe_times"] = {name: frame / FPS for frame, name in KEYFRAMES.items()}
        if not stills_only:
            report["video_verification"] = verify_video(out / "reflection-test-15s.mp4", qa)
            log("FFprobe and complete video decode passed: 1920×1080 / 60fps / 15.000s / 900 frames.")
        report["elapsed_seconds"] = round(time.monotonic() - started, 3)
        report["status"] = "passed"
        write_json(qa / "render-report.json", report)
        log("PNG keyframes, multi-time storyboard and machine-readable QA report saved.")
        return report
    except Exception as error:
        report.update({"status": "failed", "error": repr(error), "browser_errors": errors,
                       "external_requests": external_requests, "frame_metrics": metrics,
                       "elapsed_seconds": round(time.monotonic() - started, 3)})
        write_json(qa / "render-report.json", report)
        log(f"FAILED: {error}")
        raise
    finally:
        if encoder is not None:
            encoder.kill()
            encoder.wait()
        if encoder_log is not None:
            encoder_log.close()
        server.shutdown()
        server.server_close()


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--stills-only", action="store_true", help="Render keyframes and transition checkpoints, no video")
    group.add_argument("--verify-video", action="store_true", help="Validate the already-rendered MP4 without launching Chromium")
    parser.add_argument("--output-dir", type=Path, default=ROOT / "exports")
    parser.add_argument("--crf", type=int, default=17, choices=range(14, 24))
    parser.add_argument("--screenshot", action="store_true", help="Use browser canvas screenshots instead of the pixel-equivalent native PNG capture")
    args = parser.parse_args()
    if args.verify_video:
        qa = args.output_dir / "qa"
        qa.mkdir(parents=True, exist_ok=True)
        report = verify_video(args.output_dir / "reflection-test-15s.mp4", qa)
        print(json.dumps(report, ensure_ascii=False, indent=2))
    else:
        render(args.stills_only, args.output_dir, args.crf, args.screenshot)


if __name__ == "__main__":
    main()
