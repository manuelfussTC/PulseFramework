import type { Command } from "commander";
import { loadState, saveState, timestampId, writeArtifact } from "../lib/artifacts.js";
import { loadConfig } from "../lib/config.js";
import { promptText, promptSelect, promptConfirm } from "../lib/input.js";
import { findRepoRoot } from "../lib/paths.js";
import { gitStatusPorcelain, gitDiffStat } from "../lib/git.js";
import { notify } from "../lib/notifications.js";
import { copyAndNotify } from "../lib/clipboard.js";
import {
  renderSixElementPrompt,
  PROMPT_TEMPLATES,
  getTemplateById,
} from "../lib/prompts.js";
import type { SixElements } from "../lib/prompts.js";
import type { PulseLayer } from "../lib/types.js";

export function registerRunCommand(program: Command): void {
  program
    .command("run")
    .description("Combined workflow: Start → Watch → Checkpoints → Review")
    .option("-t, --template <id>", "Vorlage: feature, bugfix, refactor, concept, analyze, review")
    .option("--minutes <n>", "Minutes between checkpoint reminders")
    .option("--no-watch", "Don't start watcher")
    .option("--action <text>", "ACTION direkt angeben")
    .option("-C, --clipboard", "Prompt in Zwischenablage kopieren")
    .action(
      async (opts: {
        template?: string;
        minutes?: string;
        watch?: boolean;
        action?: string;
        clipboard?: boolean;
      }) => {
        const repoRoot = await findRepoRoot(process.cwd());
        if (!repoRoot) throw new Error("Nicht in einem Git-Repository.");

        const [state, config] = await Promise.all([loadState(repoRoot), loadConfig(repoRoot)]);

        // Use preset checkpoint interval if not specified
        const minutes = opts.minutes
          ? Math.max(5, Number(opts.minutes))
          : config.checkpointReminderMinutes ?? 30;

        const presetProfile = config.preset ? `${config.preset}/${state.profile}` : state.profile;

        // ════════════════════════════════════════════════════════════════════════
        // HEADER
        // ════════════════════════════════════════════════════════════════════════
        // eslint-disable-next-line no-console
        console.log(`
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  🚀 PULSE Run                                                 ┃
┃  Profile: ${presetProfile.padEnd(49)}┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`);

        // ════════════════════════════════════════════════════════════════════════
        // PHASE 1: Create prompt
        // ════════════════════════════════════════════════════════════════════════
        // eslint-disable-next-line no-console
        console.log(`━━━ PHASE 1: Prompt ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        // Template auswählen
        let template = opts.template ? getTemplateById(opts.template) : undefined;

        if (!template && !opts.action) {
          const choices = PROMPT_TEMPLATES.map((t) => ({
            value: t.id,
            label: `${t.name} - ${t.description}`,
          }));

          const selectedId = await promptSelect("📋 Vorlage wählen", choices, "feature");
          template = getTemplateById(selectedId);
        }

        // 6-Elemente sammeln
        const el: SixElements = {
          role: template?.defaults.role,
          context: template?.defaults.context,
          output: template?.defaults.output,
          action: opts.action,
        };

        const layer: PulseLayer = template?.layer ?? state.profile;

        if (!el.action?.trim()) {
          el.action = await promptText("⚡ ACTION (Was soll gemacht werden?)", "");
        }

        if (!el.context?.trim()) {
          el.context = await promptText("📍 KONTEXT (Projekt, Stack)", "");
        }

        // Prompt generieren
        const prompt = renderSixElementPrompt(layer, el);

        // Artefakt speichern
        const ts = timestampId();
        const filename = `${ts}-run.md`;
        const content = [
          `# Pulse Run (${ts})`,
          ``,
          `- Profile: **${presetProfile}**`,
          `- Layer: **${layer}**`,
          template ? `- Vorlage: **${template.name}**` : "",
          `- Checkpoint interval: **${minutes} min**`,
          ``,
          `## Prompt`,
          ``,
          "```",
          prompt.trimEnd(),
          "```",
          ``,
        ]
          .filter((line) => line !== "")
          .join("\n");

        const artifactPath = await writeArtifact(repoRoot, "pulses", filename, content);

        // eslint-disable-next-line no-console
        console.log(`✅ Template: ${template?.name ?? "custom"}`);
        // eslint-disable-next-line no-console
        console.log(`✅ Artefakt: ${artifactPath}`);

        // Clipboard
        if (opts.clipboard) {
          const clipMsg = await copyAndNotify(prompt);
          // eslint-disable-next-line no-console
          console.log(clipMsg);
        }

        // eslint-disable-next-line no-console
        console.log(`\n┌${"─".repeat(58)}┐`);
        // eslint-disable-next-line no-console
        console.log(`│ PROMPT ${opts.clipboard ? "(copied)" : "(copy and paste into Cursor)"}${" ".repeat(opts.clipboard ? 35 : 19)}│`);
        // eslint-disable-next-line no-console
        console.log(`└${"─".repeat(58)}┘\n`);
        // eslint-disable-next-line no-console
        console.log(prompt.trimEnd());
        // eslint-disable-next-line no-console
        console.log(`\n${"─".repeat(60)}\n`);

        // ════════════════════════════════════════════════════════════════════════
        // PHASE 2: Watch Loop
        // ════════════════════════════════════════════════════════════════════════

        if (opts.watch === false) {
          // eslint-disable-next-line no-console
          console.log(`━━━ PHASE 2: Übersprungen ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
          // eslint-disable-next-line no-console
          console.log("Watcher not started (--no-watch).\n");
          // eslint-disable-next-line no-console
          console.log("💡 Next steps:");
          // eslint-disable-next-line no-console
          console.log("   1. Prompt in Cursor einfügen");
          // eslint-disable-next-line no-console
          console.log("   2. `pulse checkpoint` alle 5-10 Min");
          // eslint-disable-next-line no-console
          console.log("   3. Bei Problemen: `pulse escalate`");
          // eslint-disable-next-line no-console
          console.log("   4. Am Ende: `pulse review`\n");
          return;
        }

        // eslint-disable-next-line no-console
        console.log(`━━━ PHASE 2: Watcher ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        // eslint-disable-next-line no-console
        console.log(`⏱️  Checkpoint interval: ${minutes} min (${config.preset ?? "custom"} preset)`);
        // eslint-disable-next-line no-console
        console.log(`📍 Watcher running... (Ctrl+C to stop)\n`);
        // eslint-disable-next-line no-console
        console.log(`   1. Kopiere den Prompt oben in Cursor`);
        // eslint-disable-next-line no-console
        console.log(`   2. Arbeite los`);
        // eslint-disable-next-line no-console
        console.log(`   3. Ctrl+C wenn fertig\n`);

        await notify(
          config.notifications,
          "Pulse Run gestartet",
          `Checkpoint reminder every ${minutes} min. Ctrl+C to exit.`
        );

        // Update state
        state.lastCheckpointAt = new Date().toISOString();
        await saveState(repoRoot, state);

        let checkpointCount = 0;
        let lastReminderAt = Date.now();

        // Polling loop
        const interval = setInterval(async () => {
          const now = Date.now();
          const shouldRemind = now - lastReminderAt >= minutes * 60_000;

          if (!shouldRemind) return;
          lastReminderAt = now;

          const status = await gitStatusPorcelain(repoRoot);
          const dirty = status.trim().length > 0;

          if (dirty) {
            checkpointCount++;
            await notify(
              config.notifications,
              `⏱️ Checkpoint #${checkpointCount}`,
              `${minutes} min passed. Time for: pulse checkpoint`
            );

            // eslint-disable-next-line no-console
            console.log(`\n┌${"─".repeat(58)}┐`);
            // eslint-disable-next-line no-console
            console.log(
              `│ ⏰ CHECKPOINT REMINDER #${checkpointCount}${" ".repeat(58 - 26 - String(checkpointCount).length)}│`
            );
            // eslint-disable-next-line no-console
            console.log(`└${"─".repeat(58)}┘`);
            // eslint-disable-next-line no-console
            console.log(`   Zeit: ${new Date().toLocaleTimeString()}`);
            // eslint-disable-next-line no-console
            console.log(`   Status: Uncommitted Changes vorhanden`);
            // eslint-disable-next-line no-console
            console.log(`   → pulse checkpoint -m 'deine message'\n`);
          } else {
            // eslint-disable-next-line no-console
            console.log(
              `\n✨ [${new Date().toLocaleTimeString()}] Repo is clean - no checkpoint needed\n`
            );
          }
        }, 30_000); // Check every 30 seconds

        // ════════════════════════════════════════════════════════════════════════
        // PHASE 3: Cleanup on exit
        // ════════════════════════════════════════════════════════════════════════

        const cleanup = async (signal: string) => {
          clearInterval(interval);

          // eslint-disable-next-line no-console
          console.log(`\n\n━━━ PHASE 3: Abschluss ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
          // eslint-disable-next-line no-console
          console.log(`🛑 ${signal} empfangen - Beende Pulse Run...\n`);

          // Check final status
          const status = await gitStatusPorcelain(repoRoot);
          const dirty = status.trim().length > 0;

          if (dirty) {
            // eslint-disable-next-line no-console
            console.log("📝 Uncommitted Changes gefunden:\n");

            const stat = await gitDiffStat(repoRoot);
            // eslint-disable-next-line no-console
            console.log(stat);
            // eslint-disable-next-line no-console
            console.log("");

            const doCheckpoint = await promptConfirm("Create checkpoint?", true);
            if (doCheckpoint) {
              const msg = await promptText("Commit message", "checkpoint: work in progress");
              const { exec } = await import("../lib/exec.js");
              await exec("git", ["add", "-A"], { cwd: repoRoot });
              await exec("git", ["commit", "-m", msg], { cwd: repoRoot });
              // eslint-disable-next-line no-console
              console.log("✅ Committed.\n");
            }
          } else {
            // eslint-disable-next-line no-console
            console.log("✨ Keine uncommitted Changes.\n");
          }

          // Offer review
          const doReview = await promptConfirm("Create review?", dirty);
          if (doReview) {
            // eslint-disable-next-line no-console
            console.log("\n💡 Führe aus: pulse review\n");
          }

          // Summary
          // eslint-disable-next-line no-console
          console.log(`┌${"─".repeat(58)}┐`);
          // eslint-disable-next-line no-console
          console.log(`│ 👋 Pulse Run beendet${" ".repeat(37)}│`);
          // eslint-disable-next-line no-console
          console.log(`│                                                          │`);
          // eslint-disable-next-line no-console
          console.log(`│ Checkpoints: ${checkpointCount}${" ".repeat(43 - String(checkpointCount).length)}│`);
          // eslint-disable-next-line no-console
          console.log(`│ Artefakt: .pulse/pulses/${filename}${" ".repeat(Math.max(0, 32 - filename.length))}│`);
          // eslint-disable-next-line no-console
          console.log(`└${"─".repeat(58)}┘\n`);

          process.exit(0);
        };

        process.on("SIGINT", () => cleanup("SIGINT"));
        process.on("SIGTERM", () => cleanup("SIGTERM"));
      }
    );
}
