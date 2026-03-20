import { forwardRef, useCallback, useRef, useImperativeHandle } from "react"
import { observer } from "mobx-react-lite"
import { CanvasStore } from "./store"
import { ArtboardView } from "./ArtboardView"

interface Props {
  store: CanvasStore
}

export const CanvasViewport = observer(
  forwardRef<HTMLDivElement, Props>(function CanvasViewport({ store }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    useImperativeHandle(ref, () => containerRef.current!)

    const isPanning = useRef(false)
    const lastPointer = useRef({ x: 0, y: 0 })
    const spaceHeld = useRef(false)

    // Track space key for hand tool
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
      if (e.key === " " && !e.repeat) {
        spaceHeld.current = true
      }
    }, [])

    const handleKeyUp = useCallback((e: KeyboardEvent) => {
      if (e.key === " ") {
        spaceHeld.current = false
      }
    }, [])

    // Attach key listeners
    const attachedRef = useRef(false)
    if (!attachedRef.current) {
      window.addEventListener("keydown", handleKeyDown)
      window.addEventListener("keyup", handleKeyUp)
      attachedRef.current = true
    }

    const handleWheel = useCallback(
      (e: React.WheelEvent) => {
        e.preventDefault()
        if (e.metaKey || e.ctrlKey) {
          // Zoom toward cursor
          store.zoomAtPoint(e.deltaY, e.clientX, e.clientY)
        } else if (e.shiftKey) {
          // Horizontal pan
          store.pan(-e.deltaY, 0)
        } else {
          // Vertical pan
          store.pan(-e.deltaX, -e.deltaY)
        }
      },
      [store],
    )

    const handlePointerDown = useCallback(
      (e: React.PointerEvent) => {
        // Middle mouse or space+left click = pan
        if (e.button === 1 || (e.button === 0 && spaceHeld.current)) {
          isPanning.current = true
          lastPointer.current = { x: e.clientX, y: e.clientY }
          ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
          e.preventDefault()
          return
        }

        // Left click on background = deselect
        if (e.button === 0 && e.target === containerRef.current) {
          store.select(null)
        }
      },
      [store],
    )

    const handlePointerMove = useCallback(
      (e: React.PointerEvent) => {
        if (!isPanning.current) return
        const dx = e.clientX - lastPointer.current.x
        const dy = e.clientY - lastPointer.current.y
        lastPointer.current = { x: e.clientX, y: e.clientY }
        store.pan(dx, dy)
      },
      [store],
    )

    const handlePointerUp = useCallback(() => {
      isPanning.current = false
    }, [])

    return (
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden cursor-default"
        style={{ cursor: spaceHeld.current ? "grab" : undefined }}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          style={{
            transform: `translate(${store.panX}px, ${store.panY}px) scale(${store.zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
          }}
        >
          {store.artboards.map((artboard) => (
            <ArtboardView key={artboard.id} artboard={artboard} store={store} />
          ))}
        </div>
      </div>
    )
  }),
)
