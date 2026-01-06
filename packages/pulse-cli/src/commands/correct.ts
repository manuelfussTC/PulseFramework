import type { Command } from "commander";
import { loadState, timestampId, writeArtifact } from "../lib/artifacts.js";
import { promptText } from "../lib/input.js";
import { findRepoRoot } from "../lib/paths.js";
import { copyAndNotify } from "../lib/clipboard.js";

export function registerCorrectCommand(program: Command): void {
  program
    .command("correct")
    .description("Korrektur-Prompt erstellen wenn Agent falsch abgebogen ist")
    .option("--feedback <text>", "Korrektur-Feedback an den Agent")
    .option("--mode <mode>", "explain | narrow | milestone", "narrow")
    .option("-C, --clipboard", "Prompt in Zwischenablage kopieren")
    .action(async (opts: { feedback?: string; mode?: string; clipboard?: boolean }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Nicht in einem Git-Repository.");

      const state = await loadState(repoRoot);

      const feedback = opts.feedback ?? (await promptText("Was läuft falsch? (Korrektur-Feedback)", ""));
      const mode = (opts.mode ?? "narrow").toLowerCase();

      // eslint-disable-next-line no-console
      console.log("\n🔄 PULSE Korrektur\n");

      const modePrompts: Record<string, string> = {
        explain: `STOP. Erkläre mir was du verstanden hast:

1. **IST**: Was ist der aktuelle Zustand?
2. **SOLL**: Was sollte der Zustand sein?
3. **Versuche**: Was hast du bisher versucht?
4. **Theorie**: Warum funktioniert es nicht?

Dann schlage einen MINIMALEN nächsten Schritt vor.`,

        narrow: `KORREKTUR: Wende folgende Änderung mit MINIMALEM Scope an.
Ändere NUR was nötig ist. KEIN Refactoring von unrelated Code.`,

        milestone: `STOP. Die Aufgabe ist zu groß.

Teile sie in kleine Milestones auf (1 Änderung pro Milestone).
Schlage nur Milestone 1 vor, implementiere ihn, und STOPPE dann.`,
      };

      const modePrompt: string = modePrompts[mode] ?? modePrompts.narrow ?? "";
      const fullPrompt: string = feedback.trim() 
        ? `${modePrompt}\n\n**Feedback:**\n${feedback.trim()}`
        : modePrompt;

      const ts = timestampId();
      const filename = `${ts}-correct.md`;
      const content = [
        `# Korrektur-Pulse (${ts})`,
        ``,
        `- Layer: **${state.profile}**`,
        `- Modus: **${mode}**`,
        ``,
        `## Prompt`,
        ``,
        "```",
        fullPrompt,
        "```",
        ``,
      ].join("\n");

      const p = await writeArtifact(repoRoot, "pulses", filename, content);
      
      // eslint-disable-next-line no-console
      console.log(`✅ Gespeichert: ${p}`);
      
      // Clipboard
      if (opts.clipboard) {
        const clipboardMsg = await copyAndNotify(fullPrompt);
        // eslint-disable-next-line no-console
        console.log(clipboardMsg);
      }
      
      // eslint-disable-next-line no-console
      console.log(`\n${"─".repeat(60)}`);
      // eslint-disable-next-line no-console
      console.log(`\n📋 KORREKTUR-PROMPT${opts.clipboard ? " (kopiert)" : ""}:\n`);
      // eslint-disable-next-line no-console
      console.log(fullPrompt);
      // eslint-disable-next-line no-console
      console.log(`\n${"─".repeat(60)}\n`);
    });
}
