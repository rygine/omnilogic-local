#!/usr/bin/env node
import { run } from "@/cli";
import { configDir } from "@/store";

process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") {
    process.exit(0);
  }
  throw error;
});

process.exitCode = await run(process.argv.slice(2), {
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
  configDir: configDir(process.env),
});
