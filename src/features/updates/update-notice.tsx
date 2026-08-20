import { DownloadIcon, LoaderCircleIcon, ShieldAlertIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AppUpdateState } from "@/features/updates/use-update-check"

export function UpdateNotice({ state }: { state: AppUpdateState }) {
  if (state.phase === "available") {
    return <Badge variant="secondary"><DownloadIcon data-icon="inline-start" />发现 {state.latestVersion}</Badge>
  }

  if (state.phase === "checking" || state.phase === "downloading" || state.phase === "installing") {
    return <Badge variant="outline"><LoaderCircleIcon data-icon="inline-start" />{state.phase === "checking" ? "检查更新" : "正在更新"}</Badge>
  }

  if (state.phase === "error") {
    return <Badge variant="destructive"><ShieldAlertIcon data-icon="inline-start" />更新异常</Badge>
  }

  return null
}
