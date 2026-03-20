import fs from "fs"
import path from "path"
import { createServer } from "vite"
import { viteboxPlugin } from "./plugin.js"
import { resolveEntry, findViteConfig } from "./resolve.js"

export interface DevOptions {
  projectRoot: string
  experimentPath: string
  port?: number
}

export async function startDev(options: DevOptions) {
  const { projectRoot, experimentPath, port } = options

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
      viteboxPlugin({ entryFile, experimentDir, hasCss }),
    ],
  })

  await server.listen()
  server.printUrls()
}
