# EchoIsland

EchoIsland is a Windows 10/11 always-on-top music recognition island. It captures only the default Windows playback endpoint through WASAPI loopback, displays measured audio levels, recognizes rolling audio windows, and embeds a playable source when recognition metadata includes one.

## Local-only setup

All generated dependencies, downloads, caches and build outputs are kept inside this repository. The scripts do not run global npm/Cargo configuration commands and do not persist environment variables. The WebView2 browser profile is explicitly stored at `.cache/webview-profile-v2` instead of the default Windows user profile location.

```powershell
npm install
npm run setup:windows-sdk
npm run desktop:dev
```

The setup script downloads Microsoft's official Windows SDK NuGet packages into `.cache/windows-sdk`. This machine currently has MSVC in `E:\Visual Studio 2026`; `scripts/with-local-cache.ps1` discovers a usable MSVC toolset there and imports paths only for its child process.

## Validation

```powershell
npm run build
npm run format:rust
npm run check:rust
npm run test:rust
```

## Important provider limits

- The initial SongRec/Shazam-compatible provider is unofficial and may stop working when the remote service changes.
- Only fingerprints are submitted by the provider; raw captured system audio is retained in memory and discarded as the rolling window advances.
- YouTube embedding works only when recognition returns a concrete video ID. Official programmatic search requires a YouTube Data API key.
- NetEase Cloud Music and QQ Music currently show source/search availability but require supported playback contracts before they can be embedded.

See `docs/product-spec.md` and `docs/architecture.md` for the detailed contracts and module ownership.
