---
name: vitebox
description: Vite sandbox CLI — run ad-hoc React experiments using a shared container project's deps and config, no per-experiment setup.
---

# vitebox

A CLI wrapper around Vite that lets you run React experiments by pointing at a component file or directory — reusing an existing project's `node_modules`, `vite.config.ts`, and plugins. No per-experiment setup.

## Install

```bash
pnpm install
pnpm build
```

## Usage

```bash
# Point at a directory (loads index.tsx)
vitebox dev --project ~/magicpath ~/experiments/my-experiment

# Point at a specific .tsx file
vitebox dev --project ~/magicpath ~/magicpath/src/App.tsx

# Specify a port
vitebox dev --project ~/magicpath --port 3000 ~/experiments/my-experiment
```

### Options

- `--project <path>` (required) — Path to the container project. Must have a `vite.config.ts` at root.
- `--port <port>` — Dev server port. Auto-selects if not specified.

## Concepts

### Container Project

The `--project` path provides:

- `package.json` + `node_modules` — shared deps
- `vite.config.ts` — build plugins (React, Tailwind, etc.)
- Path aliases (e.g. `@/` → `src/`) — inherited by experiments

The project provides no global CSS or shell by default. Experiments are self-contained.

### Experiment

An experiment is a directory with:

- `index.tsx` — entry component (default export, rendered into `<StrictMode>`)
- `index.css` — optional, auto-imported if present

Or a single `.tsx` file (e.g. `App.tsx`). When given a file, `index.css` in the same directory is still auto-imported.

```
~/experiments/
  my-experiment/
    index.tsx       # entry component
    index.css       # auto-imported (e.g. @import "tailwindcss")
    helpers.ts      # local modules via relative imports
```

### Alias Resolution

Experiments inherit whatever `@/` alias the project's `vite.config.ts` defines. Local files use relative imports (`./helpers`).

## How It Works

- Uses Vite's programmatic API (`createServer`) with `configFile` pointing to the project's config
- A virtual module plugin generates an entry shim at serve time (not written to disk)
- The shim imports the experiment's component, optional CSS, and renders into `<div id="root">`
- A virtual `index.html` is served with a script tag pointing to the virtual entry

### Generated Entry Shim

```tsx
import "/path/to/experiment/index.css"  // if exists
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "/path/to/experiment/index.tsx"

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
)
```

## Examples

```bash
# Quick experiment with Tailwind — just create index.tsx and index.css
mkdir ~/experiments/button-test
echo 'export default () => <button className="px-4 py-2 bg-blue-500 text-white rounded">Click</button>' > ~/experiments/button-test/index.tsx
echo '@import "tailwindcss";' > ~/experiments/button-test/index.css
vitebox dev --project ~/magicpath ~/experiments/button-test

# Render an existing component from the project
vitebox dev --project ~/magicpath ~/magicpath/src/App.tsx

# Iterate on a component in isolation
vitebox dev --project ~/magicpath ~/experiments/new-sidebar
```

## Architecture

```
src/
  cli.ts      # CLI entry (cac-based), parses args, calls startDev()
  dev.ts      # Resolves entry (file or dir), creates Vite server
  plugin.ts   # Vite plugin: virtual HTML + virtual entry shim
```

## Spec

See [docs/spec.md](docs/spec.md) for the full design spec.
