# 《别急着定义自己》— 关键画面 V2

本轮完成：实际参考视频分析、HyperFrames可用性检查、三张程序化关键画面、三图并排总览。没有制作动画测试或完整视频。

## 无需编程，直接查看

- [三图并排总览 PNG](exports/overview.png)：2880×660。
- [01 Opening PNG](exports/01-opening.png)：1920×1080。
- [02 Inward PNG](exports/02-inward.png)：1920×1080。
- [03 Outward PNG](exports/03-outward.png)：1920×1080。

PNG均已真正导出并解码校验。网页仅用于可选浏览，不是交付文件，也不需要依赖右侧内嵌预览。静态图片不具有帧率；1080p60是下一阶段视频目标。

## 可编辑源文件

`build-keyframes.mjs` 用统一坐标投影、调色板、固定节点池和同一组图形ID构造三张SVG；`exports/manifest.json` 保留对象身份与场景数据；`export-png.py` 使用本地Chromium导出PNG并生成并排总览。没有生成式人物插画，没有付费服务。

重新导出静态图片：

```sh
cd /workspace/50projects50days/dont-define-yourself/visual-system-v2
node build-keyframes.mjs
python3 export-png.py
```

这些命令只写本目录中的静态输出。原来的根目录DESIGN.md、design/人物提案和scroll-animation-refined旧动画全部保留；本目录DESIGN.md是新版的视觉依据。

## 确认之后

按照[TRANSITIONS.md](TRANSITIONS.md)用共享边界与轨迹制作6秒运动测试；确认测试后再进入24秒完整成片。现在不能把静态关键画面的可渲染性当作1080p60视频导出验证。

[实际参考分析](REFERENCE_ANALYSIS.md) · [HyperFrames能力与限制](HYPERFRAMES_CHECK.md) · [新版视觉规范](DESIGN.md)
