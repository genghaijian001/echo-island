import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window"
import { openUrl } from "@tauri-apps/plugin-opener"
import type {
  AudioLevel,
  MonitorSnapshot,
  RecognizedTrack,
} from "@/shared/contracts/music"

export const isDesktopRuntime = "__TAURI_INTERNALS__" in window

const browserSnapshot: MonitorSnapshot = {
  running: false,
  phase: "idle",
  message: "浏览器预览模式",
}

export async function getMonitorSnapshot(): Promise<MonitorSnapshot> {
  return isDesktopRuntime
    ? invoke<MonitorSnapshot>("get_monitor_snapshot")
    : browserSnapshot
}

export async function startMonitoring(): Promise<MonitorSnapshot> {
  if (!isDesktopRuntime) {
    return { running: true, phase: "listening", message: "浏览器预览：正在模拟系统声音" }
  }
  return invoke<MonitorSnapshot>("start_monitoring")
}

export async function stopMonitoring(): Promise<MonitorSnapshot> {
  if (!isDesktopRuntime) {
    return { running: false, phase: "idle", message: "已停止监听" }
  }
  return invoke<MonitorSnapshot>("stop_monitoring")
}

export async function subscribeAudioLevel(
  handler: (payload: AudioLevel) => void,
): Promise<UnlistenFn> {
  return listen<AudioLevel>("audio-level", ({ payload }) => handler(payload))
}

export async function subscribeTrack(
  handler: (payload: RecognizedTrack) => void,
): Promise<UnlistenFn> {
  return listen<RecognizedTrack>("track-recognized", ({ payload }) => handler(payload))
}

export async function subscribeMonitorStatus(
  handler: (payload: MonitorSnapshot) => void,
): Promise<UnlistenFn> {
  return listen<MonitorSnapshot>("monitor-status", ({ payload }) => handler(payload))
}

export async function resizeIsland(width: number, height: number) {
  if (isDesktopRuntime) {
    await getCurrentWindow().setSize(new LogicalSize(width, height))
  }
}

export async function beginWindowDrag() {
  if (isDesktopRuntime) await getCurrentWindow().startDragging()
}

export async function closeWindow() {
  if (isDesktopRuntime) await getCurrentWindow().close()
}

export async function isWindowPinned(): Promise<boolean> {
  return isDesktopRuntime ? getCurrentWindow().isAlwaysOnTop() : false
}

export async function setWindowPinned(pinned: boolean) {
  if (isDesktopRuntime) await getCurrentWindow().setAlwaysOnTop(pinned)
}

export async function openExternalUrl(url: string) {
  if (isDesktopRuntime) {
    await openUrl(url)
  } else {
    window.open(url, "_blank", "noopener,noreferrer")
  }
}
