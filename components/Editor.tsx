"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'

export type BackgroundKind = 'transparent' | 'solid' | 'gradient' | 'checker'

type EditorState = {
  canvasWidth: number
  canvasHeight: number
  backgroundKind: BackgroundKind
  backgroundColor: string
  gradientFrom: string
  gradientTo: string
  productScale: number
  productRotation: number
  productShadow: boolean
  productShadowOpacity: number
  overlayText: string
  overlayTextColor: string
  overlayTextSize: number
  overlayTextWeight: number
  overlayTextY: number
}

const defaultState: EditorState = {
  canvasWidth: 1080,
  canvasHeight: 1080,
  backgroundKind: 'solid',
  backgroundColor: '#ffffff',
  gradientFrom: '#f3f4f6',
  gradientTo: '#ffffff',
  productScale: 1,
  productRotation: 0,
  productShadow: true,
  productShadowOpacity: 0.2,
  overlayText: '',
  overlayTextColor: '#111827',
  overlayTextSize: 64,
  overlayTextWeight: 700,
  overlayTextY: 0.85,
}

function drawChecker(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const size = 32
  for (let y = 0; y < h; y += size) {
    for (let x = 0; x < w; x += size) {
      const odd = ((x / size) + (y / size)) % 2 === 1
      ctx.fillStyle = odd ? '#e5e7eb' : '#f3f4f6'
      ctx.fillRect(x, y, size, size)
    }
  }
}

export function Editor({ imageUrl }: { imageUrl: string | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [state, setState] = useState<EditorState>(defaultState)

  useEffect(() => {
    if (!imageUrl) { setImg(null); return }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => setImg(image)
    image.src = imageUrl
  }, [imageUrl])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    const image = img
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const { canvasWidth: W, canvasHeight: H } = state
    canvas.width = W
    canvas.height = H

    // background
    if (state.backgroundKind === 'transparent') {
      drawChecker(ctx, W, H)
    } else if (state.backgroundKind === 'solid') {
      ctx.fillStyle = state.backgroundColor
      ctx.fillRect(0, 0, W, H)
    } else if (state.backgroundKind === 'gradient') {
      const g = ctx.createLinearGradient(0, 0, W, H)
      g.addColorStop(0, state.gradientFrom)
      g.addColorStop(1, state.gradientTo)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    } else if (state.backgroundKind === 'checker') {
      drawChecker(ctx, W, H)
    }

    // product
    if (image) {
      const maxW = W * 0.8
      const maxH = H * 0.7
      const scale = Math.min(maxW / image.width, maxH / image.height) * state.productScale
      const drawW = image.width * scale
      const drawH = image.height * scale
      const cx = W / 2
      const cy = H * 0.55

      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate((state.productRotation * Math.PI) / 180)

      if (state.productShadow) {
        ctx.save()
        ctx.scale(1, 0.15)
        ctx.fillStyle = `rgba(0,0,0,${state.productShadowOpacity})`
        ctx.beginPath()
        ctx.ellipse(0, drawH / 2, drawW * 0.35, drawH * 0.18, 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      ctx.drawImage(image, -drawW / 2, -drawH / 2, drawW, drawH)
      ctx.restore()
    }

    // text overlay
    if (state.overlayText.trim().length > 0) {
      ctx.fillStyle = state.overlayTextColor
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.font = `${state.overlayTextWeight} ${state.overlayTextSize}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`
      ctx.fillText(state.overlayText, W / 2, H * state.overlayTextY)
    }
  }, [img, state])

  useEffect(() => { render() }, [render])

  // Expose simple event bus via window for the side panel
  useEffect(() => {
    ;(window as any).__editorSetState = (partial: Partial<EditorState>) => {
      setState((s) => ({ ...s, ...partial }))
    }
    ;(window as any).__editorGetState = () => state
    ;(window as any).__editorExport = async (scale: number = 1) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const off = document.createElement('canvas')
      off.width = Math.round(state.canvasWidth * scale)
      off.height = Math.round(state.canvasHeight * scale)
      const ctx = off.getContext('2d')!

      // Temporarily render at higher scale
      const prev = state
      const temp: EditorState = { ...state, canvasWidth: off.width, canvasHeight: off.height }
      setState(temp)
      await new Promise((r) => requestAnimationFrame(r))
      const src = canvas.toDataURL('image/png')
      // restore
      setState(prev)
      await new Promise((r) => requestAnimationFrame(r))

      // Draw to offscreen to ensure exact dimensions
      const img2 = new Image()
      await new Promise<void>((resolve) => {
        img2.onload = () => resolve()
        img2.src = src
      })
      ctx.drawImage(img2, 0, 0, off.width, off.height)
      return off.toDataURL('image/png')
    }
  }, [state])

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} className="max-w-full h-auto shadow-sm rounded-md bg-white" />
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-medium text-gray-600">{children}</div>
}

function Slider({ value, min, max, step, onChange }: { value: number, min: number, max: number, step?: number, onChange: (n: number) => void }) {
  return (
    <input
      type="range"
      className="w-full"
      min={min}
      max={max}
      step={step ?? 1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  )
}

Editor.Panel = function Panel() {
  const call = (partial: Partial<EditorState>) => (window as any).__editorSetState?.(partial)
  const get = () => (window as any).__editorGetState?.() as EditorState

  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 400)
    return () => clearInterval(id)
  }, [])
  const s = get() ?? defaultState

  const exportPng = async (scale: number) => {
    const dataUrl = await (window as any).__editorExport?.(scale)
    if (!dataUrl) return

    // Try Web Share API
    try {
      const res = await fetch(dataUrl)
      const blob = await res.blob()
      const file = new File([blob], `product-design-${Date.now()}.png`, { type: 'image/png' })
      // @ts-expect-error web share
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        // @ts-expect-error
        await navigator.share({ files: [file], title: 'Product Pic', text: 'Made with Product Pic Designer' })
        return
      }
    } catch {}

    // Fallback: download
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'product-pic.png'
    a.click()
  }

  const copyToClipboard = async () => {
    const dataUrl = await (window as any).__editorExport?.(1)
    if (!dataUrl) return
    const blob = await (await fetch(dataUrl)).blob()
    try {
      await navigator.clipboard.write([
        new window.ClipboardItem({ 'image/png': blob }) as any
      ])
      alert('Copied image to clipboard!')
    } catch {
      alert('Clipboard copy not supported in this browser.')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <Label>Canvas size</Label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <input className="border rounded px-2 py-1 text-sm" type="number" value={s.canvasWidth} onChange={(e) => call({ canvasWidth: Number(e.target.value) })} />
          <input className="border rounded px-2 py-1 text-sm" type="number" value={s.canvasHeight} onChange={(e) => call({ canvasHeight: Number(e.target.value) })} />
          <button className="col-span-2 text-xs text-gray-600 underline" onClick={() => call({ canvasWidth: 1080, canvasHeight: 1080 })}>Square 1080?1080</button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Background</Label>
        <div className="flex gap-2">
          {(['solid','gradient','transparent','checker'] as BackgroundKind[]).map((k) => (
            <button key={k} onClick={() => call({ backgroundKind: k })} className={classNames('px-2 py-1 rounded border text-xs', s.backgroundKind===k ? 'border-brand-600 text-brand-700' : 'border-gray-300 text-gray-700')}>{k}</button>
          ))}
        </div>
        {s.backgroundKind === 'solid' && (
          <input type="color" className="w-full h-8" value={s.backgroundColor} onChange={(e) => call({ backgroundColor: e.target.value })} />
        )}
        {s.backgroundKind === 'gradient' && (
          <div className="grid grid-cols-2 gap-2">
            <input type="color" className="w-full h-8" value={s.gradientFrom} onChange={(e) => call({ gradientFrom: e.target.value })} />
            <input type="color" className="w-full h-8" value={s.gradientTo} onChange={(e) => call({ gradientTo: e.target.value })} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Product</Label>
        <div className="space-y-1">
          <div className="text-xs text-gray-600">Scale</div>
          <Slider value={s.productScale} min={0.3} max={2} step={0.01} onChange={(v) => call({ productScale: v })} />
        </div>
        <div className="space-y-1">
          <div className="text-xs text-gray-600">Rotation</div>
          <Slider value={s.productRotation} min={-25} max={25} step={1} onChange={(v) => call({ productRotation: v })} />
        </div>
        <div className="flex items-center gap-2">
          <input id="shadow" type="checkbox" checked={s.productShadow} onChange={(e) => call({ productShadow: e.target.checked })} />
          <label htmlFor="shadow" className="text-sm">Shadow</label>
        </div>
        {s.productShadow && (
          <div className="space-y-1">
            <div className="text-xs text-gray-600">Shadow strength</div>
            <Slider value={s.productShadowOpacity} min={0} max={0.6} step={0.01} onChange={(v) => call({ productShadowOpacity: v })} />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Text overlay</Label>
        <input className="border rounded px-2 py-1 text-sm w-full" placeholder="Add a catchy title" value={s.overlayText} onChange={(e) => call({ overlayText: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input type="color" className="h-8 w-full" value={s.overlayTextColor} onChange={(e) => call({ overlayTextColor: e.target.value })} />
          <input type="number" className="border rounded px-2 py-1 text-sm" value={s.overlayTextSize} onChange={(e) => call({ overlayTextSize: Number(e.target.value) })} />
          <div className="col-span-2">
            <div className="text-xs text-gray-600">Vertical position</div>
            <Slider value={s.overlayTextY} min={0.1} max={0.95} step={0.01} onChange={(v) => call({ overlayTextY: v })} />
          </div>
        </div>
      </div>

      <div className="pt-2 border-t">
        <Label>Export</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <button className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200" onClick={() => exportPng(1)}>PNG 1x</button>
          <button className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200" onClick={() => exportPng(2)}>PNG 2x</button>
          <button className="px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200" onClick={copyToClipboard}>Copy</button>
        </div>
      </div>

      <div className="bg-gray-50 border rounded p-3 text-xs text-gray-600">
        Tip: For clean background, choose Solid and pick brand color; add subtle shadow for depth.
      </div>
    </div>
  )
}
