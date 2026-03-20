---
name: vitebox-canvas
description: Control vitebox responsive canvas preview programmatically — zoom, fit artboards, take screenshots at different breakpoints. Use when testing responsive layouts or capturing multi-viewport screenshots.
---

# vitebox Canvas

Responsive preview canvas for vitebox. Shows iframes at mobile, tablet, and desktop sizes on a zoomable canvas. Control it programmatically via `browser eval` and `window.__vitebox`.

## Prerequisites

The canvas must be running — start with:

```bash
vitebox dev --project <path> --canvas <experiment>
```

This prints two URLs:
- Dev server (the experiment)
- Canvas server (the multi-viewport preview)

Open a browser session on the canvas URL:

```bash
browser open <canvas-url>
# prints session key, e.g. a3f2
```

## API Reference

All methods are on `window.__vitebox`. Call via `browser eval -s <session>`.

### `__vitebox.state()`

Returns current canvas state as plain JSON.

```bash
browser eval -s a3f2 'JSON.stringify(__vitebox.state())'
```

```json
{
  "zoom": 0.65,
  "panX": 48,
  "panY": 122,
  "url": "http://localhost:5199",
  "artboards": [
    { "id": "mobile", "name": "Mobile", "width": 375, "height": 812, "x": 0, "y": 0 },
    { "id": "tablet", "name": "Tablet", "width": 768, "height": 1024, "x": 475, "y": 0 },
    { "id": "desktop", "name": "Desktop", "width": 1440, "height": 900, "x": 1343, "y": 0 }
  ]
}
```

### `__vitebox.fitAll()`

Zoom to fit all artboards in the viewport.

```bash
browser eval -s a3f2 '__vitebox.fitAll()'
```

### `__vitebox.fit(artboardId)`

Zoom to fit a specific artboard.

```bash
# Zoom to show only the mobile artboard
browser eval -s a3f2 '__vitebox.fit("mobile")'
```

### `__vitebox.zoomTo100(artboardId?)`

Zoom to 100%, centered on a specific artboard (or center of all if omitted).

```bash
browser eval -s a3f2 '__vitebox.zoomTo100("desktop")'
```

### `__vitebox.addArtboard({ name, width, height })`

Add a custom artboard. Returns the generated id.

```bash
browser eval -s a3f2 '__vitebox.addArtboard({ name: "Narrow", width: 320, height: 568 })'
# => "narrow"
```

### `__vitebox.removeArtboard(id)`

Remove an artboard by id.

```bash
browser eval -s a3f2 '__vitebox.removeArtboard("narrow")'
```

### `__vitebox.setURL(url)`

Change the URL loaded in all iframes.

```bash
browser eval -s a3f2 '__vitebox.setURL("http://localhost:3000")'
```

## Common Workflows

### Screenshot all viewports at once

```bash
browser eval -s a3f2 '__vitebox.fitAll()'
browser screenshot -s a3f2 -o all-viewports.png
```

### Screenshot a single viewport

```bash
# Focus on mobile, then screenshot
browser eval -s a3f2 '__vitebox.fit("mobile")'
browser screenshot -s a3f2 -o mobile.png
```

### Screenshot each viewport separately

```bash
for id in mobile tablet desktop; do
  browser eval -s a3f2 "__vitebox.fit('$id')"
  browser screenshot -s a3f2 -o "$id.png"
done
```

### Add a custom breakpoint and screenshot it

```bash
browser eval -s a3f2 '__vitebox.addArtboard({ name: "4K", width: 2560, height: 1440 })'
browser eval -s a3f2 '__vitebox.fit("4k")'
browser screenshot -s a3f2 -o 4k.png
```

## Default Artboards

| ID | Name | Size |
|---|---|---|
| `mobile` | Mobile | 375 x 812 |
| `tablet` | Tablet | 768 x 1024 |
| `desktop` | Desktop | 1440 x 900 |
