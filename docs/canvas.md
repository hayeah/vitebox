---
overview: Detailed design for a responsive preview app — renders a URL in multiple iframe viewports on a Figma-style infinite canvas with zoom, pan, selection, and keyboard shortcuts. React + MobX + Tailwind.
repo: ~/github.com/hayeah/vitebox
tags:
  - design
---

# Responsive Artboard Canvas

## Concept

A React app that renders the same page in multiple iframes at different viewport sizes, laid out like Figma artboards on an infinite zoomable/pannable canvas. Figma-style keybindings for navigation.

## Stack

- **React** — UI
- **MobX** — canvas state (zoom, pan, selection, artboard list). Observable state is natural for a canvas — many things react to zoom/pan changes
- **Tailwind CSS v4** — styling
- **@use-gesture/react** — unified gesture handling (wheel zoom, drag pan, pinch zoom on trackpad)
- **framer-motion** — smooth animated transitions for zoom-to-fit, pan-to-center

Could build as a vitebox experiment itself, using the `web/` workspace as container (already has React, MobX, Tailwind, framer-motion).

## Canvas Model (MobX store)

```ts
class CanvasStore {
  // Viewport transform
  zoom = 1
  panX = 0
  panY = 0

  // Artboards
  artboards: Artboard[] = [
    { id: "mobile",  name: "Mobile",  width: 375,  height: 812,  x: 0,    y: 0 },
    { id: "tablet",  name: "Tablet",  width: 768,  height: 1024, x: 475,  y: 0 },
    { id: "desktop", name: "Desktop", width: 1440, height: 900,  x: 1343, y: 0 },
  ]

  // Selection
  selectedId: string | null = null

  // Target URL
  url = "http://localhost:5173"

  // Computed: bounding box of all artboards
  get boundingBox(): Rect { ... }

  // Computed: bounding box of selected artboard
  get selectedBounds(): Rect | null { ... }

  // Actions
  zoomToFit(rect: Rect, animate?: boolean) { ... }
  zoomTo100() { ... }
  select(id: string | null) { ... }
}
```

## Rendering

```
┌─ viewport (browser window, overflow hidden) ──────────────┐
│                                                            │
│  ┌─ canvas (transform: translate + scale) ──────────────┐  │
│  │                                                      │  │
│  │  ┌─ Mobile ──┐  ┌── Tablet ────┐  ┌── Desktop ─────┐│  │
│  │  │ label     │  │ label        │  │ label           ││  │
│  │  │┌─────────┐│  │┌────────────┐│  │┌───────────────┐││  │
│  │  ││ iframe  ││  ││ iframe     ││  ││ iframe        │││  │
│  │  ││ 375x812 ││  ││ 768x1024   ││  ││ 1440x900     │││  │
│  │  │└─────────┘│  │└────────────┘│  │└───────────────┘││  │
│  │  └───────────┘  └──────────────┘  └─────────────────┘│  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

- Viewport: fixed, fills browser window
- Canvas: absolutely positioned, transformed by `translate(panX, panY) scale(zoom)`
- Artboards: positioned absolutely within the canvas at real pixel coordinates
- Iframes: rendered at real device size — media queries fire correctly
- Labels: positioned above each artboard, showing name + dimensions
- Selected artboard: blue outline or highlight

### Pointer Events on Iframes

Iframes eat pointer events. Two approaches:
- **Overlay**: transparent div on top of each iframe, captures clicks for selection. Remove overlay on double-click to interact with the iframe content
- **pointer-events: none** on iframes by default, toggle on when user wants to interact (e.g. hold a key or double-click)

Recommend: overlay approach. Click to select, double-click to interact. Esc to deselect and return to canvas mode.

## Figma Keybindings

| Key | Action |
|---|---|
| `Cmd+0` | Zoom to 100% (centered on selection or viewport center) |
| `Cmd+1` | Fit all artboards in viewport |
| `Cmd+2` | Fit selected artboard in viewport |
| `Cmd++` / `Cmd+=` | Zoom in |
| `Cmd+-` | Zoom out |
| `Space+drag` | Pan (hand tool) |
| `Scroll` | Vertical pan |
| `Shift+Scroll` | Horizontal pan |
| `Cmd+Scroll` / pinch | Zoom (toward cursor) |
| `Click` artboard | Select |
| `Double-click` artboard | Enter interactive mode (pointer events pass to iframe) |
| `Esc` | Deselect / exit interactive mode |
| `1` / `2` / `3` | Quick-select artboard by index |

## Zoom Behavior

- Zoom toward cursor position (not viewport center) — standard for canvas tools
- Zoom levels snap to: 10%, 25%, 50%, 75%, 100%, 150%, 200% (optional)
- Smooth animated transitions for keyboard zoom (Cmd+1, Cmd+2) via framer-motion
- Wheel zoom is immediate (no animation), follows cursor

### Zoom-to-fit Algorithm

```
Given a bounding rect and the viewport size:
- Calculate scale to fit rect in viewport with padding (e.g. 48px)
- Calculate pan to center rect in viewport
- Animate to new zoom + pan
```

## Component Structure

```
App
├── CanvasViewport          # overflow:hidden, captures gestures
│   └── CanvasTransform     # transform: translate + scale
│       └── Artboard[]      # absolutely positioned
│           ├── ArtboardLabel
│           ├── ArtboardFrame (iframe)
│           └── ArtboardOverlay (click target)
├── Toolbar                 # zoom controls, URL input
└── StatusBar               # current zoom %, coordinates
```

## Default Breakpoints

| Name | Width | Height | Notes |
|---|---|---|---|
| Mobile | 375 | 812 | iPhone 15 |
| Tablet | 768 | 1024 | iPad |
| Desktop | 1440 | 900 | Standard laptop |

Artboards laid out horizontally with 100px gap between them.

## Stretch Goals

- **Scroll sync**: scroll one iframe, others follow (postMessage between frames)
- **Add/remove artboards**: custom sizes, reorder
- **URL bar**: type a URL, all artboards navigate
- **Snapshot**: screenshot all artboards as one image
- **Breakpoint ruler**: visual ruler showing where breakpoints fall
- **Dark canvas background**: like Figma's gray canvas

## Integration with vitebox

```bash
vitebox preview --project ~/magicpath ~/experiments/my-experiment
```

- Starts dev server on random port
- Starts the artboard canvas app on another port
- Injects the dev server URL into the canvas app
- HMR works — edits update all viewports simultaneously
