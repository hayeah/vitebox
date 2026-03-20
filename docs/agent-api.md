---
overview: Design for vitebox canvas agent API (window.__vitebox) and a SKILL.md that teaches AI agents to interact with the responsive preview canvas programmatically via browser eval.
repo: ~/github.com/hayeah/vitebox
tags:
  - design
---

# vitebox Canvas Agent API

## Goal

Let AI agents programmatically control the canvas preview — select viewports, zoom, take screenshots — via `browser eval` against `window.__vitebox`. Write a SKILL.md so agents know how.

## API Surface (`window.__vitebox`)

All methods are stateless — actions that target an artboard take the artboard id as a parameter. No hidden selection state to track.

### Read State

```js
__vitebox.state()
// => { zoom: 0.65, panX: 48, panY: 122, url: "http://localhost:5199",
//      artboards: [{ id: "mobile", name: "Mobile", width: 375, height: 812, x: 0, y: 0 }, ...] }
```

Single call to get everything an agent needs. Returns plain serializable JSON.

### Navigation

```js
__vitebox.fitAll()             // zoom to fit all artboards
__vitebox.fit("mobile")        // zoom to fit specific artboard
__vitebox.zoomTo100()          // zoom to 100%, centered on all
__vitebox.zoomTo100("mobile")  // zoom to 100%, centered on specific artboard
```

### Artboard Management

```js
__vitebox.addArtboard({ name: "Narrow", width: 320, height: 568 })
__vitebox.removeArtboard("narrow")
```

### URL

```js
__vitebox.setURL("http://localhost:3000")  // reload all iframes
```

## SKILL.md Shape

The skill tells agents:

- vitebox canvas is a multi-viewport preview tool
- The canvas is controlled via `browser eval -s <session> '<js>'`
- Here are the `__vitebox.*` methods and what they return
- Common workflows:
  - "Screenshot all viewports": fitAll, then `browser screenshot`
  - "Screenshot mobile only": fit("mobile"), then `browser screenshot`
  - "Check responsive layout": state() to read artboard list, then fit each + screenshot
  - "Add a custom breakpoint": addArtboard, fitAll

## Implementation Notes

- All methods are stateless — no hidden selection state for agents to manage
- `state()` returns a plain object (not the MobX store) — safe for JSON serialization
- `addArtboard` auto-generates `id` from lowercase name, auto-positions to the right of existing artboards
- `setURL` updates `store.url` which triggers iframe re-render (MobX observer)
- All methods return the result synchronously (no promises needed)
- The skill itself doesn't start the server — it assumes `vitebox dev --canvas` is already running and a browser session is open
- Visual selection (blue border on click) still exists for human use, but the API doesn't depend on it
