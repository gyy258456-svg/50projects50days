"""Export actual PNG keyframes; no animation or video production in this stage."""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
import threading
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "exports"
NAMES = ["01-opening", "02-inward", "03-outward"]

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(OUT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
errors = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
        page = browser.new_page(viewport={"width":1920,"height":1080}, device_scale_factor=1)
        page.on("pageerror", lambda e: errors.append(str(e)))
        for name in NAMES:
            response = page.goto(f"http://127.0.0.1:{server.server_port}/{name}.svg")
            assert response.status == 200
            page.evaluate("document.fonts.ready")
            page.screenshot(path=str(OUT / f"{name}.png"))
            with Image.open(OUT / f"{name}.png") as image:
                assert image.size == (1920,1080)
            print(f"Exported {name}.png: 1920×1080", flush=True)
        browser.close()
finally:
    server.shutdown()
assert not errors, errors

# The user explicitly requested a reference board: join the actual PNGs.
board = Image.new("RGB", (2880,660), "#080D12")
draw = ImageDraw.Draw(board)
font = ImageFont.truetype("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc", 27, index=2)
titles = ["01 / 边界形成", "02 / 嵌套收缩", "03 / 网络展开"]
for i, name in enumerate(NAMES):
    with Image.open(OUT / f"{name}.png") as image:
        thumb = image.convert("RGB").resize((960,540), Image.Resampling.LANCZOS)
        board.paste(thumb, (i*960,75))
    draw.text((i*960+32,24), titles[i], font=font, fill="#E8ECE8")
    if i:
        draw.line((i*960,0,i*960,660), fill="#31414B", width=1)
draw.text((32,619), "同一个中心光点 · 同一组边界 · 同一条经验路径", font=font, fill="#B5CCD2")
board.save(OUT / "overview.png")
print("Exported overview.png: 2880×660; all PNGs decoded successfully.")
