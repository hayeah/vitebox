import { useCallback } from "react"
import { observer } from "mobx-react-lite"
import type { Artboard, CanvasStore } from "./store"

interface Props {
  artboard: Artboard
  store: CanvasStore
}

export const ArtboardView = observer(function ArtboardView({ artboard, store }: Props) {
  const isSelected = store.selectedId === artboard.id
  const isInteractive = store.interactiveId === artboard.id

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      store.select(artboard.id)
    },
    [store, artboard.id],
  )

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      store.enterInteractive(artboard.id)
    },
    [store, artboard.id],
  )

  return (
    <div
      style={{
        position: "absolute",
        left: artboard.x,
        top: artboard.y,
        width: artboard.width,
        height: artboard.height,
      }}
    >
      {/* Label */}
      <div
        className="absolute -top-8 left-0 text-sm text-neutral-400 whitespace-nowrap select-none"
        style={{ fontSize: 14 }}
      >
        {artboard.name}{" "}
        <span className="text-neutral-500">
          {artboard.width}&times;{artboard.height}
        </span>
      </div>

      {/* Selection border */}
      <div
        className={`absolute inset-0 pointer-events-none border-2 ${
          isSelected ? "border-blue-500" : "border-transparent"
        }`}
        style={{ zIndex: 10 }}
      />

      {/* Iframe */}
      <iframe
        src={store.url}
        width={artboard.width}
        height={artboard.height}
        className="bg-white block"
        style={{
          border: "none",
          pointerEvents: isInteractive ? "auto" : "none",
        }}
        title={artboard.name}
      />

      {/* Click overlay (when not interactive) */}
      {!isInteractive && (
        <div
          className="absolute inset-0 cursor-pointer"
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        />
      )}
    </div>
  )
})
