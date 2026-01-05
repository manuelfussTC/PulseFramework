import fs from "node:fs/promises";
import type { Command } from "commander";
import { timestampId, writeArtifact } from "../lib/artifacts.js";
import { promptText } from "../lib/input.js";
import { findRepoRoot } from "../lib/paths.js";
import { gitDiffStat, gitLogOneline } from "../lib/git.js";

async function readOptionalFile(p?: string): Promise<string> {
  if (!p) return "";
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return "";
  }
}

export function registerEscalateCommand(program: Command): void {
  program
    .command("escalate")
    .description("Create an escalation package (Cursor explanation + code context + clear question).")
    .option("--cursor <text>", "Paste Cursor's explanation")
    .option("--error <text>", "Paste primary error message/logs")
    .option("--error-file <path>", "Path to a log file to include")
    .option("--question <text>", "What do you want the external model to answer?")
    .action(
      async (opts: { cursor?: string; error?: string; errorFile?: string; question?: string }) => {
        const repoRoot = await findRepoRoot(process.cwd());
        if (!repoRoot) throw new Error("Not inside a git repository.");

        const cursorExplanation = opts.cursor ?? (await promptText("Paste Cursor explanation (optional)", ""));
        const errorText =
          opts.error ??
          (opts.errorFile ? await readOptionalFile(opts.errorFile) : await promptText("Primary error/logs (optional)", ""));
        const question = opts.question ?? (await promptText("Question for external model", "What is the root cause and what should I instruct Cursor to do next?"));

        const [log, stat] = await Promise.all([gitLogOneline(repoRoot, 10), gitDiffStat(repoRoot)]);

        const ts = timestampId();
        const filename = `${ts}-escalate.md`;
        const content = [
          `# Escalation Package (${ts})`,
          ``,
          `## Prompt template (paste into ChatGPT/Claude/GPT-5/Opus)`,
          ``,
          "```",
          "[ROLE]",
          "You are a senior developer reviewing an existing project. Provide diagnosis + instructions for my builder agent (Cursor).",
          "",
          "[CONTEXT]",
          "My builder agent (Cursor AI) is stuck. Here is its explanation and the current situation.",
          "",
          "[INPUT]",
          "Cursor explanation:",
          cursorExplanation.trim() || "(not provided)",
          "",
          "Primary error/logs:",
          errorText.trim() || "(not provided)",
          "",
          "Git context (recent commits):",
          log || "(none)",
          "",
          "Diff stat:",
          stat || "(no changes)",
          "",
          "[OUTPUT]",
          "Give me:",
          "1) Your analysis (what is the real issue)",
          "2) A solution written as instructions for Cursor (step-by-step)",
          "3) Optional: minimal reference snippet if needed",
          "",
          "[ACTION]",
          question.trim(),
          "```",
          ``,
          `## Notes`,
          `- After receiving the answer: paste the instruction section back into Cursor Agent Mode (do not copy random code blindly).`,
          ``,
        ].join("\n");

        const p = await writeArtifact(repoRoot, "escalations", filename, content);
        // eslint-disable-next-line no-console
        console.log(`Wrote ${p}`);
      }
    );
}

