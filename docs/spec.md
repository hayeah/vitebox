---
overview: Spec for "vitebox" — a Vite-based sandbox CLI that lets you run ad-hoc React experiments by pointing at a component file anywhere on disk, without per-project config overhead. Covers entry modes, alias resolution, canvas preview, and similar prior art.
repo: ~/github.com/hayeah/vitebox
tags:
  - spec
---

# vitebox — Vite Sandbox CLI

## Problem

Setting up a React/Vite project for one-off experiments is a lot of friction:
- `pnpm create vite`, configure TypeScript, Tailwind, aliases, ESLint…
- Every experiment needs its own `node_modules`
- No easy way to reuse a rich dependency set (shadcn, framer-motion, three.js) across experiments

You want to **vibe** — spin up a component, iterate, move on.

---

## Core Concept

`vitebox` is a CLI wrapper around Vite that:
- Uses an existing project as the **sandbox container** (its `package.json`, `vite.config`, `node_modules`)
- Lets you point at a **directory** or a **`.tsx` file** as the experiment
- Two entry modes: **raw entry** (full control) and **wrapper** (quick experiments)
- No per-experiment config

```
# Raw entry — experiment handles its own setup
vitebox dev --project ~/magicpath --entry main.tsx ~/magicpath/epub-bauhauss/src

# Wrapper — vitebox wraps a component in createRoot + StrictMode
vitebox dev --project ~/magicpath ~/experiments/quick-test
```

---

## Entry Modes

### Raw Entry Mode

When the experiment directory has `index.tsx`, or `--entry <file>` is specified, vitebox uses it as a **raw entry** — loaded directly as a `<script type="module">` in the generated HTML. No `createRoot` wrapping, no `StrictMode`, no auto-imported CSS.

The entry file handles everything: imports, CSS, rendering, setup.

Use this for:
- Existing apps with their own `main.tsx` / `index.tsx`
- Experiments that need custom setup (framer-motion config, theme providers, etc.)

```
# Directory with index.tsx — raw entry
vitebox dev --project ~/magicpath ~/experiments/full-app

# Explicit entry file
vitebox dev --project ~/magicpath --entry main.tsx ~/magicpath/stripe-blog/src
```

### Wrapper Mode

When no `index.tsx` exists and no `--entry` is specified, vitebox generates a wrapper that:
- Auto-imports `index.css` if present
- Imports the component (from `App.tsx` or passed `.tsx` file)
- Wraps it in `createRoot` + `StrictMode`

Use this for quick one-off component experiments.

```
# Wrapper mode — vitebox wraps the component
vitebox dev --project ~/magicpath ~/experiments/quick-test
vitebox dev --project ~/magicpath ~/magicpath/src/App.tsx
```

## Directory Layout

Experiments can live anywhere — inside the container, in a separate repo, wherever.

```
# Raw entry — full app
~/experiments/full-app/
  index.tsx       ← raw entry (handles its own setup)
  index.css
  helpers.ts

# Wrapper — quick component
~/experiments/quick-test/
  App.tsx          ← component with default export
  index.css        ← auto-imported by wrapper
  helpers.ts

# Existing project source
~/magicpath/stripe-blog/src/
  main.tsx         ← use with --entry main.tsx
  App.tsx
  index.css
  components/
```

---

## Sandbox Container

A **container project** provides only:
- `package.json` + `node_modules` — shared deps across all experiments (no per-experiment install)
- `vite.config.ts` — build plugins (React, Tailwind, etc.)

The project provides **no global CSS or shell** by default. Experiments are self-contained — they import what they need (Tailwind, resets, etc.) in their own `index.css`.

MagicPath Project (`/Users/me/Downloads/MagicPath Project`) is the first container. It has:
- React 19, Tailwind v4, framer-motion, three.js / @react-three/fiber
- shadcn-style component library, dnd-kit, recharts, zod, react-hook-form

---

## Path Alias Resolution (`@/`)

Dual-resolution with experiment-first priority:

- `@/foo` → check experiment's `src/foo` first (if exists)
- `@/foo` → fall back to project's `@/` alias (e.g. `<project>/src/foo`)
- `./` → relative to experiment dir (standard behavior)

This lets experiments shadow project modules with local overrides, while still importing shared components (e.g. `@/components/ui/button`, `@/lib/utils`) from the project.

---

## CLI

### `vitebox dev <path>`

- `--project <path>` (required) — container project root (must have `vite.config.ts`)
- `--entry <file>` — specify entry file name (e.g. `main.tsx`), treated as raw entry
- `--canvas` — open responsive canvas preview (mobile, tablet, desktop side by side)
- `--port <port>` — dev server port
- `--react-root <selector>` — override the mount element selector (default: `#root`)

Entry resolution:
- If `--entry` specified → raw entry mode (that file, no wrapper)
- If `<path>` is a directory with `index.tsx` → raw entry mode
- If `<path>` is a directory without `index.tsx` → wrapper mode (looks for `App.tsx`)
- If `<path>` is a `.tsx` file → wrapper mode (wraps that component)

```
# Raw entry — existing app
vitebox dev --project ~/magicpath/alice --entry main.tsx ~/magicpath/stripe-blog/src

# Raw entry — experiment with index.tsx
vitebox dev --project ~/magicpath/alice ~/experiments/full-app

# Wrapper — quick component experiment
vitebox dev --project ~/magicpath/alice ~/experiments/quick-test
vitebox dev --project ~/magicpath/alice ~/magicpath/alice/src/App.tsx

# With canvas preview
vitebox dev --project ~/magicpath/alice --canvas --entry main.tsx ~/magicpath/epub-bauhauss/src
```

### `vitebox build <path>`

Same entry resolution as `dev`. Produces static HTML + JS/CSS bundles.

- `--out-dir <path>` — output directory (default: `<experiment>/dist`)

---

## Auto-wiring Details

### Generated HTML shell

Both modes generate a minimal HTML file (not written to disk):

```html
<div id="root"></div>
<script type="module" src="..."></script>
```

The `id="root"` can be overridden with `--react-root`.

### Raw entry mode

The `<script>` points directly at the entry file. No wrapping.

```html
<script type="module" src="/path/to/experiment/main.tsx"></script>
```

### Wrapper mode (entry shim)

A virtual module wraps the component:

```tsx
import './index.css'               // if <experiment>/index.css exists
import { StrictMode, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

createRoot(document.getElementById('root')).render(
  createElement(StrictMode, null, createElement(App))
)
```

Uses `createElement` instead of JSX so the shim works in Vite build mode without JSX transform.

---

## Implementation Details

- TypeScript CLI using `cac` for arg parsing
- Core: programmatic Vite API (`createServer` for dev, `build` for static output)
- Dual-resolution `@/` alias: custom Vite resolver plugin checks experiment `src/` first, falls back to project
- Virtual module plugin: serves HTML directly from middleware, `resolveId` + `load` hooks for entry shim
- Container resolution: `--project` flag required, expects `vite.config.ts` at project root
- Node modules: symlinks project's `node_modules` into experiment dir for CSS tooling (cleaned up on exit)
- Canvas preview: pre-built React app served on a second port, iframes point at dev server

---

## Similar Tools

| Tool                  | What it does                              | Gap vs vitebox                                            |
| --------------------- | ----------------------------------------- | --------------------------------------------------------- |
| **Storybook**         | Component browser with stories            | Heavy setup, story format overhead, not "just a tsx file" |
| **Ladle**             | Faster Storybook alternative (Vite-based) | Still requires `*.stories.tsx` format                     |
| **Histoire**          | Vue-focused story tool                    | Vue-first                                                 |
| **Sandpack**          | In-browser bundler (CodeSandbox)          | Browser only, not local                                   |
| **StackBlitz**        | Online IDE                                | Online only                                               |
| **vite-plugin-pages** | File-based routing                        | Not standalone, no multi-container                        |

Closest prior art: **Ladle** — but vitebox has zero story format, zero per-experiment config, and reuses your actual project's full dep tree. Experiments can live anywhere on disk.

---

## Open Questions

- Multi-container: can you register multiple containers and switch between them per-experiment?
