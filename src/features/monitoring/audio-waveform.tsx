import { useEffect, useRef } from "react"
import type { AudioLevel } from "@/shared/contracts/music"

interface AudioWaveformProps {
  level: AudioLevel
  active: boolean
}

export function AudioWaveform({ level, active }: AudioWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const historyRef = useRef<number[]>(Array.from({ length: 58 }, () => 0))
  const targetRef = useRef<AudioLevel>(level)
  const displayRef = useRef<AudioLevel>(level)

  useEffect(() => {
    targetRef.current = level
  }, [level])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return
    const drawingCanvas = canvas
    const drawingContext = context

    let animationFrame = 0
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    function resizeCanvas(width: number, height: number) {
      const ratio = window.devicePixelRatio || 1
      const nextWidth = Math.round(width * ratio)
      const nextHeight = Math.round(height * ratio)
      if (drawingCanvas.width !== nextWidth || drawingCanvas.height !== nextHeight) {
        drawingCanvas.width = nextWidth
        drawingCanvas.height = nextHeight
        drawingContext.setTransform(ratio, 0, 0, ratio, 0, 0)
      }
    }

    function draw() {
      const width = drawingCanvas.clientWidth
      const height = drawingCanvas.clientHeight
      resizeCanvas(width, height)

      const target = targetRef.current
      const current = displayRef.current
      const nextRms = current.rms + ((active ? target.rms : 0) - current.rms) * (reducedMotion ? 1 : 0.18)
      const nextPeak = current.peak + ((active ? target.peak : 0) - current.peak) * (reducedMotion ? 1 : 0.14)
      displayRef.current = { rms: nextRms, peak: nextPeak, timestampMs: target.timestampMs }

      const history = historyRef.current
      history.push(nextRms)
      history.shift()

      drawingContext.clearRect(0, 0, width, height)

      const bedGradient = drawingContext.createLinearGradient(0, 0, width, 0)
      bedGradient.addColorStop(0, "rgba(72, 224, 255, 0.12)")
      bedGradient.addColorStop(0.5, "rgba(255, 255, 255, 0.16)")
      bedGradient.addColorStop(1, "rgba(255, 194, 92, 0.12)")
      drawingContext.fillStyle = bedGradient
      drawingContext.roundRect(0, height / 2 - 1, width, 2, 999)
      drawingContext.fill()

      const barWidth = width / history.length
      const gradient = drawingContext.createLinearGradient(0, 0, width, 0)
      gradient.addColorStop(0, "rgba(92, 232, 255, 0.46)")
      gradient.addColorStop(0.52, "rgba(255, 255, 255, 0.92)")
      gradient.addColorStop(1, "rgba(255, 189, 92, 0.6)")
      drawingContext.fillStyle = gradient

      history.forEach((value, index) => {
        const barHeight = Math.max(2, value * height * 1.65)
        const x = index * barWidth
        drawingContext.roundRect(x, (height - barHeight) / 2, Math.max(1, barWidth - 2), barHeight, 999)
        drawingContext.fill()
      })

      const peakWidth = Math.max(10, width * Math.min(1, nextPeak))
      const peakGradient = drawingContext.createLinearGradient(0, 0, width, 0)
      peakGradient.addColorStop(0, "rgba(92, 232, 255, 0)")
      peakGradient.addColorStop(0.72, "rgba(92, 232, 255, 0.42)")
      peakGradient.addColorStop(1, "rgba(255, 255, 255, 0.72)")
      drawingContext.fillStyle = peakGradient
      drawingContext.roundRect((width - peakWidth) / 2, height - 5, peakWidth, 2, 999)
      drawingContext.fill()

      if (!reducedMotion) animationFrame = window.requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
    }
  }, [active])

  return (
    <canvas
      ref={canvasRef}
      className="audio-waveform"
      role="img"
      aria-label={active ? `系统声音电平 ${Math.round(level.rms * 100)}%` : "系统声音监听未启动"}
    />
  )
}
