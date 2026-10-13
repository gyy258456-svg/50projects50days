# HyperFrames capability check (2026-10-14)

## Actual checks

- Plugin-provided skills `c0/hyperframes`, `c0/hyperframes-cli`, `c0/gsap` were readable in this session. This proves skill access; it does not prove a remote HeyGen service account, which is not needed for the proposed local flow.
- `hyperframes@0.8.153` was fetched from npm into `/tmp/hyperframes-check/npm-cache` and executed successfully. No repository manifests or application files were changed by this check.
- npm metadata: Apache-2.0, Node >=22, repository https://github.com/heygen-com/hyperframes.
- `hyperframes --version`: 0.8.153.
- `hyperframes doctor`: Node v24.19.0, FFmpeg/FFprobe 7.1.5, system Chromium `/usr/bin/chromium`, 32 GB cgroup memory, 16.4 GB free disk; all required render prerequisites found.
- Optional transcription/local voice/local music tooling (whisper-cpp, Kokoro, MusicGen) was not installed. It is unnecessary for the current PNG design stage.
- `render --help` confirms local MP4 output, `--fps 60`, and `--resolution landscape` (1920x1080). Composition dimensions can be declared through `data-width="1920" data-height="1080"`.
- System Chromium supports the normal screenshot capture route. The optimized beginFrame route requires chrome-headless-shell; this is a speed limitation, not evidence that MP4 rendering fails.

## Fit for this project

- Strong fit for deterministic, seekable GSAP timelines controlling SVG/HTML graphics, camera wrapper transforms, masks, and local preview/rendering.
- Continuous shape changes are an authoring responsibility: reuse compatible node/path IDs and interpolate coordinates or same-topology SVG paths. The plugin does not automatically supply a coherent visual system or correct arbitrary path morphs.
- Preview uses a local Studio server, normally port 3002. Prior blocked embedded preview should not be used as the only review surface; exported PNG/MP4 files remain necessary.
- No paid AI/avatar/TTS/music API was called. Local CLI rendering does not require those APIs. Proposed implementation uses local graphics/assets and avoids paid plugin APIs.

## Deliberately not tested

- No composition was initialized, no motion test was produced, and no MP4 was rendered. Therefore end-to-end 1080p60 rendering, seek accuracy and actual render throughput remain unverified until the user approves the keyframes.
- No claim of automatic SVG morphing support or premium-service entitlement is made.

## Reproducible commands

```sh
HYPERFRAMES_NO_TELEMETRY=1 npm --cache /tmp/hyperframes-check/npm-cache exec --yes --package hyperframes@0.8.153 -- hyperframes --version
HYPERFRAMES_NO_TELEMETRY=1 npm --cache /tmp/hyperframes-check/npm-cache exec --yes --package hyperframes@0.8.153 -- hyperframes doctor
HYPERFRAMES_NO_TELEMETRY=1 npm --cache /tmp/hyperframes-check/npm-cache exec --yes --package hyperframes@0.8.153 -- hyperframes render --help
```

Full doctor and render-help outputs are saved beside this report. Anonymous telemetry is disabled for the reproducible commands.
