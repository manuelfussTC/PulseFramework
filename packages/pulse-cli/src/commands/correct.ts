import type { Command } from "commander";
import { loadState, timestampId, writeArtifact } from "../lib/artifacts.js";
import { promptText } from "../lib/input.js";
import { findRepoRoot } from "../lib/paths.js";

export function registerCorrectCommand(program: Command): void {
  program
    .command("correct")
    .description("Create a Correction Pulse artifact + paste-ready steering prompt.")
    .option("--feedback <text>", "Correction feedback to the agent")
    .option("--mode <mode>", "explain | narrow | milestone", "narrow")
    .action(async (opts: { feedback?: string; mode?: string }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not inside a git repository.");

      const state = await loadState(repoRoot);

      const feedback = opts.feedback ?? (await promptText("Correction feedback", ""));
      const mode = (opts.mode ?? "narrow").toLowerCase();

      const prompt =
        mode === "explain"
          ? `Explain what you understood. Provide:\n1) Current behavior (IST)\n2) Expected behavior (SOLL)\n3) What you tried\n4) Your theory why it fails\n\nThen propose a minimal next step.`
          : mode === "milestone"
            ? `Split the task into small milestones (1 change per milestone). Propose Milestone 1 only, implement it, and stop.`
            : `Apply the following correction with minimal scope. Do NOT refactor unrelated code.`;

      const ts = timestampId();
      const filename = `${ts}-correct.md`;
      const content = [
        `# Correction Pulse (${ts})`,
        ``,
        `- Layer: **${state.profile}**`,
        `- Mode: **${mode}**`,
        ``,
        `## Paste into Cursor (Agent Mode)`,
        ``,
        "```",
        prompt,
        "",
        feedback.trim(),
        "```",
        ``,
      ].join("\n");

      const p = await writeArtifact(repoRoot, "pulses", filename, content);
      // eslint-disable-next-line no-console
      console.log(`Wrote ${p}`);
      // eslint-disable-next-line no-console
      console.log("\n---\nPaste-ready prompt:\n");
      // eslint-disable-next-line no-console
      console.log(prompt);
      if (feedback.trim()) {
        // eslint-disable-next-line no-console
        console.log("\nFeedback:\n" + feedback.trim());
      }
    });
}

