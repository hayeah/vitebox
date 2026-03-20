#!/usr/bin/env node

import { cac } from "cac"
import path from "path"
import { startDev } from "./dev.js"
import { startBuild } from "./build.js"

const cli = cac("vitebox")

cli
  .command("dev <experiment>", "Start dev server for an experiment")
  .option("--project <path>", "Path to container project (must have vite.config.ts)")
  .option("--port <port>", "Dev server port")
  .action(async (experiment: string, options: { project?: string; port?: number }) => {
    if (!options.project) {
      console.error("Error: --project is required")
      process.exit(1)
    }

    const projectRoot = path.resolve(options.project)
    const experimentPath = path.resolve(experiment)

    await startDev({
      projectRoot,
      experimentPath,
      port: options.port,
    })
  })

cli
  .command("build <experiment>", "Build static output for an experiment")
  .option("--project <path>", "Path to container project (must have vite.config.ts)")
  .option("--out-dir <path>", "Output directory (default: <experiment>/dist)")
  .action(async (experiment: string, options: { project?: string; outDir?: string }) => {
    if (!options.project) {
      console.error("Error: --project is required")
      process.exit(1)
    }

    const projectRoot = path.resolve(options.project)
    const experimentPath = path.resolve(experiment)

    await startBuild({
      projectRoot,
      experimentPath,
      outDir: options.outDir ? path.resolve(options.outDir) : undefined,
    })
  })

cli.help()
cli.version("0.1.0")
cli.parse()
