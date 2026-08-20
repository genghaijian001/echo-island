import { Music2Icon, QrCodeIcon, YoutubeIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const platforms = [
  {
    id: "youtube",
    name: "YouTube",
    description: "识别结果包含视频来源时可直接在岛内播放。",
    ready: true,
    icon: YoutubeIcon,
  },
  {
    id: "qq-music",
    name: "QQ 音乐",
    description: "支持扫码授权方案；正式播放需腾讯音乐合作方凭据。",
    ready: false,
    icon: Music2Icon,
  },
  {
    id: "netease",
    name: "网易云音乐",
    description: "保留扫码授权入口，等待官方桌面播放接口或合作凭据。",
    ready: false,
    icon: Music2Icon,
  },
] as const

export function PlatformConnections() {
  return (
    <div className="platform-connections">
      {platforms.map((platform) => {
        const Icon = platform.icon
        return (
          <article className="platform-connection" key={platform.id}>
            <div className="platform-connection-icon"><Icon aria-hidden="true" /></div>
            <div className="min-w-0">
              <div className="platform-connection-title">
                <span>{platform.name}</span>
                <Badge variant={platform.ready ? "secondary" : "outline"}>
                  {platform.ready ? "可用" : "待官方接入"}
                </Badge>
              </div>
              <p>{platform.description}</p>
            </div>
            {platform.ready ? null : (
              <Button variant="outline" size="sm" disabled title="配置官方 AppID 后开放">
                <QrCodeIcon data-icon="inline-start" />
                扫码登录
              </Button>
            )}
          </article>
        )
      })}
    </div>
  )
}
