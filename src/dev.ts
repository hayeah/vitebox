import fs from "fs"
import path from "path"
import { createServer } from "vite"
import { viteboxPlugin } from "./plugin.js"
import { resolveEntry, findViteConfig } from "./resolve.js"
import { startCanvasServer } from "./canvas-server.js"

export interface DevOptions {
  projectRoot: string
  experimentPath: string
  port?: number
  canvas?: boolean
}

export async function startDev(options: DevOptions) {
  const { projectRoot, experimentPath, port, canvas } = options

  const viteConfigPath = findViteConfig(projectRoot)
  if (!viteConfigPath) {
    console.error(`Error: No vite.config found in ${projectRoot}`)
    process.exit(1)
  }

  const { entryFile, experimentDir } = resolveEntry(experimentPath)

  const cssFile = path.join(experimentDir, "index.css")
  const hasCss = fs.existsSync(cssFile)

  const server = await createServer({
    configFile: viteConfigPath,
    root: projectRoot,
    server: {
      port: port,
    },
    plugins: [
      ...viteboxPlugin({ entryFile, experimentDir, projectRoot, hasCss }),
    ],
  })

  await server.listen()
  server.printUrls()

  if (canvas) {
    const devAddr = server.resolvedUrls?.local[0]
    const devPort = devAddr ? new URL(devAddr).port : String(port ?? 5173)
    const canvasPort = await startCanvasServer(parseInt(devPort))
    console.log(`  ➜  Canvas:  http://localhost:${canvasPort}/`)
  }
}
