import { useEffect, useMemo, useRef } from "react"
import { observer } from "mobx-react-lite"
import { CanvasStore } from "./store"
import { CanvasViewport } from "./CanvasViewport"
import { Toolbar } from "./Toolbar"

function getTargetURL(): string {
  // Injected by vitebox canvas server, or passed as query param for dev
  const injected = (window as any).__VITEBOX_URL__
  if (injected) return injected
  const params = new URLSearchParams(window.location.search)
  return params.get("url") ?? "http://localhost:5173"
}

export const App = observer(function App() {
  const store = useMemo(() => new CanvasStore(getTargetURL()), [])
  const viewportRef = useRef<HTMLDivElement>(null)

  // Fit all on initial load
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    store.fitAll(el.clientWidth, el.clientHeight)
  }, [store])

  // Keyboard shortcuts
  useEffect(() => {
    function getViewport() {
      const el = viewportRef.current
      if (!el) return null
      return { width: el.clientWidth, height: el.clientHeight }
    }

    function handleKeyDown(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey

      // Cmd+0 — zoom to 100%
      if (meta && e.key === "0") {
        e.preventDefault()
        const vp = getViewport()
        if (vp) store.zoomTo100(vp.width, vp.height)
        return
      }

      // Cmd+1 — fit all
      if (meta && e.key === "1") {
        e.preventDefault()
        const vp = getViewport()
        if (vp) store.fitAll(vp.width, vp.height)
        return
      }

      // Cmd+2 — fit selected
      if (meta && e.key === "2") {
        e.preventDefault()
        const vp = getViewport()
        if (vp) store.fitSelected(vp.width, vp.height)
        return
      }

      // Cmd+= / Cmd++ — zoom in
      if (meta && (e.key === "=" || e.key === "+")) {
        e.preventDefault()
        const vp = getViewport()
        if (vp) store.zoomAtPoint(-1, vp.width / 2, vp.height / 2)
        return
      }

      // Cmd+- — zoom out
      if (meta && e.key === "-") {
        e.preventDefault()
        const vp = getViewport()
        if (vp) store.zoomAtPoint(1, vp.width / 2, vp.height / 2)
        return
      }

      // Escape — deselect / exit interactive
      if (e.key === "Escape") {
        if (store.interactiveId) {
          store.exitInteractive()
        } else {
          store.select(null)
        }
        return
      }

      // 1/2/3 — quick select artboard
      const idx = parseInt(e.key) - 1
      if (!meta && idx >= 0 && idx < store.artboards.length) {
        store.select(store.artboards[idx].id)
        return
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [store])

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-900">
      <Toolbar store={store} />
      <CanvasViewport ref={viewportRef} store={store} />
    </div>
  )
})
