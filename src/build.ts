import fs from "fs"
import path from "path"
import { build } from "vite"
import { viteboxPlugin, generateHTML } from "./plugin.js"
import { resolveEntry, findViteConfig } from "./resolve.js"

export interface BuildOptions {
  projectRoot: string
  experimentPath: string
  outDir?: string
}

export async function startBuild(options: BuildOptions) {
  const { projectRoot, experimentPath } = options

  const viteConfigPath = findViteConfig(projectRoot)
  if (!viteConfigPath) {
    console.error(`Error: No vite.config found in ${projectRoot}`)
    process.exit(1)
  }

  const { entryFile, experimentDir } = resolveEntry(experimentPath)

  // Vite build needs a real index.html file as entry.
  const tempHtml = path.join(projectRoot, "vitebox-entry.html")
  fs.writeFileSync(tempHtml, generateHTML(entryFile))

  const outDir = options.outDir ?? path.join(experimentDir, "dist")

  // Symlink node_modules if needed
  const experimentNodeModules = path.join(experimentDir, "node_modules")
  const projectNodeModules = path.join(projectRoot, "node_modules")
  let createdSymlink = false
  if (!fs.existsSync(experimentNodeModules) && fs.existsSync(projectNodeModules)) {
    fs.symlinkSync(projectNodeModules, experimentNodeModules)
    createdSymlink = true
  }

  try {
    await build({
      configFile: viteConfigPath,
      root: projectRoot,
      build: {
        outDir,
        emptyOutDir: true,
        rollupOptions: {
          input: tempHtml,
        },
      },
      plugins: [
        ...viteboxPlugin({ entryFile, experimentDir, projectRoot }),
      ],
    })

    // Rename vitebox-entry.html → index.html in output
    const outputHtml = path.join(outDir, "vitebox-entry.html")
    const finalHtml = path.join(outDir, "index.html")
    if (fs.existsSync(outputHtml)) {
      fs.renameSync(outputHtml, finalHtml)
    }

    console.log(`\nBuild output: ${outDir}`)
  } finally {
    if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml)
    if (createdSymlink) {
      try { fs.unlinkSync(experimentNodeModules) } catch {}
    }
  }
}
