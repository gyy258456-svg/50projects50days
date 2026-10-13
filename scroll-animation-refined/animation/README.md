# 穿过城市 — 10 秒二维动画预览

1280 × 720，30fps，10 秒，H.264 MP4，无音轨。

- 0–3.3 秒：城市远景，人物行走，建筑视差、围巾摆动、飞鸟振翅。
- 3.3–6.5 秒：侧面跟拍，连续步态、摆臂，街道向后移动。
- 6.5–10 秒：河边镜头缓慢拉远，人物减速停下，水面和飞鸟继续运动。

镜头之间使用短暂白色柔和过渡；中文仅作为底部辅助字幕。

`preview.mp4` 可以直接下载播放。`index.html` 提供实时 Canvas 预览与暂停、重播。`film.js` 中的 `renderFrame(time)` 支持确定性逐帧渲染。全部图形在本地绘制，无收费服务或外部资源。

仓库根目录运行 `python3 -m http.server 8010`，浏览器访问 `/scroll-animation-refined/` 查看 MP4 播放页，或 `/scroll-animation-refined/animation/` 查看实时动画。
