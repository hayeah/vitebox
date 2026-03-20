---
overview: Spec for "vitebox" — a Vite-based sandbox CLI that lets you run ad-hoc React experiments by pointing at a component file anywhere on disk, without per-project config overhead. Covers alias resolution, canvas preview, and similar prior art.
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
- Lets you point at a **directory** or a **`.tsx` file** as the entry
- The entry file handles everything — imports, CSS, rendering, setup
- Vitebox just provides the HTML shell, shared deps, and dev server

```
vitebox dev --project ~/magicpath/alice ~/magicpath/stripe-blog/src/main.tsx
vitebox dev --project ~/magicpath/alice ~/experiments/my-app
```

---

## Entry Resolution

- `<path>` is a directory → loads `<path>/index.tsx`
- `<path>` is a `.tsx` file → loads that file directly

The entry must handle its own rendering (`createRoot`, CSS imports, etc.). Vitebox does not wrap or auto-import anything — it just generates an HTML shell with `<div id="root">` and a `<script type="module">` pointing at the entry.

## Directory Layout

Experiments can live anywhere — inside the container, in a separate repo, wherever.

```
~/experiments/my-app/
  index.tsx       ← entry (handles its own createRoot, CSS imports, etc.)
  index.css
  helpers.ts

~/magicpath/stripe-blog/src/
  main.tsx         ← point at this file directly
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
- `--canvas` — open responsive canvas preview (mobile, tablet, desktop side by side)
- `--port <port>` — dev server port
- `--react-root <selector>` — override the mount element selector (default: `#root`)

```
vitebox dev --project ~/magicpath/alice ~/magicpath/stripe-blog/src/main.tsx
vitebox dev --project ~/magicpath/alice ~/experiments/my-app
vitebox dev --project ~/magicpath/alice --canvas ~/magicpath/epub-bauhauss/src/main.tsx
```

### `vitebox build <path>`

Same entry resolution as `dev`. Produces static HTML + JS/CSS bundles.

- `--out-dir <path>` — output directory (default: `<experiment>/dist`)

---

## Generated HTML

Vitebox generates a minimal HTML shell (served from middleware, not written to disk):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>vitebox</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/path/to/entry.tsx"></script>
</body>
</html>
```

The `id="root"` can be overridden with `--react-root`. The entry file is responsible for calling `createRoot`, importing CSS, and rendering.

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
