import http from "http"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
}

export async function startCanvasServer(devPort: number, canvasPort?: number): Promise<number> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const canvasDir = path.join(__dirname, "canvas")

  if (!fs.existsSync(canvasDir)) {
    console.error("Error: Canvas app not built. Run 'pnpm build' in canvas/ first.")
    process.exit(1)
  }

  const server = http.createServer((req, res) => {
    let urlPath = new URL(req.url ?? "/", "http://localhost").pathname
    if (urlPath === "/") urlPath = "/index.html"

    // Inject the dev server URL into the HTML
    if (urlPath === "/index.html") {
      const htmlPath = path.join(canvasDir, "index.html")
      let html = fs.readFileSync(htmlPath, "utf-8")
      // Inject a script that sets the target URL before the app loads
      const inject = `<script>window.__VITEBOX_URL__ = "http://localhost:${devPort}";</script>`
      html = html.replace("</head>", `${inject}\n</head>`)
      res.writeHead(200, { "Content-Type": "text/html" })
      res.end(html)
      return
    }

    const filePath = path.join(canvasDir, urlPath)
    if (!fs.existsSync(filePath)) {
      res.writeHead(404)
      res.end("Not found")
      return
    }

    const ext = path.extname(filePath)
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream"
    res.writeHead(200, { "Content-Type": contentType })
    fs.createReadStream(filePath).pipe(res)
  })

  return new Promise((resolve) => {
    server.listen(canvasPort ?? 0, () => {
      const addr = server.address()
      const port = typeof addr === "object" && addr ? addr.port : 0
      resolve(port)
    })
  })
}
