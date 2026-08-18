import { useEffect, useRef } from "react"
import type { AudioLevel } from "@/shared/contracts/music"

interface AudioWaveformProps {
  level: AudioLevel
  active: boolean
}

export function AudioWaveform({ level, active }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const historyRef = useRef<number[]>(Array.from({ length: 54 }, () => 0))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context.scale(ratio, ratio)

    const history = historyRef.current
    history.push(active ? level.rms : 0)
    history.shift()
    context.clearRect(0, 0, width, height)

    const barWidth = width / history.length
    const gradient = context.createLinearGradient(0, 0, width, 0)
    gradient.addColorStop(0, "rgba(139, 231, 255, 0.34)")
    gradient.addColorStop(0.55, "rgba(154, 124, 255, 0.9)")
    gradient.addColorStop(1, "rgba(255, 128, 196, 0.46)")
    context.fillStyle = gradient

    history.forEach((value, index) => {
      const evidence = reducedMotion ? level.rms : value
      const barHeight = Math.max(2, evidence * height * 1.65)
      const x = index * barWidth
      context.roundRect(x, (height - barHeight) / 2, Math.max(1, barWidth - 2), barHeight, 2)
      context.fill()
    })
  }, [active, level])

  return (
    <canvas
      ref={canvasRef}
      className="h-12 w-full"
      role="img"
      aria-label={active ? `系统声音电平 ${Math.round(level.rms * 100)}%` : "系统声音监听未启动"}
    />
  )
}

