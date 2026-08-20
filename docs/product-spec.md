# EchoIsland Product Specification

## Window controls

- The collapsed island uses separate identity, primary-action, and window-control columns so labels never overlap.
- The pin control reflects the real Windows always-on-top state and toggles it without changing global settings.
- The close control exits EchoIsland; dragging remains available from non-button areas of the header.
- The island supports a compact/expanded interaction: clicking non-button header space toggles details while monitoring keeps running.
- State changes use short morph/fade animations and respect `prefers-reduced-motion`.

## Visual interaction direction

- Style: refined desktop "dynamic island" with a graphite glass shell, restrained cyan listening accent, amber scanning accent, and green matched accent.
- Idle: compact capsule with identity and a clear start action.
- Listening: expanded island with smoothed waveform, current status, and a stop action.
- Recognizing: the waveform/scene uses a scanning shimmer to show matching progress.
- Matched: album art, title, artist, stop action, and platform player become the primary visual hierarchy.
- Playback sources: platform choices are shown as segmented tabs, with an embedded player only when a legal embed URL exists.

## Confirmed scope

- Target: Windows 10 and Windows 11.
- Surface: a frameless, transparent, always-on-top desktop island.
- Capture: only the default Windows render endpoint through WASAPI loopback; never the microphone.
- Session: monitoring continues until the user explicitly stops it or exits the app.
- Recognition: analyze rolling system-audio windows and update only when the detected track changes.
- Playback: show an embedded player when a recognized result contains a playable source.
- Interaction: collapsed capsule -> click to monitor -> expanded scanning island -> recognized track and sources -> compact now-playing state.
- Privacy: audio remains in memory. Only fingerprints/recognition requests leave the computer when the active provider requires it.
- Updates: the app can poll a GitHub Release endpoint for a newer version and show an in-app notice. GitHub Actions cannot push directly into a running desktop app; desktop update notices are polling-based unless a separate push channel is introduced.

## Provider constraints

The initial provider is an unofficial Shazam-compatible SongRec adapter because no commercial API credentials are available. It can stop working if the remote service changes. Recognition lives behind a provider boundary so ACRCloud or AudD can be added without changing capture or UI code.

YouTube playback requires a concrete video ID. EchoIsland uses a video ID returned by recognition metadata when available. Searching YouTube programmatically requires a user-supplied YouTube Data API key and is intentionally not bypassed with scraping.

QQ Music and NetEase Cloud Music playback adapters are placeholders until a supported playback URL/API contract is selected. The UI reports unavailable sources instead of pretending playback succeeded.

## Update constraints

- The current implementation checks `https://api.github.com/repos/genghaijian001/echo-island/releases/latest` after startup.
- A private GitHub repository is not anonymously readable by the desktop app. Do not embed a GitHub token in the client. For production update notices, use a public release endpoint or a signed updater service.
- The GitHub Actions workflow builds on `main` pushes and publishes Release assets when a `v*` tag is pushed.
- True one-click install updates should use Tauri's updater plugin with signed update artifacts. This requires a generated signing key, a stored private key in GitHub Actions secrets, and a public key in `tauri.conf.json`.

## Recognition cadence

- Audio level events: approximately 10-20 updates per second, throttled before UI rendering.
- Recognition window: rolling 8 seconds of non-silent audio.
- Retry cadence: no more than one recognition request every 10 seconds.
- Deduplication: identical artist/title pairs do not create repeated now-playing events.
- Silence: recognition requests pause when RMS remains below the configured threshold.
