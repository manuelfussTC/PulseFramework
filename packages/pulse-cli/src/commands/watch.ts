import chokidar from "chokidar";
import path from "node:path";
import type { Command } from "commander";
import { loadConfig } from "../lib/config.js";
import { loadState } from "../lib/artifacts.js";
import { findRepoRoot } from "../lib/paths.js";
import { gitStatusPorcelain } from "../lib/git.js";
import { notify } from "../lib/notifications.js";

export function registerWatchCommand(program: Command): void {
  program
    .command("watch")
    .alias("w") // Kurzform: pulse w
    .description("Background watcher: 30-min timer + checkpoint reminders (macOS notifications)")
    .option("--minutes <n>", "Minutes between checkpoint reminders", "30")
    .option("--poll-seconds <n>", "Polling interval seconds", "30")
    .action(async (opts: { minutes?: string; pollSeconds?: string }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not inside a git repository.");

      const config = await loadConfig(repoRoot);
      const minutes = Math.max(1, Number(opts.minutes ?? "30"));
      const pollSeconds = Math.max(5, Number(opts.pollSeconds ?? "30"));

      await notify(
        config.notifications,
        "Pulse watch started",
        `Checkpoint reminder every ${minutes} minutes. Poll: ${pollSeconds}s.`
      );

      const watcher = chokidar.watch(repoRoot, {
        ignored: [
          /(^|[\/\\])\.git/,
          /(^|[\/\\])node_modules/,
          /(^|[\/\\])dist/,
          /(^|[\/\\])build/,
          /(^|[\/\\])coverage/,
          /(^|[\/\\])\.pulse/,
        ],
        ignoreInitial: true,
      });

      let dirtySince: number | null = null;
      let lastReminderAt = Date.now();

      watcher.on("all", async () => {
        const st = await gitStatusPorcelain(repoRoot);
        const dirty = st.trim().length > 0;
        if (dirty && dirtySince == null) dirtySince = Date.now();
        if (!dirty) dirtySince = null;
      });

      // Polling loop (git status + checkpoint age)
      const interval = setInterval(async () => {
        const st = await gitStatusPorcelain(repoRoot);
        const dirty = st.trim().length > 0;
        if (dirty && dirtySince == null) dirtySince = Date.now();
        if (!dirty) dirtySince = null;

        const state = await loadState(repoRoot);
        const lastCp = state.lastCheckpointAt ? Date.parse(state.lastCheckpointAt) : null;
        const now = Date.now();

        const minutesSinceLastCp =
          lastCp && Number.isFinite(lastCp) ? Math.floor((now - lastCp) / 60000) : null;

        const shouldRemind = now - lastReminderAt >= minutes * 60_000;
        if (!shouldRemind) return;
        lastReminderAt = now;

        if (!dirty) {
          await notify(config.notifications, "Pulse checkpoint", "Repo is clean. No checkpoint needed right now.");
          return;
        }

        const dirtyMins = dirtySince ? Math.floor((now - dirtySince) / 60000) : null;
        await notify(
          config.notifications,
          "Pulse checkpoint now",
          [
            `You have uncommitted changes.`,
            dirtyMins != null ? `Dirty for ~${dirtyMins} min.` : "",
            minutesSinceLastCp != null ? `Last checkpoint: ${minutesSinceLastCp} min ago.` : "No checkpoint recorded yet.",
            `Run: pulse checkpoint`,
          ]
            .filter(Boolean)
            .join("\n")
        );
      }, pollSeconds * 1000);

      const cleanup = async () => {
        clearInterval(interval);
        await watcher.close().catch(() => {});
      };

      process.on("SIGINT", async () => {
        await cleanup();
        // eslint-disable-next-line no-console
        console.log("Pulse watch stopped.");
        process.exit(0);
      });
      process.on("SIGTERM", async () => {
        await cleanup();
        process.exit(0);
      });

      // Keep process alive
      // eslint-disable-next-line no-console
      console.log(`Watching ${path.basename(repoRoot)} ... (Ctrl+C to stop)`);
    });
}

