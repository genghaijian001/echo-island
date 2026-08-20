import { useCallback, useEffect, useRef, useState } from "react"
import { getVersion } from "@tauri-apps/api/app"
import { relaunch } from "@tauri-apps/plugin-process"
import { check } from "@tauri-apps/plugin-updater"
import { isDesktopRuntime } from "@/services/desktop"

const FALLBACK_VERSION = "0.2.0"
const AUTO_CHECK_KEY = "echo-island:auto-check-updates:v1"

export type AppUpdateState = {
  phase: "idle" | "checking" | "current" | "available" | "downloading" | "installing" | "error"
  currentVersion: string
  latestVersion?: string
  notes?: string
  publishedAt?: string
  progress?: number
  downloadedBytes?: number
  totalBytes?: number
  error?: string
}

export type UpdateCheckState = AppUpdateState

function readAutoCheckPreference() {
  try {
    return window.localStorage.getItem(AUTO_CHECK_KEY) !== "false"
  } catch {
    return true
  }
}

export function useUpdateCheck() {
  const [autoCheck, setAutoCheckState] = useState(readAutoCheckPreference)
  const [state, setState] = useState<AppUpdateState>({ phase: "idle", currentVersion: FALLBACK_VERSION })
  const pendingUpdate = useRef<Awaited<ReturnType<typeof check>>>(null)

  useEffect(() => {
    let active = true

    async function loadVersion() {
      if (!isDesktopRuntime) return
      try {
        const currentVersion = await getVersion()
        if (active) setState((current) => ({ ...current, currentVersion }))
      } catch {
        // Keep the bundled fallback version in browser previews and rare IPC failures.
      }
    }

    void loadVersion()
    return () => {
      active = false
    }
  }, [])

  const checkForUpdates = useCallback(async () => {
    setState((current) => ({ phase: "checking", currentVersion: current.currentVersion }))

    if (!isDesktopRuntime) {
      setState((current) => ({ phase: "current", currentVersion: current.currentVersion }))
      return
    }

    try {
      const update = await check()
      pendingUpdate.current = update

      if (!update) {
        setState((current) => ({ phase: "current", currentVersion: current.currentVersion }))
        return
      }

      setState((current) => ({
        phase: "available",
        currentVersion: current.currentVersion,
        latestVersion: update.version,
        notes: update.body || "此版本包含体验优化与稳定性改进。",
        publishedAt: update.date ?? undefined,
      }))
    } catch (error) {
      setState((current) => ({
        phase: "error",
        currentVersion: current.currentVersion,
        error: error instanceof Error ? error.message : "无法连接更新服务器。",
      }))
    }
  }, [])

  const installUpdate = useCallback(async () => {
    const update = pendingUpdate.current
    if (!update) {
      await checkForUpdates()
      return
    }

    let downloadedBytes = 0
    let totalBytes = 0
    setState((current) => ({ ...current, phase: "downloading", progress: 0 }))

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength ?? 0
        } else if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength
        } else if (event.event === "Finished") {
          setState((current) => ({ ...current, phase: "installing", progress: 100 }))
          return
        }

        const progress = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0
        setState((current) => ({
          ...current,
          phase: "downloading",
          progress,
          downloadedBytes,
          totalBytes,
        }))
      })

      await relaunch()
    } catch (error) {
      setState((current) => ({
        ...current,
        phase: "error",
        error: error instanceof Error ? error.message : "更新下载或安装失败。",
      }))
    }
  }, [checkForUpdates])

  useEffect(() => {
    if (!autoCheck) return
    const timer = window.setTimeout(() => void checkForUpdates(), 2400)
    return () => window.clearTimeout(timer)
  }, [autoCheck, checkForUpdates])

  const setAutoCheck = useCallback((enabled: boolean) => {
    setAutoCheckState(enabled)
    try {
      window.localStorage.setItem(AUTO_CHECK_KEY, String(enabled))
    } catch {
      // The preference is still retained for this session when storage is unavailable.
    }
  }, [])

  return { state, autoCheck, setAutoCheck, checkForUpdates, installUpdate }
}
