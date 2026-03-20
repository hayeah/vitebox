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

  // If experiment dir doesn't have its own node_modules, symlink to project's
  // so that CSS resolvers (Tailwind's enhanced-resolve) can find packages.
  const experimentNodeModules = path.join(experimentDir, "node_modules")
  const projectNodeModules = path.join(projectRoot, "node_modules")
  let createdSymlink = false
  if (!fs.existsSync(experimentNodeModules) && fs.existsSync(projectNodeModules)) {
    fs.symlinkSync(projectNodeModules, experimentNodeModules)
    createdSymlink = true
  }

  const server = await createServer({
    configFile: viteConfigPath,
    root: projectRoot,
    server: {
      port: port,
      fs: {
        allow: [projectRoot, experimentDir],
      },
    },
    plugins: [
      ...viteboxPlugin({ entryFile, experimentDir, projectRoot, hasCss }),
    ],
  })

  // Clean up symlink on server close
  if (createdSymlink) {
    const cleanup = () => {
      try { fs.unlinkSync(experimentNodeModules) } catch {}
    }
    process.on("exit", cleanup)
    process.on("SIGINT", () => { cleanup(); process.exit() })
    process.on("SIGTERM", () => { cleanup(); process.exit() })
  }

  await server.listen()
  server.printUrls()

  if (canvas) {
    const devAddr = server.resolvedUrls?.local[0]
    const devPort = devAddr ? new URL(devAddr).port : String(port ?? 5173)
    const canvasPort = await startCanvasServer(parseInt(devPort))
    console.log(`  ➜  Canvas:  http://localhost:${canvasPort}/`)
  }
}
