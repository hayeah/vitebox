import fs from "fs"
import path from "path"

export function resolveEntry(experimentPath: string): { entryFile: string; experimentDir: string } {
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

export function findViteConfig(dir: string): string | undefined {
  for (const name of ["vite.config.ts", "vite.config.js", "vite.config.mjs"]) {
    const p = path.join(dir, name)
    if (fs.existsSync(p)) return p
  }
  return undefined
}
