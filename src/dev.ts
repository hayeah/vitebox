import fs from "fs"
import path from "path"
import { createServer } from "vite"
import { viteboxPlugin } from "./plugin.js"

export interface DevOptions {
  projectRoot: string
  experimentPath: string
  port?: number
}

function resolveEntry(experimentPath: string): { entryFile: string; experimentDir: string } {
  const stat = fs.statSync(experimentPath, { throwIfNoEntry: false })

  if (stat?.isFile()) {
    return {
      entryFile: experimentPath,
      experimentDir: path.dirname(experimentPath),
    }
  }

  if (stat?.isDirectory()) {
    const entryFile = path.join(experimentPath, "index.tsx")
    if (!fs.existsSync(entryFile)) {
      console.error(`Error: No index.tsx found in ${experimentPath}`)
      process.exit(1)
    }
    return { entryFile, experimentDir: experimentPath }
  }

  console.error(`Error: ${experimentPath} does not exist`)
  process.exit(1)
}

export async function startDev(options: DevOptions) {
  const { projectRoot, experimentPath, port } = options

  // Validate project has vite.config
  const viteConfigPath = findViteConfig(projectRoot)
  if (!viteConfigPath) {
    console.error(`Error: No vite.config found in ${projectRoot}`)
    process.exit(1)
  }

  const { entryFile, experimentDir } = resolveEntry(experimentPath)

  // Check for optional index.css
  const cssFile = path.join(experimentDir, "index.css")
  const hasCss = fs.existsSync(cssFile)

  // Let Vite load the project's config natively via configFile,
  // then layer our overrides on top. This avoids mergeConfig
  // duplicating plugins (e.g. double react plugin).
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

function findViteConfig(dir: string): string | undefined {
  for (const name of ["vite.config.ts", "vite.config.js", "vite.config.mjs"]) {
    const p = path.join(dir, name)
    if (fs.existsSync(p)) return p
  }
  return undefined
}
