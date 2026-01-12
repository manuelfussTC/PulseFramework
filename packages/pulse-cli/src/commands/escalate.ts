import fs from "node:fs/promises";
import type { Command } from "commander";
import { timestampId, writeArtifact } from "../lib/artifacts.js";
import { promptText, promptConfirm } from "../lib/input.js";
import { findRepoRoot } from "../lib/paths.js";
import { gitDiffStat, gitDiffText, gitDiffNameStatus, gitLogOneline } from "../lib/git.js";
import { renderEscalationPrompt } from "../lib/prompts.js";
import { copyAndNotify } from "../lib/clipboard.js";
import {
  exportFiles,
  autoDetectFiles,
  renderContextExportXml,
} from "../lib/context-export.js";

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
    .alias("e")
    .description("Create escalation: Prepare problem for external model (GPT-5/Claude/Opus)")
    .option("--problem <text>", "What is the problem?")
    .option("--tried <text>", "What has Cursor tried already?")
    .option("--error <text>", "Error message / logs")
    .option("--error-file <path>", "Path to log file")
    .option("--code <text>", "Relevant code")
    .option("--code-file <path>", "Path to code file")
    .option("--question <text>", "Your specific question")
    .option("--detailed", "Include full diff (not just summary)")
    .option("-C, --clipboard", "Copy prompt to clipboard")
    .option("--include <patterns...>", "Include files (glob patterns)")
    .option("--auto-include", "Automatically include relevant files from git diff")
    .action(async (opts) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not in a git repository.");

      // eslint-disable-next-line no-console
      console.log("\n🚨 PULSE Escalation\n");
      // eslint-disable-next-line no-console
      console.log("Creating escalation package for external reasoning model (GPT-5/Claude/Opus)\n");

      // ══════════════════════════════════════════════════════════════════════
      // Collect information (interactive if not via flag)
      // ══════════════════════════════════════════════════════════════════════

      const cursorExplanation =
        opts.problem ??
        opts.tried ??
        (await promptText(
          "What is the problem? (What did Cursor try, where is it stuck?)",
          ""
        ));

      // Versuche sammeln
      const attempts: string[] = [];
      if (opts.tried) {
        attempts.push(opts.tried);
      } else {
        // eslint-disable-next-line no-console
        console.log("\nWhat has Cursor tried already? (Enter to finish)\n");

        for (let i = 1; i <= 5; i++) {
          const attempt = await promptText(`  Attempt ${i}`, "");
          if (!attempt.trim()) break;
          attempts.push(attempt);
        }
      }

      // Error
      const errorText =
        opts.error ??
        (opts.errorFile
          ? await readOptionalFile(opts.errorFile)
          : await promptText("Error message / logs (optional)", ""));

      // Code (legacy option)
      let codeSnippets =
        opts.code ??
        (opts.codeFile ? await readOptionalFile(opts.codeFile) : "");

      // Frage
      const question =
        opts.question ??
        (await promptText(
          "Your specific question",
          "What is the root cause and how do I solve it?"
        ));

      // ══════════════════════════════════════════════════════════════════════
      // Git-Kontext sammeln
      // ══════════════════════════════════════════════════════════════════════
      // eslint-disable-next-line no-console
      console.log("\n📊 Collecting Git context...");

      const [log, stat, diff, nameStatus] = await Promise.all([
        gitLogOneline(repoRoot, 10),
        gitDiffStat(repoRoot),
        opts.detailed ? gitDiffText(repoRoot, { maxLines: 300 }) : Promise.resolve(""),
        gitDiffNameStatus(repoRoot),
      ]);

      // ══════════════════════════════════════════════════════════════════════
      // Kontext-Export (Dateien inkludieren)
      // ══════════════════════════════════════════════════════════════════════
      let contextExportXml = "";

      if (opts.include && opts.include.length > 0) {
        // eslint-disable-next-line no-console
        console.log(`📁 Exporting files: ${opts.include.join(", ")}`);
        
        const ctx = await exportFiles(repoRoot, opts.include);
        contextExportXml = renderContextExportXml(ctx);
        
        // eslint-disable-next-line no-console
        console.log(`   → ${ctx.totalFiles} files, ~${ctx.totalLines} lines`);
        if (ctx.truncated) {
          // eslint-disable-next-line no-console
          console.log(`   ⚠️ Truncated (limit reached)`);
        }
      } else if (opts.autoInclude) {
        // eslint-disable-next-line no-console
        console.log("📁 Auto-detecting relevant files...");
        
        const files = await autoDetectFiles(repoRoot, nameStatus);
        
        if (files.length > 0) {
          // eslint-disable-next-line no-console
          console.log(`   Found: ${files.join(", ")}`);
          
          const doInclude = await promptConfirm(`Include these ${files.length} files?`, true);
          
          if (doInclude) {
            const ctx = await exportFiles(repoRoot, files);
            contextExportXml = renderContextExportXml(ctx);
            
            // eslint-disable-next-line no-console
            console.log(`   → ${ctx.totalFiles} files, ~${ctx.totalLines} lines`);
          }
        } else {
          // eslint-disable-next-line no-console
          console.log("   No relevant files found.");
        }
      } else if (!codeSnippets && !opts.code && !opts.codeFile) {
        // Ask if user wants to include files
        const wantInclude = await promptConfirm("Do you want to include files?", false);
        
        if (wantInclude) {
          const files = await autoDetectFiles(repoRoot, nameStatus);
          
          if (files.length > 0) {
            // eslint-disable-next-line no-console
            console.log(`   Auto-detected: ${files.join(", ")}`);
            
            const useAuto = await promptConfirm("Use these files?", true);
            
            if (useAuto) {
              const ctx = await exportFiles(repoRoot, files);
              contextExportXml = renderContextExportXml(ctx);
              // eslint-disable-next-line no-console
              console.log(`   → ${ctx.totalFiles} files, ~${ctx.totalLines} lines`);
            } else {
              const pattern = await promptText("Enter glob pattern (e.g. src/**/*.ts)", "");
              if (pattern) {
                const ctx = await exportFiles(repoRoot, [pattern]);
                contextExportXml = renderContextExportXml(ctx);
                // eslint-disable-next-line no-console
                console.log(`   → ${ctx.totalFiles} files, ~${ctx.totalLines} lines`);
              }
            }
          }
        }
      }

      // Merge context export with code snippets
      if (contextExportXml) {
        codeSnippets = contextExportXml + (codeSnippets ? `\n\n${codeSnippets}` : "");
      }

      // ══════════════════════════════════════════════════════════════════════
      // Eskalations-Prompt generieren
      // ══════════════════════════════════════════════════════════════════════
      const prompt = renderEscalationPrompt({
        cursorExplanation,
        errorText,
        gitLog: log,
        gitDiff: opts.detailed ? diff : stat,
        question,
        codeSnippets: codeSnippets || undefined,
        attempts: attempts.length > 0 ? attempts : undefined,
      });

      // ══════════════════════════════════════════════════════════════════════
      // Save
      // ══════════════════════════════════════════════════════════════════════
      const ts = timestampId();
      const filename = `${ts}-escalate.md`;
      const content = [
        `# Escalation (${ts})`,
        ``,
        `## Instructions`,
        ``,
        `1. **Copy** the prompt below`,
        `2. **Paste** into ChatGPT, Claude, GPT-5 or Opus`,
        `3. **Read** the analysis and step-by-step instructions`,
        `4. **Pass** instructions to Cursor (DO NOT blindly copy code!)`,
        ``,
        `---`,
        ``,
        `## Prompt`,
        ``,
        "```",
        prompt,
        "```",
        ``,
        `---`,
        ``,
        `## Metadata`,
        `- Created: ${new Date().toISOString()}`,
        `- Attempts documented: ${attempts.length}`,
        `- Git context: ${log ? "✅" : "❌"}`,
        `- Files included: ${contextExportXml ? "✅" : "❌"}`,
        ``,
      ].join("\n");

      const p = await writeArtifact(repoRoot, "escalations", filename, content);

      // ══════════════════════════════════════════════════════════════════════
      // Output
      // ══════════════════════════════════════════════════════════════════════
      // eslint-disable-next-line no-console
      console.log(`\n✅ Saved: ${p}`);

      // Clipboard
      if (opts.clipboard) {
        const clipboardMsg = await copyAndNotify(prompt);
        // eslint-disable-next-line no-console
        console.log(clipboardMsg);
      }

      // eslint-disable-next-line no-console
      console.log(`\n${"═".repeat(60)}`);
      // eslint-disable-next-line no-console
      console.log(`\n📋 ESCALATION PROMPT${opts.clipboard ? " (copied)" : ""}:\n`);
      // eslint-disable-next-line no-console
      console.log(prompt);
      // eslint-disable-next-line no-console
      console.log(`\n${"═".repeat(60)}`);
      // eslint-disable-next-line no-console
      console.log(`\n💡 Tip: The answer contains step-by-step instructions for Cursor.\n`);
    });
}
