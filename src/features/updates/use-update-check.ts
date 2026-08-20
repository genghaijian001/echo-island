import { useEffect, useState } from "react"
import { getVersion } from "@tauri-apps/api/app"
import { isDesktopRuntime } from "@/services/desktop"

const FALLBACK_VERSION = "0.1.0"
const LATEST_RELEASE_URL = "https://api.github.com/repos/genghaijian001/echo-island/releases/latest"

export type UpdateCheckState =
  | { status: "checking"; currentVersion: string }
  | { status: "current"; currentVersion: string }
  | {
      status: "available"
      currentVersion: string
      latestVersion: string
      releaseUrl: string
      releaseName: string
    }
  | { status: "unavailable"; currentVersion: string; reason: string }

interface GitHubRelease {
  tag_name?: string
  name?: string
  html_url?: string
}

function normalizeVersion(version: string) {
  return version.trim().replace(/^v/i, "")
}

function compareVersion(left: string, right: string) {
  const leftParts = normalizeVersion(left).split(".").map((part) => Number.parseInt(part, 10) || 0)
  const rightParts = normalizeVersion(right).split(".").map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < length; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
    if (difference !== 0) return difference
  }

  return 0
}

async function getCurrentVersion() {
  if (!isDesktopRuntime) return FALLBACK_VERSION

  try {
    return await getVersion()
  } catch {
    return FALLBACK_VERSION
  }
}

export function useUpdateCheck() {
  const [state, setState] = useState<UpdateCheckState>({
    status: "checking",
    currentVersion: FALLBACK_VERSION,
  })

  useEffect(() => {
    let active = true

    async function check() {
      const currentVersion = await getCurrentVersion()
      if (!active) return
      setState({ status: "checking", currentVersion })

      try {
        const response = await fetch(LATEST_RELEASE_URL, {
          headers: { Accept: "application/vnd.github+json" },
        })

        if (!response.ok) {
          const reason = response.status === 404
            ? "GitHub Release 不公开，当前应用无法匿名检查更新。"
            : `GitHub 更新源返回 ${response.status}。`
          setState({ status: "unavailable", currentVersion, reason })
          return
        }

        const release = (await response.json()) as GitHubRelease
        const latestVersion = normalizeVersion(release.tag_name ?? "")
        if (!latestVersion || !release.html_url) {
          setState({ status: "unavailable", currentVersion, reason: "GitHub Release 缺少版本号或下载地址。" })
          return
        }

        if (compareVersion(latestVersion, currentVersion) > 0) {
          setState({
            status: "available",
            currentVersion,
            latestVersion,
            releaseUrl: release.html_url,
            releaseName: release.name ?? `EchoIsland ${latestVersion}`,
          })
          return
        }

        setState({ status: "current", currentVersion })
      } catch (error) {
        setState({
          status: "unavailable",
          currentVersion,
          reason: error instanceof Error ? error.message : "无法连接更新源。",
        })
      }
    }

    const timer = window.setTimeout(() => void check(), 1800)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [])

  return state
}
