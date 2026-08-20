import { useEffect, useState } from "react"
import {
  AudioLinesIcon,
  CheckCircle2Icon,
  CircleStopIcon,
  CloudIcon,
  DownloadIcon,
  HeadphonesIcon,
  LoaderCircleIcon,
  PinIcon,
  PinOffIcon,
  PlayIcon,
  RadioIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AudioWaveform } from "@/features/monitoring/audio-waveform"
import { useMonitoring } from "@/features/monitoring/use-monitoring"
import { PlatformPlayer } from "@/features/playback/platform-player"
import { UpdateNotice } from "@/features/updates/update-notice"
import { useUpdateCheck } from "@/features/updates/use-update-check"
import {
  beginWindowDrag,
  closeWindow,
  isWindowPinned,
  openExternalUrl,
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
  idle: {
    title: "点击开始识别电脑声音",
    subtitle: "只监听系统输出，不访问麦克风",
  },
  starting: {
    title: "正在连接播放设备",
    subtitle: "准备捕获你耳机里听到的声音",
  },
  listening: {
    title: "正在听电脑声音",
    subtitle: "保持播放，EchoIsland 会自动匹配",
  },
  recognizing: {
    title: "正在匹配音乐",
    subtitle: "从当前声音片段里提取指纹",
  },
  matched: {
    title: "识别到了",
    subtitle: "已找到当前播放的音乐",
  },
  error: {
    title: "监听遇到问题",
    subtitle: "检查播放设备或稍后重试",
  },
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

function IslandIdentity({ snapshot }: { snapshot: MonitorSnapshot }) {
  const PhaseIcon = getPhaseIcon(snapshot.phase)
  const copy = phaseCopy[snapshot.phase]

  return (
    <div className="island-identity">
      <div className="signal-orb" data-active={snapshot.running} data-phase={snapshot.phase}>
        <PhaseIcon aria-hidden="true" />
      </div>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-sm font-semibold tracking-normal">EchoIsland</p>
        <p className="truncate text-xs text-muted-foreground">{snapshot.message || copy.title}</p>
      </div>
    </div>
  )
}

function CompactAction({
  snapshot,
  onStart,
  onStop,
}: {
  snapshot: MonitorSnapshot
  onStart: () => void
  onStop: () => void
}) {
  if (snapshot.running || snapshot.phase === "starting") {
    return (
      <Button className="island-mini-stop" variant="secondary" size="sm" onClick={onStop}>
        <CircleStopIcon data-icon="inline-start" />
        停止
      </Button>
    )
  }

  return (
    <Button className="island-start" variant="secondary" size="sm" onClick={onStart}>
      <PlayIcon data-icon="inline-start" />
      开始识别
    </Button>
  )
}

function StatusScene({
  snapshot,
  onStop,
}: {
  snapshot: MonitorSnapshot
  onStop: () => void
}) {
  const copy = phaseCopy[snapshot.phase]
  const scanning = snapshot.phase === "recognizing" || snapshot.phase === "starting"

  return (
    <div className="status-scene" data-scanning={scanning}>
      <div className="status-copy">
        <span className="status-kicker">{phaseLabel[snapshot.phase]}</span>
        <p className="status-title">{copy.title}</p>
        <p className="status-subtitle">{copy.subtitle}</p>
      </div>
      <Button variant="destructive" size="sm" onClick={onStop}>
        <CircleStopIcon data-icon="inline-start" />
        停止
      </Button>
    </div>
  )
}

function TrackSummary({
  track,
  onStop,
}: {
  track: RecognizedTrack
  onStop: () => void
}) {
  return (
    <div className="track-grid">
      <div className="album-art">
        {track.artworkUrl ? <img src={track.artworkUrl} alt={`${track.title} 封面`} /> : <HeadphonesIcon aria-hidden="true" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-base font-semibold">{track.title}</p>
        <p className="truncate text-sm text-muted-foreground">{track.artist}</p>
      </div>
      <Button variant="destructive" size="icon" onClick={onStop} aria-label="停止持续监听">
        <CircleStopIcon />
      </Button>
    </div>
  )
}

export function EchoIsland() {
  const { snapshot, level, start, stop } = useMonitoring()
  const updateState = useUpdateCheck()
  const [pinned, setPinned] = useState(true)
  const [pinPending, setPinPending] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const active = snapshot.running || snapshot.phase === "starting" || snapshot.phase === "error" || Boolean(snapshot.currentTrack)
  const expanded = active && detailsOpen
  const hasPlayer = Boolean(snapshot.currentTrack)
  const hasUpdate = updateState.status === "available"
  const tone = getIslandTone(snapshot)

  useEffect(() => {
    const size = !expanded ? (active || hasUpdate ? [430, 82] : [392, 80]) : hasPlayer ? [540, 626] : [540, 338]
    void resizeIsland(size[0], size[1])
  }, [active, expanded, hasPlayer, hasUpdate])

  useEffect(() => {
    void isWindowPinned().then(setPinned)
  }, [])

  useEffect(() => {
    if (snapshot.running || snapshot.phase === "starting" || snapshot.phase === "error" || snapshot.currentTrack) {
      setDetailsOpen(true)
    }
  }, [snapshot.currentTrack, snapshot.phase, snapshot.running])

  async function handleStart() {
    setDetailsOpen(true)
    await start()
  }

  async function handleStop() {
    await stop()
    setDetailsOpen(false)
  }

  async function togglePinned() {
    const nextPinned = !pinned
    setPinPending(true)
    try {
      await setWindowPinned(nextPinned)
      setPinned(nextPinned)
    } finally {
      setPinPending(false)
    }
  }

  return (
    <section className="island-shell" data-expanded={expanded} data-tone={tone} aria-label="EchoIsland 音乐识别">
      <header
        className="island-drag-region"
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return
          void beginWindowDrag()
        }}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("button")) return
          if (active) setDetailsOpen((open) => !open)
        }}
      >
        <IslandIdentity snapshot={snapshot} />

        {!expanded ? <CompactAction snapshot={snapshot} onStart={() => void handleStart()} onStop={() => void handleStop()} /> : null}

        <div className="island-controls">
          {expanded ? <Badge variant={snapshot.phase === "error" ? "destructive" : "secondary"}>{phaseLabel[snapshot.phase]}</Badge> : null}
          {hasUpdate ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    className="island-update-button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`发现 EchoIsland ${updateState.latestVersion} 更新`}
                    onClick={() => void openExternalUrl(updateState.releaseUrl)}
                  />
                }
              >
                <DownloadIcon />
              </TooltipTrigger>
              <TooltipContent>发现更新</TooltipContent>
            </Tooltip>
          ) : null}
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

      {expanded ? (
        <div className="island-stage">
          <AudioWaveform level={level} active={snapshot.running} />

          {snapshot.currentTrack ? (
            <TrackSummary track={snapshot.currentTrack} onStop={() => void handleStop()} />
          ) : (
            <StatusScene snapshot={snapshot} onStop={() => void handleStop()} />
          )}

          {snapshot.currentTrack ? <PlatformPlayer track={snapshot.currentTrack} /> : null}
          <UpdateNotice state={updateState} />

          <div className="privacy-strip">
            <CloudIcon aria-hidden="true" />
            <span>实时分析电脑输出声音，不访问麦克风；更新检测只查询 GitHub Release 版本号。</span>
          </div>
        </div>
      ) : null}
    </section>
  )
}
