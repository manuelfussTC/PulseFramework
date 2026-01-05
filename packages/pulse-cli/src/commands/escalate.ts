import fs from "node:fs/promises";
import type { Command } from "commander";
import { timestampId, writeArtifact } from "../lib/artifacts.js";
import { promptText } from "../lib/input.js";
import { findRepoRoot } from "../lib/paths.js";
import { gitDiffStat, gitDiffText, gitLogOneline } from "../lib/git.js";
import { renderEscalationPrompt } from "../lib/prompts.js";

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
    .description("Create a detailed escalation package for an external reasoning model (ChatGPT/Claude/GPT-5/Opus).")
    .option("--cursor <text>", "What has Cursor tried? (Agent's explanation)")
    .option("--error <text>", "Primary error message or logs")
    .option("--error-file <path>", "Path to a log file to include")
    .option("--code <text>", "Relevant code snippets")
    .option("--code-file <path>", "Path to a file with relevant code")
    .option("--question <text>", "Your specific question for the reasoning model")
    .option("--detailed", "Include full diff (not just stat)")
    .action(
      async (opts: {
        cursor?: string;
        error?: string;
        errorFile?: string;
        code?: string;
        codeFile?: string;
        question?: string;
        detailed?: boolean;
      }) => {
        const repoRoot = await findRepoRoot(process.cwd());
        if (!repoRoot) throw new Error("Not inside a git repository.");

        // Gather information interactively if not provided
        // eslint-disable-next-line no-console
        console.log("\n📋 Creating Escalation Package...\n");

        const cursorExplanation =
          opts.cursor ??
          (await promptText(
            "Was hat Cursor versucht? (Agent-Erklärung)",
            "Beschreibe was der Agent gemacht hat und wo er stuck ist..."
          ));

        const errorText =
          opts.error ??
          (opts.errorFile
            ? await readOptionalFile(opts.errorFile)
            : await promptText("Fehlermeldung / Logs", ""));

        const codeSnippets =
          opts.code ??
          (opts.codeFile
            ? await readOptionalFile(opts.codeFile)
            : await promptText("Relevanter Code (optional, Enter zum Überspringen)", ""));

        const question =
          opts.question ??
          (await promptText(
            "Deine konkrete Frage",
            "Was ist die Root Cause und wie löse ich das Problem?"
          ));

        // Gather git context
        const [log, stat, diff] = await Promise.all([
          gitLogOneline(repoRoot, 15),
          gitDiffStat(repoRoot),
          opts.detailed ? gitDiffText(repoRoot, { maxLines: 500 }) : Promise.resolve(""),
        ]);

        // Generate the escalation prompt
        const prompt = renderEscalationPrompt({
          cursorExplanation,
          errorText,
          gitLog: log,
          gitDiff: opts.detailed ? diff : stat,
          question,
          codeSnippets: codeSnippets || undefined,
        });

        const ts = timestampId();
        const filename = `${ts}-escalate.md`;
        const content = [
          `# Escalation Package (${ts})`,
          ``,
          `## Anleitung`,
          `1. Kopiere den Prompt unten`,
          `2. Füge ihn in ChatGPT, Claude, GPT-5 oder Opus ein`,
          `3. Die Antwort enthält Schritt-für-Schritt Anweisungen`,
          `4. Gib diese Anweisungen an Cursor weiter (NICHT blind Code kopieren!)`,
          ``,
          `---`,
          ``,
          `## Prompt (kopieren und in externes Model einfügen)`,
          ``,
          prompt,
          ``,
          `---`,
          ``,
          `## Metadaten`,
          `- Erstellt: ${new Date().toISOString()}`,
          `- Git Branch: (siehe git status)`,
          `- Working Directory: ${repoRoot}`,
          ``,
        ].join("\n");

        const p = await writeArtifact(repoRoot, "escalations", filename, content);

        // eslint-disable-next-line no-console
        console.log(`\n✅ Wrote ${p}`);
        // eslint-disable-next-line no-console
        console.log(`\n${"─".repeat(60)}`);
        // eslint-disable-next-line no-console
        console.log(`\n📋 PROMPT ZUM KOPIEREN:\n`);
        // eslint-disable-next-line no-console
        console.log(prompt);
        // eslint-disable-next-line no-console
        console.log(`\n${"─".repeat(60)}`);
        // eslint-disable-next-line no-console
        console.log(`\n💡 Tipp: Füge diesen Prompt in ChatGPT/Claude/GPT-5 ein.\n`);
      }
    );
}
