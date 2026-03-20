import { makeAutoObservable } from "mobx"

export interface Artboard {
  id: string
  name: string
  width: number
  height: number
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

const GAP = 100

const DEFAULT_ARTBOARDS: Artboard[] = [
  { id: "mobile", name: "Mobile", width: 375, height: 812, x: 0, y: 0 },
  { id: "tablet", name: "Tablet", width: 768, height: 1024, x: 375 + GAP, y: 0 },
  { id: "desktop", name: "Desktop", width: 1440, height: 900, x: 375 + GAP + 768 + GAP, y: 0 },
]

export class CanvasStore {
  zoom = 0.5
  panX = 0
  panY = 0

  artboards: Artboard[] = DEFAULT_ARTBOARDS
  selectedId: string | null = null
  interactiveId: string | null = null

  url: string

  constructor(url: string) {
    makeAutoObservable(this)
    this.url = url
  }

  get selectedArtboard(): Artboard | null {
    if (!this.selectedId) return null
    return this.artboards.find((a) => a.id === this.selectedId) ?? null
  }

  get boundingBox(): Rect {
    if (this.artboards.length === 0) return { x: 0, y: 0, width: 0, height: 0 }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const a of this.artboards) {
      minX = Math.min(minX, a.x)
      minY = Math.min(minY, a.y)
      maxX = Math.max(maxX, a.x + a.width)
      maxY = Math.max(maxY, a.y + a.height)
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  }

  select(id: string | null) {
    this.selectedId = id
    this.interactiveId = null
  }

  enterInteractive(id: string) {
    this.selectedId = id
    this.interactiveId = id
  }

  exitInteractive() {
    this.interactiveId = null
  }

  zoomToFit(rect: Rect, viewportWidth: number, viewportHeight: number) {
    const padding = 48
    const scaleX = (viewportWidth - padding * 2) / rect.width
    const scaleY = (viewportHeight - padding * 2) / rect.height
    const zoom = Math.min(scaleX, scaleY, 2)

    const centerX = rect.x + rect.width / 2
    const centerY = rect.y + rect.height / 2

    this.zoom = zoom
    this.panX = viewportWidth / 2 - centerX * zoom
    this.panY = viewportHeight / 2 - centerY * zoom
  }

  fitAll(viewportWidth: number, viewportHeight: number) {
    this.zoomToFit(this.boundingBox, viewportWidth, viewportHeight)
  }

  fitArtboard(id: string, viewportWidth: number, viewportHeight: number) {
    const artboard = this.artboards.find((a) => a.id === id)
    if (!artboard) return
    this.zoomToFit(
      { x: artboard.x, y: artboard.y, width: artboard.width, height: artboard.height },
      viewportWidth,
      viewportHeight,
    )
  }

  // Keep for keyboard shortcut compat
  fitSelected(viewportWidth: number, viewportHeight: number) {
    if (this.selectedId) this.fitArtboard(this.selectedId, viewportWidth, viewportHeight)
  }

  zoomTo100(viewportWidth: number, viewportHeight: number, artboardId?: string) {
    const target = artboardId
      ? this.artboards.find((a) => a.id === artboardId)
      : this.selectedArtboard
    const rect = target
      ? { x: target.x, y: target.y, width: target.width, height: target.height }
      : this.boundingBox
    const centerX = rect.x + rect.width / 2
    const centerY = rect.y + rect.height / 2

    this.zoom = 1
    this.panX = viewportWidth / 2 - centerX
    this.panY = viewportHeight / 2 - centerY
  }

  addArtboard(opts: { name: string; width: number; height: number }) {
    const id = opts.name.toLowerCase().replace(/\s+/g, "-")
    // Position to the right of existing artboards
    const bb = this.boundingBox
    const x = bb.width > 0 ? bb.x + bb.width + GAP : 0
    this.artboards.push({ id, name: opts.name, width: opts.width, height: opts.height, x, y: 0 })
    return id
  }

  removeArtboard(id: string) {
    this.artboards = this.artboards.filter((a) => a.id !== id)
    if (this.selectedId === id) this.selectedId = null
    if (this.interactiveId === id) this.interactiveId = null
  }

  setURL(url: string) {
    this.url = url
  }

  zoomAtPoint(delta: number, clientX: number, clientY: number) {
    const oldZoom = this.zoom
    const factor = delta > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.05, Math.min(5, oldZoom * factor))

    // Zoom toward cursor
    const canvasX = (clientX - this.panX) / oldZoom
    const canvasY = (clientY - this.panY) / oldZoom

    this.zoom = newZoom
    this.panX = clientX - canvasX * newZoom
    this.panY = clientY - canvasY * newZoom
  }

  pan(dx: number, dy: number) {
    this.panX += dx
    this.panY += dy
  }
}
