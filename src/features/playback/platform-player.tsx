import { ExternalLinkIcon, Music2Icon, PlayIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { openExternalUrl } from "@/services/desktop"
import type { MusicSource, RecognizedTrack } from "@/shared/contracts/music"

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
  const playable = track.sources.find((source) => source.embedUrl)

  return (
    <Card size="sm" className="border-white/8 bg-white/4 ring-white/8">
      <CardHeader>
        <CardTitle>播放来源</CardTitle>
        <CardDescription>优先使用识别服务返回的合法可嵌入地址</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {track.sources.map((source) => <SourceBadge key={source.platform} source={source} />)}
        </div>
        {playable?.embedUrl ? (
          <iframe
            className="aspect-video w-full rounded-lg border-0"
            src={playable.embedUrl}
            title={`${track.artist} - ${track.title}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg bg-muted/40 px-4 text-center">
            <PlayIcon aria-hidden="true" />
            <p className="text-sm text-muted-foreground">识别成功，但结果没有可嵌入的视频 ID。</p>
            {track.sources.find((source) => source.url)?.url ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = track.sources.find((source) => source.url)?.url
                  if (url) void openExternalUrl(url)
                }}
              >
                <ExternalLinkIcon data-icon="inline-start" />
                打开来源
              </Button>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
