# 别急着定义自己 · 15秒比较与反思测试

已实际导出1920×1080、60fps、15秒的H.264 MP4。此版本为60秒方案第四至第六幕的独立预览，旧工程全部保留。

## 不懂编程也能观看

下载 `exports/reflection-test-15s.mp4`，用电脑或手机的系统播放器打开。

浏览器观看：下载 `exports/preview-package.zip`，先解压，双击 `watch.html`，然后点击视频的播放按钮。不需要安装软件，不需要右侧网页预览。`index.html` 是可播放、暂停和拖动进度的实时动画；MP4播放器的画质与时间轴不受实时绘制性能影响。

## 文件

- `animation.js`：事件、人物、统一空间、文字和15秒时间轴。
- `exports/reflection-test-15s.mp4`：实际渲染视频，900帧，无音轨。
- `exports/01-repeated-retreat.png` 至 `04-open-understanding.png`：实际动画时间点PNG。
- `exports/storyboard.png`：12个时间点总览。
- `exports/qa/`：完整解码、浏览器播放、确定性、连续性、文字安全边距和逐帧指标。
- `DESIGN.md`、`QUALITY.md`：视觉继承和实际检查记录。

## 免费本地重渲染

工程无需网络素材、API密钥或收费服务。Linux渲染依赖Python3、Chromium、FFmpeg、Noto中文字体，以及 `requirements-render.txt` 中的Python包。当前云环境已经可用。

```sh
python3 render.py
python3 verify-playback.py
python3 verify-preview.py
python3 inspect-export.py
```

只检查已有视频：`python3 render.py --verify-video`。开发检查帧：`python3 render.py --stills-only`。渲染器自带临时本地服务，结束后关闭，不需要另行启动网站。

浏览器实时动画需要Canvas与WebGL支持；提供的MP4可用普通视频播放器观看。测试片段请先评审，不会合并到master或发布为正式作品。
