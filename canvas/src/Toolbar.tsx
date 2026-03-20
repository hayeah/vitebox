import { useCallback, useRef } from "react"
import { observer } from "mobx-react-lite"
import type { CanvasStore } from "./store"

interface Props {
  store: CanvasStore
}

export const Toolbar = observer(function Toolbar({ store }: Props) {
  const zoomPercent = Math.round(store.zoom * 100)
  const containerRef = useRef<HTMLDivElement>(null)

  const getViewport = useCallback(() => {
    const el = containerRef.current?.parentElement?.querySelector("[class*='flex-1']")
    if (!el) return { width: window.innerWidth, height: window.innerHeight - 40 }
    return { width: el.clientWidth, height: el.clientHeight }
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-10 bg-neutral-800 border-b border-neutral-700 flex items-center px-4 gap-4 text-sm text-neutral-300"
    >
      <span className="font-medium text-neutral-100">vitebox</span>
      <span className="text-neutral-500">|</span>

      <span className="text-neutral-400 truncate max-w-80">{store.url}</span>

      <div className="ml-auto flex items-center gap-2">
        <button
          className="px-2 py-0.5 rounded hover:bg-neutral-700 transition-colors"
          onClick={() => {
            const vp = getViewport()
            store.fitAll(vp.width, vp.height)
          }}
          title="Fit all (Cmd+1)"
        >
          Fit
        </button>

        <button
          className="px-2 py-0.5 rounded hover:bg-neutral-700 transition-colors"
          onClick={() => {
            const vp = getViewport()
            store.zoomTo100(vp.width, vp.height)
          }}
          title="Zoom to 100% (Cmd+0)"
        >
          100%
        </button>

        <span className="text-neutral-400 tabular-nums w-12 text-right">{zoomPercent}%</span>
      </div>
    </div>
  )
})
