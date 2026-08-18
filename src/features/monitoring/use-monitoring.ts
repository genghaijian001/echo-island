import { startTransition, useCallback, useEffect, useRef, useState } from "react"
import {
  getMonitorSnapshot,
  isDesktopRuntime,
  startMonitoring,
  stopMonitoring,
  subscribeAudioLevel,
  subscribeMonitorStatus,
  subscribeTrack,
} from "@/services/desktop"
import type {
  AudioLevel,
  MonitorSnapshot,
  RecognizedTrack,
} from "@/shared/contracts/music"

const initialSnapshot: MonitorSnapshot = {
  running: false,
  phase: "idle",
  message: "点击开始识别电脑声音",
}

export function useMonitoring() {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot>(initialSnapshot)
  const [level, setLevel] = useState<AudioLevel>({ rms: 0, peak: 0, timestampMs: 0 })
  const mockTimerRef = useRef<number | null>(null)

  useEffect(() => {
    let active = true
    const unlisteners: Array<() => void> = []

    void Promise.all([
      getMonitorSnapshot(),
      ...(isDesktopRuntime
        ? [
            subscribeAudioLevel((value) => active && setLevel(value)),
            subscribeTrack((track: RecognizedTrack) => {
              if (!active) return
              startTransition(() =>
                setSnapshot((current) => ({
                  ...current,
                  running: true,
                  phase: "matched",
                  message: "已识别当前播放",
                  currentTrack: track,
                })),
              )
            }),
            subscribeMonitorStatus((status) => active && setSnapshot(status)),
          ]
        : []),
    ]).then(([current, ...listeners]) => {
      if (!active) {
        listeners.forEach((listener) => typeof listener === "function" && listener())
        return
      }
      setSnapshot(current as MonitorSnapshot)
      listeners.forEach((listener) => {
        if (typeof listener === "function") unlisteners.push(listener)
      })
    })

    return () => {
      active = false
      unlisteners.forEach((unlisten) => unlisten())
      if (mockTimerRef.current !== null) window.clearInterval(mockTimerRef.current)
    }
  }, [])

  const beginMockLevels = useCallback(() => {
    if (isDesktopRuntime || mockTimerRef.current !== null) return
    mockTimerRef.current = window.setInterval(() => {
      const rms = 0.12 + Math.random() * 0.38
      setLevel({ rms, peak: Math.min(1, rms * 1.7), timestampMs: Date.now() })
    }, 90)
  }, [])

  const start = useCallback(async () => {
    setSnapshot((current) => ({ ...current, phase: "starting", message: "正在连接系统播放设备…" }))
    try {
      const next = await startMonitoring()
      setSnapshot(next)
      beginMockLevels()
    } catch (error) {
      setSnapshot({ running: false, phase: "error", message: String(error) })
    }
  }, [beginMockLevels])

  const stop = useCallback(async () => {
    try {
      setSnapshot(await stopMonitoring())
    } finally {
      if (mockTimerRef.current !== null) {
        window.clearInterval(mockTimerRef.current)
        mockTimerRef.current = null
      }
      setLevel({ rms: 0, peak: 0, timestampMs: Date.now() })
    }
  }, [])

  return { snapshot, level, start, stop }
}

