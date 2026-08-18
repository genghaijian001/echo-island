# EchoIsland Product Specification

## Window controls

- The collapsed island uses separate identity, primary-action, and window-control columns so labels never overlap.
- The pin control reflects the real Windows always-on-top state and toggles it without changing global settings.
- The close control exits EchoIsland; dragging remains available from non-button areas of the header.

## Confirmed scope

- Target: Windows 10 and Windows 11.
- Surface: a frameless, transparent, always-on-top desktop island.
- Capture: only the default Windows render endpoint through WASAPI loopback; never the microphone.
- Session: monitoring continues until the user explicitly stops it or exits the app.
- Recognition: analyze rolling system-audio windows and update only when the detected track changes.
- Playback: show an embedded player when a recognized result contains a playable source.
- Interaction: collapsed capsule -> click to monitor -> expanded scanning island -> recognized track and sources -> compact now-playing state.
- Privacy: audio remains in memory. Only fingerprints/recognition requests leave the computer when the active provider requires it.

## Provider constraints

The initial provider is an unofficial Shazam-compatible SongRec adapter because no commercial API credentials are available. It can stop working if the remote service changes. Recognition lives behind a provider boundary so ACRCloud or AudD can be added without changing capture or UI code.

YouTube playback requires a concrete video ID. EchoIsland uses a video ID returned by recognition metadata when available. Searching YouTube programmatically requires a user-supplied YouTube Data API key and is intentionally not bypassed with scraping.

QQ Music and NetEase Cloud Music playback adapters are placeholders until a supported playback URL/API contract is selected. The UI reports unavailable sources instead of pretending playback succeeded.

## Recognition cadence

- Audio level events: approximately 10-20 updates per second, throttled before UI rendering.
- Recognition window: rolling 8 seconds of non-silent audio.
- Retry cadence: no more than one recognition request every 10 seconds.
- Deduplication: identical artist/title pairs do not create repeated now-playing events.
- Silence: recognition requests pause when RMS remains below the configured threshold.
