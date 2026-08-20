# EchoIsland Product Specification

## Window controls

- The resting surface is a true 72 x 72 circular floating orb. Hovering reveals the horizontal controls; moving away collapses it again.
- Clicking the orb toggles continuous monitoring. Moving the pointer more than five pixels while pressed starts a window drag instead of toggling monitoring.
- The pin control reflects the real Windows always-on-top state and toggles it without changing global settings.
- The close control exits EchoIsland; dragging remains available from non-button areas of the header.
- The island supports a compact/expanded interaction: clicking non-button header space toggles details while monitoring keeps running.
- State changes use short morph/fade animations and respect `prefers-reduced-motion`.

## Visual interaction direction

- Style: refined desktop "dynamic island" with a graphite glass shell, restrained cyan listening accent, amber scanning accent, and green matched accent.
- Idle: circular glass orb with no persistent text sticker; hover morphs it into a compact control island.
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
- Interaction: circular orb -> hover to reveal -> click orb to monitor -> expanded scanning island -> recognized track and sources -> circular active orb.
- Privacy: audio remains in memory. Only fingerprints/recognition requests leave the computer when the active provider requires it.
- Updates: settings show the installed version and release notes, support manual/automatic checks, and can download, verify, install, and relaunch through Tauri updater.

## Provider constraints

The initial provider is an unofficial Shazam-compatible SongRec adapter because no commercial API credentials are available. It can stop working if the remote service changes. Recognition lives behind a provider boundary so ACRCloud or AudD can be added without changing capture or UI code.

YouTube playback requires a concrete video ID. EchoIsland uses a video ID returned by recognition metadata when available. Searching YouTube programmatically requires a user-supplied YouTube Data API key and is intentionally not bypassed with scraping.

QQ Music and NetEase Cloud Music keep explicit QR-login integration slots. The buttons remain unavailable until official partner AppID/authorization contracts are configured; the app never fabricates login state or captures platform cookies.

## Update constraints

- The public repository serves `releases/latest/download/latest.json` without embedding a GitHub credential in the desktop app.
- Tauri updater verifies every update artifact against the bundled public key before installation.
- The signing private key is Git-ignored locally and stored as the `TAURI_SIGNING_PRIVATE_KEY` GitHub Actions secret.
- Main pushes produce cloud artifacts; a `v*` tag produces a signed public Release, signatures, and updater JSON.

## Recognition cadence

- Audio level events: approximately 10-20 updates per second, throttled before UI rendering.
- Recognition window: rolling 8 seconds of non-silent audio.
- Retry cadence: no more than one recognition request every 10 seconds.
- Deduplication: identical artist/title pairs do not create repeated now-playing events.
- Silence: recognition requests pause when RMS remains below the configured threshold.
