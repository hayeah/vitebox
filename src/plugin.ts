import fs from "fs"
import path from "path"
import type { Plugin } from "vite"

const VIRTUAL_ENTRY_ID = "virtual:vitebox-entry"
const RESOLVED_VIRTUAL_ENTRY_ID = "\0" + VIRTUAL_ENTRY_ID

const VIRTUAL_HTML_ID = "vitebox-index.html"

const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ""]

export interface ViteboxPluginOptions {
  entryFile: string
  experimentDir: string
  projectRoot: string
  hasCss: boolean
}

function tryResolve(base: string, rest: string): string | undefined {
  // Try as directory with index
  for (const ext of EXTENSIONS) {
    const asIndex = path.join(base, rest, `index${ext}`)
    if (fs.existsSync(asIndex)) return asIndex
  }
  // Try as file
  for (const ext of EXTENSIONS) {
    const asFile = path.join(base, rest + ext)
    if (fs.existsSync(asFile)) return asFile
  }
  return undefined
}

export function viteboxPlugin(options: ViteboxPluginOptions): Plugin[] {
  const { entryFile, experimentDir, projectRoot, hasCss } = options

  // Dual-resolution @/ alias: experiment src first, project src fallback
  const aliasPlugin: Plugin = {
    name: "vitebox-alias",
    enforce: "pre",

    resolveId(id) {
      if (!id.startsWith("@/")) return
      const rest = id.slice(2) // strip "@/"

      // 1. Check experiment's src/ directory
      const experimentSrc = path.join(experimentDir, "src")
      const fromExperiment = tryResolve(experimentSrc, rest)
      if (fromExperiment) return fromExperiment

      // 2. Check experiment root (for non-src layouts)
      const fromExperimentRoot = tryResolve(experimentDir, rest)
      if (fromExperimentRoot) return fromExperimentRoot

      // 3. Fall through — let the project's own @/ alias handle it
      return undefined
    },
  }

  const mainPlugin: Plugin = {
    name: "vitebox",
    enforce: "pre",

    configureServer(server) {
      // Intercept / and /index.html BEFORE Vite serves the project's real index.html.
      // Serve our virtual HTML directly with Vite's transform pipeline applied.
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== "/" && req.url !== "/index.html") return next()

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>vitebox</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/${VIRTUAL_ENTRY_ID}"></script>
</body>
</html>`

        const transformed = await server.transformIndexHtml(req.url!, html)
        res.setHeader("Content-Type", "text/html")
        res.end(transformed)
      })
    },

    resolveId(id) {
      if (id === VIRTUAL_ENTRY_ID || id === `/${VIRTUAL_ENTRY_ID}`) {
        return RESOLVED_VIRTUAL_ENTRY_ID
      }
    },

    load(id) {
      if (id === RESOLVED_VIRTUAL_ENTRY_ID) {
        return generateEntryShim(entryFile, experimentDir, hasCss)
      }
    },
  }

  return [aliasPlugin, mainPlugin]
}

function generateEntryShim(entryFile: string, experimentDir: string, hasCss: boolean): string {
  const cssPath = path.join(experimentDir, "index.css")

  const lines: string[] = []

  if (hasCss) {
    lines.push(`import "${cssPath}"`)
  }

  lines.push(`import { StrictMode, createElement } from "react"`)
  lines.push(`import { createRoot } from "react-dom/client"`)
  lines.push(`import App from "${entryFile}"`)
  lines.push(``)
  lines.push(`createRoot(document.getElementById("root")).render(`)
  lines.push(`  createElement(StrictMode, null, createElement(App))`)
  lines.push(`)`)

  return lines.join("\n")
}
