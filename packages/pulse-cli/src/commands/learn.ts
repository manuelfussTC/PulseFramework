import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { ensurePulseDirs, timestampId } from "../lib/artifacts.js";
import { promptText, promptConfirm } from "../lib/input.js";
import { findRepoRoot, pulseDir } from "../lib/paths.js";

export function registerLearnCommand(program: Command): void {
  program
    .command("learn")
    .description("Save learned knowledge (Problem → Solution → Rule)")
    .option("--problem <text>", "What was the problem?")
    .option("--solution <text>", "What was the solution?")
    .option("--rule <text>", "Derived rule")
    .option("--reason <text>", "Why this rule?")
    .option("--no-promote", "Do not ask to update .cursorrules")
    .action(async (opts: { 
      problem?: string; 
      solution?: string;
      rule?: string; 
      reason?: string; 
      promote?: boolean;
    }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not in a git repository.");

      await ensurePulseDirs(repoRoot);

      // eslint-disable-next-line no-console
      console.log("\n📚 PULSE Learn\n");

      // Gather information
      // If --no-promote is set, skip interactive prompts (non-interactive mode)
      const isInteractive = opts.promote !== false;
      
      const problem = opts.problem ?? (isInteractive ? await promptText("What was the problem?", "") : "");
      const solution = opts.solution ?? (isInteractive ? await promptText("What was the solution?", "") : "");
      const rule = opts.rule ?? (isInteractive ? await promptText("Derived rule (what to observe?)", "") : "");
      const reason = opts.reason ?? (isInteractive ? await promptText("Why? (optional)", "") : "");

      const ts = timestampId();
      
      // ════════════════════════════════════════════════════════════════════════
      // Create memory entry
      // ════════════════════════════════════════════════════════════════════════
      const entry = [
        `## Learning: ${ts}`,
        ``,
        problem.trim() ? `**Problem:** ${problem.trim()}` : "",
        solution.trim() ? `**Solution:** ${solution.trim()}` : "",
        rule.trim() ? `**Rule:** ${rule.trim()}` : "",
        reason.trim() ? `**Reason:** ${reason.trim()}` : "",
        ``,
        `---`,
        ``,
      ]
        .filter((l) => l !== "")
        .join("\n");

      const memPath = path.join(pulseDir(repoRoot), "memory.md");
      
      // Create file with header if doesn't exist
      try {
        await fs.access(memPath);
      } catch {
        const header = `# PULSE Memory\n\nLearned rules and insights from this project.\n\n---\n\n`;
        await fs.writeFile(memPath, header, "utf8");
      }
      
      await fs.appendFile(memPath, entry, "utf8");
      // eslint-disable-next-line no-console
      console.log(`✅ Saved: ${memPath}`);

      // ════════════════════════════════════════════════════════════════════════
      // Auto-Promotion zu .cursorrules
      // ════════════════════════════════════════════════════════════════════════
      if (rule.trim() && opts.promote !== false) {
        // eslint-disable-next-line no-console
        console.log(`\n${"─".repeat(50)}`);
        // eslint-disable-next-line no-console
        console.log(`\n📋 Proposal for .cursorrules:\n`);
        
        const cursorrulesSnippet = formatCursorrulesSnippet(rule, reason, problem);
        // eslint-disable-next-line no-console
        console.log(cursorrulesSnippet);
        
        const doPromote = await promptConfirm("\nAdd to .cursorrules?", true);
        
        if (doPromote) {
          const cursorrulesPath = path.join(repoRoot, ".cursorrules");
          await appendToCursorrules(cursorrulesPath, cursorrulesSnippet);
          // eslint-disable-next-line no-console
          console.log(`\n✅ Added to .cursorrules!`);
        } else {
          // eslint-disable-next-line no-console
          console.log(`\nℹ️ Not added. You can add it manually later.`);
        }
      }

      // eslint-disable-next-line no-console
      console.log("");
    });
}

/**
 * Format a rule for .cursorrules
 */
function formatCursorrulesSnippet(rule: string, reason: string, problem: string): string {
  const lines: string[] = [];
  
  lines.push(`# ┌────────────────────────────────────────────────────────────────────────────┐`);
  lines.push(`# │ LEARNED RULE                                                               │`);
  lines.push(`# └────────────────────────────────────────────────────────────────────────────┘`);
  lines.push(`#`);
  lines.push(`# ${rule.trim()}`);
  
  if (reason.trim()) {
    lines.push(`#`);
    lines.push(`# Reason: ${reason.trim()}`);
  }
  
  if (problem.trim()) {
    lines.push(`#`);
    lines.push(`# Context: ${problem.trim()}`);
  }
  
  lines.push(`#`);
  
  return lines.join("\n");
}

/**
 * Append snippet to .cursorrules (create if doesn't exist)
 */
async function appendToCursorrules(filepath: string, snippet: string): Promise<void> {
  let content = "";
  
  try {
    content = await fs.readFile(filepath, "utf8");
  } catch {
    // File doesn't exist, create with header
    content = `# ═══════════════════════════════════════════════════════════════════════════════
# PULSE FRAMEWORK - AI Agent Rules
# ═══════════════════════════════════════════════════════════════════════════════

`;
  }
  
  // Check if there's already a "LEARNED RULE" section
  const hasLearnedSection = content.includes("# LEARNED RULE");
  
  if (hasLearnedSection) {
    // Append to existing section (before the last closing block if possible)
    content = content.trimEnd() + "\n\n" + snippet + "\n";
  } else {
    // Add at the end
    content = content.trimEnd() + "\n\n" + snippet + "\n";
  }
  
  await fs.writeFile(filepath, content, "utf8");
}
