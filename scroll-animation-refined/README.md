# 穿过城市 · 二维动画

当前入口已改为真正的 10 秒二维动画视频播放器，不再是文字滚动网页。

预览视频：`animation/preview.mp4`（1280×720、30fps、300 帧、H.264，无音轨）。可直接下载播放。

动画源文件和镜头说明见 `animation/README.md`。全部图形在本地 Canvas 绘制，无付费服务或外部依赖。原版 `../scroll-animation/` 保持不变。

在仓库根目录运行 `python3 -m http.server 8010` 后，访问 `/scroll-animation-refined/` 观看视频，访问 `/scroll-animation-refined/animation/` 查看实时动画。云端需通过客户端端口转发访问。

验证：逐帧渲染无 JavaScript 异常；ffprobe 确认 10 秒 / 300 帧；完整视频解码、浏览器实际播放、暂停和重播检查通过。
