import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import {
  AudioLinesIcon,
  CheckCircle2Icon,
  CircleStopIcon,
  CloudIcon,
  HeadphonesIcon,
  LoaderCircleIcon,
  PinIcon,
  PinOffIcon,
  RadioIcon,
  SearchIcon,
  SettingsIcon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AudioWaveform } from "@/features/monitoring/audio-waveform"
import { useMonitoring } from "@/features/monitoring/use-monitoring"
import { PlatformPlayer } from "@/features/playback/platform-player"
import { SettingsDialog } from "@/features/settings/settings-dialog"
import { UpdateNotice } from "@/features/updates/update-notice"
import { useUpdateCheck } from "@/features/updates/use-update-check"
import {
  beginWindowDrag,
  closeWindow,
  isWindowPinned,
  resizeIsland,
  setWindowPinned,
} from "@/services/desktop"
import type { MonitorPhase, MonitorSnapshot, RecognizedTrack } from "@/shared/contracts/music"

const phaseLabel = {
  idle: "待机",
  starting: "连接中",
  listening: "监听中",
  recognizing: "识别中",
  matched: "已识别",
  error: "异常",
} as const

const phaseCopy: Record<MonitorPhase, { title: string; subtitle: string }> = {
  idle: { title: "单击圆球开始识别", subtitle: "鼠标移开后自动收缩" },
  starting: { title: "正在连接播放设备", subtitle: "只捕获电脑正在播放的声音" },
  listening: { title: "正在持续监听", subtitle: "单击圆球即可停止" },
  recognizing: { title: "正在匹配音乐", subtitle: "保持播放，正在分析声音指纹" },
  matched: { title: "识别到了", subtitle: "已找到当前播放的音乐" },
  error: { title: "监听遇到问题", subtitle: "检查播放设备后再次单击圆球" },
}

function getPhaseIcon(phase: MonitorPhase) {
  if (phase === "starting") return LoaderCircleIcon
  if (phase === "recognizing") return SearchIcon
  if (phase === "matched") return CheckCircle2Icon
  if (phase === "listening") return RadioIcon
  if (phase === "error") return XIcon
  return AudioLinesIcon
}

function getIslandTone(snapshot: MonitorSnapshot) {
  if (snapshot.phase === "error") return "error"
  if (snapshot.currentTrack) return "matched"
  if (snapshot.phase === "recognizing") return "scanning"
  if (snapshot.running || snapshot.phase === "starting") return "listening"
  return "idle"
}

function StatusScene({ snapshot }: { snapshot: MonitorSnapshot }) {
  const copy = phaseCopy[snapshot.phase]
  const scanning = snapshot.phase === "recognizing" || snapshot.phase === "starting"

  return (
    <div className="status-scene" data-scanning={scanning}>
      <div className="status-copy">
        <span className="status-kicker">{phaseLabel[snapshot.phase]}</span>
        <p className="status-title">{copy.title}</p>
        <p className="status-subtitle">{copy.subtitle}</p>
      </div>
      <div className="status-live-dot" data-active={snapshot.running} aria-hidden="true" />
    </div>
  )
}

function TrackSummary({ track }: { track: RecognizedTrack }) {
  return (
    <div className="track-grid">
      <div className="album-art">
        {track.artworkUrl ? <img src={track.artworkUrl} alt={`${track.title} 封面`} /> : <HeadphonesIcon aria-hidden="true" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{track.title}</p>
        <p className="truncate text-sm text-muted-foreground">{track.artist}</p>
      </div>
      <Badge variant="secondary">正在播放</Badge>
    </div>
  )
}

export function EchoIsland() {
  const { snapshot, level, start, stop } = useMonitoring()
  const updater = useUpdateCheck()
  const [hovered, setHovered] = useState(false)
  const [attentionOpen, setAttentionOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [pinned, setPinned] = useState(true)
  const [pinPending, setPinPending] = useState(false)
  const collapseTimer = useRef<number | null>(null)
  const attentionTimer = useRef<number | null>(null)
  const active = snapshot.running || snapshot.phase === "starting" || snapshot.phase === "error" || Boolean(snapshot.currentTrack)
  const revealed = hovered || attentionOpen || settingsOpen
  const showStage = revealed && active
  const hasPlayer = Boolean(snapshot.currentTrack)
  const tone = getIslandTone(snapshot)
  const PhaseIcon = getPhaseIcon(snapshot.phase)
  const copy = phaseCopy[snapshot.phase]

  useEffect(() => {
    const size = settingsOpen
      ? [620, 720]
      : !revealed
        ? [72, 72]
        : hasPlayer
          ? [540, 626]
          : active
            ? [500, 338]
            : [418, 80]
    void resizeIsland(size[0], size[1])
  }, [active, hasPlayer, revealed, settingsOpen])

  useEffect(() => {
    void isWindowPinned().then(setPinned)
  }, [])

  useEffect(() => {
    if (!snapshot.currentTrack) return
    setAttentionOpen(true)
    if (attentionTimer.current !== null) window.clearTimeout(attentionTimer.current)
    attentionTimer.current = window.setTimeout(() => setAttentionOpen(false), 6500)
    return () => {
      if (attentionTimer.current !== null) window.clearTimeout(attentionTimer.current)
    }
  }, [snapshot.currentTrack?.id])

  function revealIsland() {
    if (collapseTimer.current !== null) window.clearTimeout(collapseTimer.current)
    setHovered(true)
  }

  function scheduleCollapse() {
    if (settingsOpen) return
    collapseTimer.current = window.setTimeout(() => setHovered(false), 260)
  }

  async function toggleMonitoring() {
    if (snapshot.running || snapshot.phase === "starting") {
      await stop()
      setAttentionOpen(false)
    } else {
      setAttentionOpen(true)
      if (attentionTimer.current !== null) window.clearTimeout(attentionTimer.current)
      attentionTimer.current = window.setTimeout(() => setAttentionOpen(false), 2200)
      await start()
    }
  }

  function handleOrbPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    const startX = event.clientX
    const startY = event.clientY
    let dragged = false

    function cleanup() {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      window.removeEventListener("pointercancel", cleanup)
    }

    function handleMove(moveEvent: PointerEvent) {
      if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 5) return
      dragged = true
      cleanup()
      void beginWindowDrag()
    }

    function handleUp() {
      cleanup()
      if (!dragged) void toggleMonitoring()
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    window.addEventListener("pointercancel", cleanup)
  }

  async function togglePinned(nextPinned = !pinned) {
    setPinPending(true)
    try {
      await setWindowPinned(nextPinned)
      setPinned(nextPinned)
    } finally {
      setPinPending(false)
    }
  }

  return (
    <section
      className="island-shell"
      data-revealed={revealed}
      data-stage={showStage}
      data-tone={tone}
      aria-label="EchoIsland 音乐识别悬浮球"
      onMouseEnter={revealIsland}
      onMouseLeave={scheduleCollapse}
    >
      <header
        className="island-bar"
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).closest("button, [role='button']")) return
          void beginWindowDrag()
        }}
      >
        <div
          className="floating-orb"
          role="button"
          tabIndex={0}
          aria-label={snapshot.running ? "停止持续识别" : "开始持续识别"}
          aria-pressed={snapshot.running}
          data-active={snapshot.running}
          data-phase={snapshot.phase}
          onPointerDown={handleOrbPointerDown}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              void toggleMonitoring()
            }
          }}
        >
          <span className="orb-energy-ring" aria-hidden="true" />
          <PhaseIcon aria-hidden="true" />
          {snapshot.running ? <span className="orb-running-dot" aria-hidden="true" /> : null}
        </div>

        <div className="island-copy">
          <p className="truncate text-sm font-semibold">{snapshot.currentTrack?.title ?? "EchoIsland"}</p>
          <p className="truncate text-xs text-muted-foreground">
            {snapshot.currentTrack?.artist ?? snapshot.message ?? copy.title}
          </p>
        </div>

        <div className="island-controls">
          <UpdateNotice state={updater.state} />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="打开设置"
                  onClick={() => setSettingsOpen(true)}
                />
              }
            >
              <SettingsIcon />
            </TooltipTrigger>
            <TooltipContent>设置</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  className="island-pin"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={pinned ? "取消置顶" : "置顶窗口"}
                  aria-pressed={pinned}
                  data-active={pinned}
                  disabled={pinPending}
                  onClick={() => void togglePinned()}
                />
              }
            >
              {pinned ? <PinIcon /> : <PinOffIcon />}
            </TooltipTrigger>
            <TooltipContent>{pinned ? "取消置顶" : "置顶"}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon-sm" aria-label="关闭 EchoIsland" onClick={() => void closeWindow()} />}>
              <XIcon />
            </TooltipTrigger>
            <TooltipContent>关闭</TooltipContent>
          </Tooltip>
        </div>
      </header>

      {showStage ? (
        <div className="island-stage">
          <AudioWaveform level={level} active={snapshot.running} />
          {snapshot.currentTrack ? <TrackSummary track={snapshot.currentTrack} /> : <StatusScene snapshot={snapshot} />}
          {snapshot.currentTrack ? <PlatformPlayer track={snapshot.currentTrack} /> : null}
          <div className="privacy-strip">
            {snapshot.running ? <CircleStopIcon aria-hidden="true" /> : <CloudIcon aria-hidden="true" />}
            <span>{snapshot.running ? "单击左上圆球停止持续监听；只分析电脑输出声音。" : "不访问麦克风，音频片段只保留在内存中。"}</span>
          </div>
        </div>
      ) : null}

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        pinned={pinned}
        onPinnedChange={(nextPinned) => void togglePinned(nextPinned)}
        updateState={updater.state}
        autoCheck={updater.autoCheck}
        onAutoCheckChange={updater.setAutoCheck}
        onCheckForUpdates={() => void updater.checkForUpdates()}
        onInstallUpdate={() => void updater.installUpdate()}
      />
    </section>
  )
}
