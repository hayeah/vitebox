import fs from "fs"
import path from "path"
import { build } from "vite"
import { viteboxPlugin } from "./plugin.js"
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

  const cssFile = path.join(experimentDir, "index.css")
  const hasCss = fs.existsSync(cssFile)

  // Vite build needs a real index.html file as entry.
  // Write a temp one to the project root, build, then clean up.
  const tempHtml = path.join(projectRoot, "vitebox-entry.html")
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>vitebox</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="virtual:vitebox-entry"></script>
</body>
</html>`

  fs.writeFileSync(tempHtml, htmlContent)

  const outDir = options.outDir ?? path.join(experimentDir, "dist")

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
        ...viteboxPlugin({ entryFile, experimentDir, projectRoot, hasCss }),
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
    // Clean up temp HTML
    if (fs.existsSync(tempHtml)) {
      fs.unlinkSync(tempHtml)
    }
  }
}
