import type { Command } from "commander";
import { loadState, timestampId, writeArtifact } from "../lib/artifacts.js";
import { promptText } from "../lib/input.js";
import { findRepoRoot } from "../lib/paths.js";
import { copyAndNotify } from "../lib/clipboard.js";

export function registerCorrectCommand(program: Command): void {
  program
    .command("correct")
    .description("Create correction prompt when agent goes off track")
    .option("--feedback <text>", "Correction feedback to the agent")
    .option("--mode <mode>", "explain | narrow | milestone", "narrow")
    .option("-C, --clipboard", "Copy prompt to clipboard")
    .action(async (opts: { feedback?: string; mode?: string; clipboard?: boolean }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not in a git repository.");

      const state = await loadState(repoRoot);

      const feedback = opts.feedback ?? (await promptText("What is going wrong? (Correction feedback)", ""));
      const mode = (opts.mode ?? "narrow").toLowerCase();

      // eslint-disable-next-line no-console
      console.log("\n🔄 PULSE Correction\n");

      const modePrompts: Record<string, string> = {
        explain: `STOP. Explain what you understood:

1. **AS-IS**: What is the current state?
2. **TO-BE**: What should be the state?
3. **Attempts**: What have you tried so far?
4. **Theory**: Why does it not work?

Then suggest a MINIMAL next step.`,

        narrow: `CORRECTION: Apply the following change with MINIMAL scope.
Change ONLY what is necessary. NO refactoring of unrelated code.`,

        milestone: `STOP. The task is too big.

Split it into small milestones (1 change per milestone).
Suggest only Milestone 1, implement it, and then STOP.`,
      };

      const modePrompt: string = modePrompts[mode] ?? modePrompts.narrow ?? "";
      const fullPrompt: string = feedback.trim() 
        ? `${modePrompt}\n\n**Feedback:**\n${feedback.trim()}`
        : modePrompt;

      const ts = timestampId();
      const filename = `${ts}-correct.md`;
      const content = [
        `# Correction Pulse (${ts})`,
        ``,
        `- Layer: **${state.profile}**`,
        `- Mode: **${mode}**`,
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
      console.log(`✅ Saved: ${p}`);
      
      // Clipboard
      if (opts.clipboard) {
        const clipboardMsg = await copyAndNotify(fullPrompt);
        // eslint-disable-next-line no-console
        console.log(clipboardMsg);
      }
      
      // eslint-disable-next-line no-console
      console.log(`\n${"─".repeat(60)}`);
      // eslint-disable-next-line no-console
      console.log(`\n📋 CORRECTION PROMPT${opts.clipboard ? " (copied)" : ""}:\n`);
      // eslint-disable-next-line no-console
      console.log(fullPrompt);
      // eslint-disable-next-line no-console
      console.log(`\n${"─".repeat(60)}\n`);
    });
}
