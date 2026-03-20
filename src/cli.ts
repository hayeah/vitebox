#!/usr/bin/env node

import { cac } from "cac"
import path from "path"
import { startDev } from "./dev.js"

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

cli.help()
cli.version("0.1.0")
cli.parse()
