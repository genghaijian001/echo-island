import { DownloadIcon, ShieldCheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { openExternalUrl } from "@/services/desktop"
import type { UpdateCheckState } from "@/features/updates/use-update-check"

interface UpdateNoticeProps {
  state: UpdateCheckState
}

export function UpdateNotice({ state }: UpdateNoticeProps) {
  if (state.status === "checking") {
    return (
      <div className="update-notice" data-status="checking">
        <ShieldCheckIcon aria-hidden="true" />
        <span>正在检查更新</span>
      </div>
    )
  }

  if (state.status === "available") {
    return (
      <div className="update-notice" data-status="available">
        <DownloadIcon aria-hidden="true" />
        <div className="min-w-0">
          <p className="truncate">发现 EchoIsland {state.latestVersion}</p>
          <p className="truncate">当前版本 {state.currentVersion}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void openExternalUrl(state.releaseUrl)}>
          打开
        </Button>
      </div>
    )
  }

  if (state.status === "unavailable") {
    return (
      <div className="update-notice" data-status="muted">
        <ShieldCheckIcon aria-hidden="true" />
        <span>{state.reason}</span>
      </div>
    )
  }

  return (
    <div className="update-notice" data-status="current">
      <ShieldCheckIcon aria-hidden="true" />
      <span>已是最新版本 {state.currentVersion}</span>
    </div>
  )
}
