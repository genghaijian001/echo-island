import { useEffect, useState } from "react"
import {
  AudioLinesIcon,
  CircleStopIcon,
  HeadphonesIcon,
  LoaderCircleIcon,
  PinIcon,
  PinOffIcon,
  PlayIcon,
  XIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { AudioWaveform } from "@/features/monitoring/audio-waveform"
import { useMonitoring } from "@/features/monitoring/use-monitoring"
import { PlatformPlayer } from "@/features/playback/platform-player"
import {
  beginWindowDrag,
  closeWindow,
  isWindowPinned,
  resizeIsland,
  setWindowPinned,
} from "@/services/desktop"

const phaseLabel = {
  idle: "待机",
  starting: "连接中",
  listening: "监听中",
  recognizing: "识别中",
  matched: "已识别",
  error: "异常",
} as const

export function EchoIsland() {
  const { snapshot, level, start, stop } = useMonitoring()
  const [pinned, setPinned] = useState(true)
  const [pinPending, setPinPending] = useState(false)
  const expanded = snapshot.running || snapshot.phase === "starting" || snapshot.phase === "error"
  const hasPlayer = Boolean(snapshot.currentTrack)

  useEffect(() => {
    const size = !expanded ? [392, 80] : hasPlayer ? [540, 590] : [540, 304]
    void resizeIsland(size[0], size[1])
  }, [expanded, hasPlayer])

  useEffect(() => {
    void isWindowPinned().then(setPinned)
  }, [])

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
    <section className="island-shell" data-expanded={expanded} aria-label="EchoIsland 音乐识别">
      <header
        className="island-drag-region"
        onMouseDown={(event) => {
          if ((event.target as HTMLElement).closest("button")) return
          void beginWindowDrag()
        }}
      >
        <div className="island-identity">
          <div className="signal-orb" data-active={snapshot.running}>
            <AudioLinesIcon aria-hidden="true" />
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">EchoIsland</p>
            <p className="truncate text-xs text-muted-foreground">{snapshot.message}</p>
          </div>
        </div>

        {!expanded ? (
          <Button className="island-start" variant="secondary" size="sm" onClick={() => void start()}>
            {snapshot.phase === "starting" ? <LoaderCircleIcon data-icon="inline-start" className="animate-spin" /> : <PlayIcon data-icon="inline-start" />}
            开始识别
          </Button>
        ) : null}

        <div className="island-controls">
          {expanded ? <Badge variant={snapshot.phase === "error" ? "destructive" : "secondary"}>{phaseLabel[snapshot.phase]}</Badge> : null}
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
        <div className="flex flex-col gap-4 px-4 pb-4">
          <AudioWaveform level={level} active={snapshot.running} />

          {snapshot.currentTrack ? (
            <div className="track-grid">
              <div className="album-art">
                {snapshot.currentTrack.artworkUrl ? (
                  <img src={snapshot.currentTrack.artworkUrl} alt={`${snapshot.currentTrack.title} 封面`} />
                ) : <HeadphonesIcon aria-hidden="true" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{snapshot.currentTrack.title}</p>
                <p className="truncate text-sm text-muted-foreground">{snapshot.currentTrack.artist}</p>
              </div>
              <Button variant="destructive" size="icon" onClick={() => void stop()} aria-label="停止持续监听">
                <CircleStopIcon />
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4 rounded-xl bg-white/4 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">正在捕获默认播放设备</p>
                <p className="truncate text-xs text-muted-foreground">仅分析电脑输出，不访问麦克风</p>
              </div>
              <Button variant="destructive" size="sm" onClick={() => void stop()}>
                <CircleStopIcon data-icon="inline-start" />
                停止
              </Button>
            </div>
          )}

          {snapshot.currentTrack ? <PlatformPlayer track={snapshot.currentTrack} /> : null}
        </div>
      ) : null}
    </section>
  )
}
