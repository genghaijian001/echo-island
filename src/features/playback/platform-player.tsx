import { useEffect, useMemo, useState } from "react"
import { ExternalLinkIcon, Music2Icon, PlayIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { openExternalUrl } from "@/services/desktop"
import type { MusicPlatform, MusicSource, RecognizedTrack } from "@/shared/contracts/music"

interface PlatformPlayerProps {
  track: RecognizedTrack
}

function SourceBadge({ source }: { source: MusicSource }) {
  return (
    <Badge variant={source.available ? "secondary" : "outline"}>
      <Music2Icon data-icon="inline-start" />
      {source.label}
    </Badge>
  )
}

export function PlatformPlayer({ track }: PlatformPlayerProps) {
  const defaultPlatform = useMemo(
    () => track.sources.find((source) => source.embedUrl)?.platform ?? track.sources[0]?.platform ?? "youtube",
    [track.sources],
  )
  const [selectedPlatform, setSelectedPlatform] = useState<MusicPlatform>(defaultPlatform)

  useEffect(() => {
    setSelectedPlatform(defaultPlatform)
  }, [defaultPlatform, track.id])

  const selectedSource = track.sources.find((source) => source.platform === selectedPlatform) ?? track.sources[0]
  const playable = selectedSource?.embedUrl ? selectedSource : track.sources.find((source) => source.embedUrl)
  const sourceUrl = selectedSource?.url ?? playable?.url

  return (
    <section className="platform-panel" aria-label="播放来源">
      <div className="platform-panel-header">
        <div>
          <p className="platform-title">播放来源</p>
          <p className="platform-subtitle">{playable?.embedUrl ? "已找到可嵌入来源" : "当前结果需要打开平台播放"}</p>
        </div>
        <div className="platform-badges">
          {track.sources.map((source) => <SourceBadge key={source.platform} source={source} />)}
        </div>
      </div>

      <div className="platform-tabs" role="tablist" aria-label="选择音乐平台">
        {track.sources.map((source) => (
          <button
            key={source.platform}
            className="platform-tab"
            type="button"
            role="tab"
            aria-selected={source.platform === selectedPlatform}
            data-active={source.platform === selectedPlatform}
            disabled={!source.available && !source.url && !source.embedUrl}
            onClick={() => setSelectedPlatform(source.platform)}
          >
            {source.label}
          </button>
        ))}
      </div>

      {playable?.embedUrl ? (
        <iframe
          className="platform-frame"
          src={playable.embedUrl}
          title={`${track.artist} - ${track.title}`}
          allow="autoplay; encrypted-media; picture-in-picture"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <div className="platform-empty">
          <PlayIcon aria-hidden="true" />
          <p>识别成功，但没有返回可嵌入的视频 ID。</p>
          {sourceUrl ? (
            <Button variant="outline" size="sm" onClick={() => void openExternalUrl(sourceUrl)}>
              <ExternalLinkIcon data-icon="inline-start" />
              打开来源
            </Button>
          ) : null}
        </div>
      )}
    </section>
  )
}
