# EchoIsland Architecture

## Owning workspaces

- `src/features/island`: window shape, compact/expanded states, drag and close controls.
- `src/features/monitoring`: monitoring state machine and evidence-bearing audio waveform.
- `src/features/playback`: provider cards and embedded playback.
- `src/services`: typed Tauri IPC/event boundary.
- `src-tauri/src/domains/audio_capture`: Windows render-loopback capture only.
- `src-tauri/src/domains/recognition`: replaceable music recognition providers.
- `src-tauri/src/commands`: thin command adapters joining Tauri to the domains.

## Visualization design

Analytical job: live monitoring. Artifact family: compact strip waveform with direct status text. Renderer: one Canvas2D instance owned by `monitoring`; it displays measured RMS/peak history, not decorative particles. Essential state remains visible as text. Reduced-motion mode freezes morphing and uses a static level bar.

The desktop island has no mobile state. Its compact state is 308 x 76 logical pixels; the expanded state is 520 x 364. Playback can expand to 520 x 560 when an embeddable source is present. State is session-local and does not alter URL history.

## Local-only tooling state

`.npmrc` and `scripts/with-local-cache.ps1` redirect only commands launched from this repository. They do not write global npm/Cargo configuration or system environment variables.

