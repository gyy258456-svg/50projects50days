#!/usr/bin/env python3
"""Exercise the supplied HTML controls and player via local HTTP, without external resources.
Cloud Chromium blocks file: URLs through an administrator policy.
"""
import json
import shutil
import time
import threading
import importlib.util
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parent

def main():
    started=time.monotonic();errors=[];network=[];report={}
    spec=importlib.util.spec_from_file_location('reflection_video_handler',ROOT/'verify-playback.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    server=ThreadingHTTPServer(('127.0.0.1',0),partial(module.Handler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'
    with sync_playwright() as p:
        browser=p.chromium.launch(executable_path=shutil.which('chromium'),args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1920,'height':1080},device_scale_factor=1)
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.on('request',lambda req:network.append(req.url) if req.url.startswith(('http://','https://')) and not req.url.startswith(base+'/') else None)
        page.goto(base+'/index.html');page.evaluate('document.fonts.ready')
        page.wait_for_function("typeof renderFrame==='function'")
        page.click('#play');page.wait_for_function('window.lastRenderedState.t>.2',timeout=10000);page.click('#play')
        state=page.evaluate('({time:window.lastRenderedState.t,button:document.querySelector("#play").textContent})')
        assert state['time']>.2 and state['button']=='播放',state
        report['live_play_pause']=state
        page.evaluate('() => {const s=document.querySelector("#seek");s.value=6.4;s.dispatchEvent(new Event("input",{bubbles:true}));}')
        state=page.evaluate('({time:window.lastRenderedState.t,stage:window.lastRenderedState.stage})')
        assert abs(state['time']-6.4)<.00001 and state['stage']=='different-conditions-different-performance',state
        report['live_seek']=state
        page.goto(base+'/watch.html');page.wait_for_function('document.querySelector("video").readyState>=2')
        meta=page.evaluate('() => {const v=document.querySelector("video");return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,src:v.currentSrc};}')
        assert meta['width']==1920 and meta['height']==1080 and meta['duration']==15,meta
        assert meta['src']==base+'/exports/reflection-test-15s.mp4',meta
        # A physical click on the supplied native player starts the actual MP4.
        box=page.locator('video').bounding_box();page.mouse.click(box['x']+28,box['y']+box['height']-26)
        page.wait_for_function('document.querySelector("video").currentTime>.3 && !document.querySelector("video").paused',timeout=10000)
        local=page.evaluate('() => {const v=document.querySelector("video");v.pause();return {currentTime:v.currentTime,error:v.error?v.error.code:null,readyState:v.readyState};}')
        assert local['error'] is None,local
        assert not errors and not network,(errors,network)
        report.update({'passed':True,'actual_player_metadata':meta,'actual_player_played':local,'served_over_local_HTTP':True,'file_protocol_check':'blocked by cloud Chromium administrator policy; not claimed as runtime verified','browser_errors':errors,'external_requests':network,'elapsed_seconds':round(time.monotonic()-started,3)})
        browser.close()
    server.shutdown();server.server_close()
    (ROOT/'exports'/'qa'/'html-preview.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':main()
