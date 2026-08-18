export type MonitorPhase =
  | "idle"
  | "starting"
  | "listening"
  | "recognizing"
  | "matched"
  | "error"

export type MusicPlatform = "youtube" | "netease" | "qq"

export interface AudioLevel {
  rms: number
  peak: number
  timestampMs: number
}

export interface MusicSource {
  platform: MusicPlatform
  label: string
  available: boolean
  url?: string
  embedUrl?: string
  note?: string
}

export interface RecognizedTrack {
  id: string
  title: string
  artist: string
  album?: string
  artworkUrl?: string
  recognizedAt: string
  sources: MusicSource[]
}

export interface MonitorSnapshot {
  running: boolean
  phase: MonitorPhase
  message: string
  currentTrack?: RecognizedTrack
}

