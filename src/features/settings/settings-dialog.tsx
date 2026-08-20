import {
  CheckCircle2Icon,
  DownloadIcon,
  LoaderCircleIcon,
  PinIcon,
  RefreshCwIcon,
  Settings2Icon,
  ShieldCheckIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { PlatformConnections } from "@/features/platform-auth/platform-connections"
import type { AppUpdateState } from "@/features/updates/use-update-check"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  pinned: boolean
  onPinnedChange: (pinned: boolean) => void
  updateState: AppUpdateState
  autoCheck: boolean
  onAutoCheckChange: (enabled: boolean) => void
  onCheckForUpdates: () => void
  onInstallUpdate: () => void
}

function formatBytes(bytes = 0) {
  if (!bytes) return "准备下载"
  const megabytes = bytes / 1024 / 1024
  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`
}

function UpdatePanel({
  state,
  onCheck,
  onInstall,
}: {
  state: AppUpdateState
  onCheck: () => void
  onInstall: () => void
}) {
  const busy = state.phase === "checking" || state.phase === "downloading" || state.phase === "installing"

  return (
    <div className="settings-update-card" data-phase={state.phase}>
      <div className="settings-update-heading">
        <div>
          <span className="settings-eyebrow">当前版本</span>
          <p>EchoIsland {state.currentVersion}</p>
        </div>
        {state.phase === "available" ? <Badge variant="secondary">发现 {state.latestVersion}</Badge> : null}
        {state.phase === "current" ? <Badge variant="outline"><CheckCircle2Icon data-icon="inline-start" />已是最新</Badge> : null}
      </div>

      {state.phase === "available" ? (
        <div className="update-release-notes">
          <p className="update-release-title">EchoIsland {state.latestVersion}</p>
          <p>{state.notes}</p>
        </div>
      ) : null}

      {state.phase === "current" || state.phase === "idle" ? (
        <p className="settings-version-copy">精致悬浮球、持续系统声音识别、岛内播放与安全更新。</p>
      ) : null}

      {state.phase === "error" ? <p className="settings-error-copy">{state.error}</p> : null}

      {state.phase === "downloading" || state.phase === "installing" ? (
        <Progress value={state.progress ?? 0}>
          <ProgressLabel>{state.phase === "installing" ? "正在安装并准备重启" : "正在下载安全更新"}</ProgressLabel>
          <ProgressValue>
            {() => state.phase === "installing" ? "100%" : `${state.progress ?? 0}% · ${formatBytes(state.downloadedBytes)}`}
          </ProgressValue>
        </Progress>
      ) : null}

      <div className="settings-update-actions">
        <Button variant="outline" size="sm" disabled={busy} onClick={onCheck}>
          {state.phase === "checking" ? <LoaderCircleIcon data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
          {state.phase === "checking" ? "正在检查" : "检查更新"}
        </Button>
        {state.phase === "available" ? (
          <Button size="sm" onClick={onInstall}>
            <DownloadIcon data-icon="inline-start" />
            立即更新
          </Button>
        ) : null}
      </div>
    </div>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
  pinned,
  onPinnedChange,
  updateState,
  autoCheck,
  onAutoCheckChange,
  onCheckForUpdates,
  onInstallUpdate,
}: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="settings-dialog">
        <DialogHeader>
          <div className="settings-title-row">
            <div className="settings-title-icon"><Settings2Icon aria-hidden="true" /></div>
            <div>
              <DialogTitle>EchoIsland 设置</DialogTitle>
              <DialogDescription>管理悬浮球、平台连接和软件更新。</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <section className="settings-section" aria-labelledby="floating-settings-title">
          <div className="settings-section-heading">
            <div>
              <h2 id="floating-settings-title">悬浮球</h2>
              <p>鼠标移入展开，单击圆球开始或停止监听。</p>
            </div>
          </div>
          <label className="settings-toggle-row">
            <span className="settings-toggle-icon"><PinIcon aria-hidden="true" /></span>
            <span className="min-w-0">
              <strong>始终置顶</strong>
              <small>保持悬浮球位于其他应用上方</small>
            </span>
            <Switch checked={pinned} onCheckedChange={onPinnedChange} aria-label="始终置顶" />
          </label>
        </section>

        <Separator />

        <section className="settings-section" aria-labelledby="platform-settings-title">
          <div className="settings-section-heading">
            <div>
              <h2 id="platform-settings-title">音乐平台</h2>
              <p>只使用平台允许的授权与播放方式。</p>
            </div>
          </div>
          <PlatformConnections />
        </section>

        <Separator />

        <section className="settings-section" aria-labelledby="update-settings-title">
          <div className="settings-section-heading">
            <div>
              <h2 id="update-settings-title">软件更新</h2>
              <p>安装包会先验证 EchoIsland 签名，再执行更新。</p>
            </div>
            <ShieldCheckIcon aria-hidden="true" />
          </div>
          <label className="settings-toggle-row compact">
            <span className="min-w-0">
              <strong>自动检查更新</strong>
              <small>启动后只查询版本，不会自动下载安装</small>
            </span>
            <Switch checked={autoCheck} onCheckedChange={onAutoCheckChange} aria-label="自动检查更新" />
          </label>
          <UpdatePanel state={updateState} onCheck={onCheckForUpdates} onInstall={onInstallUpdate} />
        </section>
      </DialogContent>
    </Dialog>
  )
}
