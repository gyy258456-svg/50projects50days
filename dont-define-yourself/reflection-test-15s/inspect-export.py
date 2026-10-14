#!/usr/bin/env python3
"""Compare actual decoded MP4 checkpoints with the source Canvas pixels."""
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat

ROOT = Path(__file__).resolve().parent
QA = ROOT/'exports'/'qa'
FRAMES = [0,99,150,207,239,240,241,270,306,365,372,390,399,402,423,486,539,540,541,588,630,660,702,767,768,769,780,810,840,899]
BOARD = [99,207,270,390,486,588,660,702,780,899]


def main():
    report=json.loads((QA/'render-report.json').read_text())
    assert report['status']=='passed' and report['mode']=='video'
    metrics=report['frame_metrics']
    assert len(metrics)==900
    assert len({f['sha256'] for f in metrics})==900, 'Identical source frames'
    assert min(f['peak_luma'] for f in metrics)>80, 'Blank source frame'
    assert min(f['mean_luma'] for f in metrics)>2, 'Unexpected full black frame'
    decoded=Path(tempfile.mkdtemp(prefix='reflection15-decoded-',dir='/tmp'))
    expression="select='"+'+'.join(f'eq(n,{f})' for f in FRAMES)+"'"
    subprocess.run(['ffmpeg','-hide_banner','-v','error','-i',str(ROOT/'exports'/'reflection-test-15s.mp4'),'-vf',expression,'-fps_mode','vfr',str(decoded/'decoded-%02d.png')],check=True)
    outputs=sorted(decoded.glob('decoded-*.png'));assert len(outputs)==len(FRAMES)
    comparison=[]
    for frame,path in zip(FRAMES,outputs):
        with Image.open(path) as actual, Image.open(QA/f'frame-{frame:04d}.png') as source:
            assert actual.size==source.size==(1920,1080)
            stats=ImageStat.Stat(ImageChops.difference(actual.convert('RGB'),source.convert('RGB')))
            error=sum(stats.mean)/3
            assert error<4, f'Encoding or frame-index mismatch at {frame}: {error}'
            comparison.append({'frame':frame,'time':frame/60,'mean_rgb_error_0_255':round(error,6)})
    artifact={'passed':True,'actual_decoded_checkpoints':len(outputs),'all_source_frames_distinct':True,'minimum_peak_luma':min(f['peak_luma'] for f in metrics),'minimum_mean_luma':min(f['mean_luma'] for f in metrics),'maximum_mean_rgb_error_0_255':max(f['mean_rgb_error_0_255'] for f in comparison),'comparisons':comparison,'largest_adjacent_deltas':sorted([m for m in metrics if 'mean_abs_pixel_delta' in m],key=lambda m:m['mean_abs_pixel_delta'],reverse=True)[:8]}
    (QA/'encoded-comparison.json').write_text(json.dumps(artifact,ensure_ascii=False,indent=2)+'\n')
    font=ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',24)
    # Correct 16:9 thumbnails, without stretching them to the contact-sheet box.
    board=Image.new('RGB',(1952,5*580+76),'#080d12');draw=ImageDraw.Draw(board)
    draw.text((20,18),'实际MP4解码画面 · 转场与证据检查',font=font,fill='#e8ece8')
    for j,frame in enumerate(BOARD):
        x=16+(j%2)*968;y=76+(j//2)*580
        with Image.open(outputs[FRAMES.index(frame)]) as im:board.paste(im.convert('RGB').resize((960,540),Image.Resampling.LANCZOS),(x,y))
        draw.text((x+12,y+544),f'{frame/60:.3f}秒 / 编码帧 {frame}',font=font,fill='#b5ccd2')
    board.save(decoded/'actual-video-board.png')
    print(json.dumps({'passed':True,'decoded_frames':len(outputs),'max_rgb_error':artifact['maximum_mean_rgb_error_0_255'],'actual_video_board':str(decoded/'actual-video-board.png')},ensure_ascii=False),flush=True)


if __name__=='__main__':main()
