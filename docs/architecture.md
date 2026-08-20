# EchoIsland Architecture

## Owning workspaces

- `src/features/island`: window shape, compact/expanded states, drag and close controls.
- `src/features/monitoring`: monitoring state machine and evidence-bearing audio waveform.
- `src/features/playback`: platform tabs, source availability, and embedded playback.
- `src/features/platform-auth`: official-platform connection status and QR authorization integration slots.
- `src/features/settings`: settings dialog composition and product preferences.
- `src/features/updates`: signed update check, progress, installation, and relaunch. It does not store GitHub credentials.
- `src/services`: typed Tauri IPC/event boundary.
- `src-tauri/src/domains/audio_capture`: Windows render-loopback capture only.
- `src-tauri/src/domains/recognition`: replaceable music recognition providers.
- `src-tauri/src/commands`: thin command adapters joining Tauri to the domains.

## Visualization design

Analytical job: live monitoring. Artifact family: compact strip waveform with direct status text. Renderer: one Canvas2D instance owned by `monitoring`; it displays measured RMS/peak history, not decorative particles. Essential state remains visible as text. Reduced-motion mode freezes morphing and uses a static level bar.

The desktop island has no mobile state. Its resting state is a 72 x 72 logical-pixel circle. Hover reveals a 418 x 80 control island; listening can expand to 500 x 338, playback to 540 x 626, and settings to 620 x 720. Monitoring continues when the surface contracts.

## Update design

GitHub Actions builds on `main` and publishes signed Release assets plus `latest.json` for `v*` tags. The running app uses Tauri updater to check the public endpoint, report progress, verify the artifact signature, install in passive Windows mode, and relaunch. The private signing key exists only in the ignored `.secrets` workspace and GitHub Actions secrets.

## Local-only tooling state

`.npmrc` and `scripts/with-local-cache.ps1` redirect only commands launched from this repository. They do not write global npm/Cargo configuration or system environment variables.

## Regenerable cache cleanup

`scripts/cleanup-regenerable-cache.cjs` owns project-local cache cleanup. It refuses to delete outside the repository root.

- Light cleanup removes `.cache`, TypeScript build info, and Rust incremental directories.
- Deep cleanup additionally removes `dist` and `src-tauri/target`.
- Git pre-push uses deep cleanup so ignored build caches do not accumulate before upload.
- GitHub Actions runs light cleanup before cloud packaging and deep cleanup after artifacts/releases are uploaded.
- Cleanup intentionally does not remove `node_modules`, source files, downloaded cloud artifacts, or release executables.
