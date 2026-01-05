import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { ensurePulseDirs } from "../lib/artifacts.js";
import { writeDefaultConfig } from "../lib/config.js";
import { findRepoRoot } from "../lib/paths.js";
import { installHooks } from "../hooks/install.js";

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

function packageRoot(): string {
  // dist/index.js -> dist/.. (package root)
  return path.resolve(__dirname, "..", "..");
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Initialize Pulse in the current git repository (creates .pulse/, pulse.config.json, optional hooks).")
    .option("-p, --path <path>", "Target path (defaults to cwd)")
    .option("--hooks", "Install git hooks (mixed enforcement)")
    .action(async (opts: { path?: string; hooks?: boolean }) => {
      const start = path.resolve(opts.path ?? process.cwd());
      const repoRoot = await findRepoRoot(start);
      if (!repoRoot) {
        throw new Error(`Not inside a git repository: ${start}`);
      }

      await ensurePulseDirs(repoRoot);

      const cfgPath = path.join(repoRoot, "pulse.config.json");
      if (!(await fileExists(cfgPath))) {
        await writeDefaultConfig(repoRoot);
        // eslint-disable-next-line no-console
        console.log(`Created ${cfgPath}`);
      } else {
        // eslint-disable-next-line no-console
        console.log(`Config exists: ${cfgPath}`);
      }

      const cursorrulesDst = path.join(repoRoot, ".cursorrules");
      if (!(await fileExists(cursorrulesDst))) {
        const src = path.join(packageRoot(), "templates", ".cursorrules");
        if (await fileExists(src)) {
          await fs.copyFile(src, cursorrulesDst);
          // eslint-disable-next-line no-console
          console.log(`Created ${cursorrulesDst}`);
        } else {
          // eslint-disable-next-line no-console
          console.log(`Skipped .cursorrules copy (missing template at ${src})`);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(`.cursorrules exists: ${cursorrulesDst}`);
      }

      // Copy role templates into .pulse/templates/roles for convenience
      const rolesSrcDir = path.join(packageRoot(), "templates", "roles");
      const rolesDstDir = path.join(repoRoot, ".pulse", "templates", "roles");
      if (await fileExists(rolesSrcDir)) {
        await fs.mkdir(rolesDstDir, { recursive: true });
        const roleFiles = await fs.readdir(rolesSrcDir);
        for (const f of roleFiles) {
          if (!f.endsWith(".cursorrules")) continue;
          await fs.copyFile(path.join(rolesSrcDir, f), path.join(rolesDstDir, f));
        }
        // eslint-disable-next-line no-console
        console.log(`Copied role templates to ${rolesDstDir}`);
      }

      if (opts.hooks) {
        await installHooks(repoRoot);
      }
    });
}

