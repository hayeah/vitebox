import path from "path"
import type { Plugin } from "vite"

const VIRTUAL_ENTRY_ID = "virtual:vitebox-entry"
const RESOLVED_VIRTUAL_ENTRY_ID = "\0" + VIRTUAL_ENTRY_ID

const VIRTUAL_HTML_ID = "vitebox-index.html"

export interface ViteboxPluginOptions {
  entryFile: string
  experimentDir: string
  hasCss: boolean
}

export function viteboxPlugin(options: ViteboxPluginOptions): Plugin {
  const { entryFile, experimentDir, hasCss } = options

  return {
    name: "vitebox",
    enforce: "pre",

    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === "/" || req.url === "/index.html") {
          req.url = `/${VIRTUAL_HTML_ID}`
        }
        next()
      })
    },

    resolveId(id) {
      if (id === VIRTUAL_ENTRY_ID) {
        return RESOLVED_VIRTUAL_ENTRY_ID
      }
      if (id === `/${VIRTUAL_HTML_ID}` || id === VIRTUAL_HTML_ID) {
        return id
      }
    },

    load(id) {
      if (id === `/${VIRTUAL_HTML_ID}` || id === VIRTUAL_HTML_ID) {
        return `<!DOCTYPE html>
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
      }

      if (id === RESOLVED_VIRTUAL_ENTRY_ID) {
        return generateEntryShim(entryFile, experimentDir, hasCss)
      }
    },
  }
}

function generateEntryShim(entryFile: string, experimentDir: string, hasCss: boolean): string {
  const cssPath = path.join(experimentDir, "index.css")

  const lines: string[] = []

  if (hasCss) {
    lines.push(`import "${cssPath}"`)
  }

  lines.push(`import { StrictMode } from "react"`)
  lines.push(`import { createRoot } from "react-dom/client"`)
  lines.push(`import App from "${entryFile}"`)
  lines.push(``)
  lines.push(`createRoot(document.getElementById("root")!).render(`)
  lines.push(`  <StrictMode><App /></StrictMode>`)
  lines.push(`)`)

  return lines.join("\n")
}
