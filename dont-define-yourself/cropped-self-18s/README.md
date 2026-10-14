# 被裁掉的自己 · 18秒动画测试

《别急着定义自己》独立测试版本。实际视频为1920×1080、60fps、18秒、1080帧，H.264 MP4，无音轨。

## 直接观看

下载 `exports/cropped-self-18s.mp4`，用手机或电脑系统播放器打开。

浏览器方式：下载 `exports/preview-package.zip`，先完整解压，再打开 `watch.html` 点击播放。`index.html` 是可以播放、暂停、拖动进度的实时动画。如果浏览器限制本地文件，直接打开同包MP4即可，不需要右侧网页预览。

## 内容

一次失败 → 镜头裁切与同一经历的回放 → 换环境仍退缩 → 摄影机揭示朋友与准备后的经历 → 判断的中文轮廓被改写 → 下一次尝试。

主角、桌椅、门窗、话筒、声音波形和镜头都在实际运动。没有三栏信息板，也没有把几张PNG放在时间线上推拉。

## 免费重渲染

当前云环境已具备Python3、Chromium、FFmpeg、中文Noto字体、Playwright、Pillow和fonttools。渲染不调用外部网络或收费服务。

```sh
python3 render.py
python3 inspect-export.py
python3 verify-preview.py
python3 verify-playback.py
```

`render.py --stills-only` 供开发检查实际关键时间点。`render.py --verify-video` 检查已有MP4。渲染器与测试脚本会自行启动临时本地服务并关闭。

`build-glyphs.py` 从免费Noto Serif CJK字体生成连续字形数据；已经提供生成好的 `glyph-data.js`，观看时不需要安装字体工具或运行脚本。中文字体轮廓许可证见 `FONT-LICENSE.txt`。

`exports/qa/` 保存逐帧、几何连续性、中文安全边距、完整解码和实际浏览器播放记录。`QUALITY.md` 说明实际检查范围与限制。

旧版本全部保留。本分支是18秒测试，等待观看评审后再调整，不合并为正式作品。
