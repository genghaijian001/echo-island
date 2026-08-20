# EchoIsland Architecture

## Owning workspaces

- `src/features/island`: window shape, compact/expanded states, drag and close controls.
- `src/features/monitoring`: monitoring state machine and evidence-bearing audio waveform.
- `src/features/playback`: platform tabs, source availability, and embedded playback.
- `src/features/updates`: safe release polling and update notices. It does not store GitHub credentials.
- `src/services`: typed Tauri IPC/event boundary.
- `src-tauri/src/domains/audio_capture`: Windows render-loopback capture only.
- `src-tauri/src/domains/recognition`: replaceable music recognition providers.
- `src-tauri/src/commands`: thin command adapters joining Tauri to the domains.

## Visualization design

Analytical job: live monitoring. Artifact family: compact strip waveform with direct status text. Renderer: one Canvas2D instance owned by `monitoring`; it displays measured RMS/peak history, not decorative particles. Essential state remains visible as text. Reduced-motion mode freezes morphing and uses a static level bar.

The desktop island has no mobile state. Its idle compact state is 392 x 80 logical pixels. Active compact state can use 430 x 82. The expanded listening state is 540 x 338, and playback can expand to 540 x 626 when an embeddable source is present. State is session-local and does not alter URL history.

## Update design

GitHub Actions builds on `main` and publishes Release assets for `v*` tags. The running app checks the latest GitHub Release after startup and compares the release tag with the Tauri app version. GitHub cannot push directly into a running desktop app, and private repositories cannot be checked anonymously. Do not embed GitHub tokens in the app; use a public release endpoint or a signed Tauri updater endpoint for production one-click updates.

## Local-only tooling state

`.npmrc` and `scripts/with-local-cache.ps1` redirect only commands launched from this repository. They do not write global npm/Cargo configuration or system environment variables.
