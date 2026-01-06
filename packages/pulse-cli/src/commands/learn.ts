import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { ensurePulseDirs, timestampId } from "../lib/artifacts.js";
import { promptText, promptConfirm } from "../lib/input.js";
import { findRepoRoot, pulseDir } from "../lib/paths.js";

export function registerLearnCommand(program: Command): void {
  program
    .command("learn")
    .description("Gelerntes Wissen speichern (Problem → Lösung → Regel)")
    .option("--problem <text>", "Was war das Problem?")
    .option("--solution <text>", "Was war die Lösung?")
    .option("--rule <text>", "Abgeleitete Regel")
    .option("--reason <text>", "Warum diese Regel?")
    .option("--no-promote", "Nicht nach .cursorrules-Update fragen")
    .action(async (opts: { 
      problem?: string; 
      solution?: string;
      rule?: string; 
      reason?: string; 
      promote?: boolean;
    }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Nicht in einem Git-Repository.");

      await ensurePulseDirs(repoRoot);

      // eslint-disable-next-line no-console
      console.log("\n📚 PULSE Learn\n");

      // Gather information
      const problem = opts.problem ?? (await promptText("Was war das Problem?", ""));
      const solution = opts.solution ?? (await promptText("Was war die Lösung?", ""));
      const rule = opts.rule ?? (await promptText("Abgeleitete Regel (was beachten?)", ""));
      const reason = opts.reason ?? (await promptText("Warum? (optional)", ""));

      const ts = timestampId();
      
      // ════════════════════════════════════════════════════════════════════════
      // Memory-Entry erstellen
      // ════════════════════════════════════════════════════════════════════════
      const entry = [
        `## Learning: ${ts}`,
        ``,
        problem.trim() ? `**Problem:** ${problem.trim()}` : "",
        solution.trim() ? `**Lösung:** ${solution.trim()}` : "",
        rule.trim() ? `**Regel:** ${rule.trim()}` : "",
        reason.trim() ? `**Grund:** ${reason.trim()}` : "",
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
        const header = `# PULSE Memory\n\nGelernte Regeln und Erkenntnisse aus diesem Projekt.\n\n---\n\n`;
        await fs.writeFile(memPath, header, "utf8");
      }
      
      await fs.appendFile(memPath, entry, "utf8");
      // eslint-disable-next-line no-console
      console.log(`✅ Gespeichert: ${memPath}`);

      // ════════════════════════════════════════════════════════════════════════
      // Auto-Promotion zu .cursorrules
      // ════════════════════════════════════════════════════════════════════════
      if (rule.trim() && opts.promote !== false) {
        // eslint-disable-next-line no-console
        console.log(`\n${"─".repeat(50)}`);
        // eslint-disable-next-line no-console
        console.log(`\n📋 Vorschlag für .cursorrules:\n`);
        
        const cursorrulesSnippet = formatCursorrulesSnippet(rule, reason, problem);
        // eslint-disable-next-line no-console
        console.log(cursorrulesSnippet);
        
        const doPromote = await promptConfirm("\nIn .cursorrules übernehmen?", true);
        
        if (doPromote) {
          const cursorrulesPath = path.join(repoRoot, ".cursorrules");
          await appendToCursorrules(cursorrulesPath, cursorrulesSnippet);
          // eslint-disable-next-line no-console
          console.log(`\n✅ Zu .cursorrules hinzugefügt!`);
        } else {
          // eslint-disable-next-line no-console
          console.log(`\nℹ️ Nicht übernommen. Du kannst es später manuell hinzufügen.`);
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
  lines.push(`# │ GELERNTE REGEL                                                             │`);
  lines.push(`# └────────────────────────────────────────────────────────────────────────────┘`);
  lines.push(`#`);
  lines.push(`# ${rule.trim()}`);
  
  if (reason.trim()) {
    lines.push(`#`);
    lines.push(`# Grund: ${reason.trim()}`);
  }
  
  if (problem.trim()) {
    lines.push(`#`);
    lines.push(`# Kontext: ${problem.trim()}`);
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
  
  // Check if there's already a "GELERNTE REGEL" section
  const hasLearnedSection = content.includes("# GELERNTE REGEL");
  
  if (hasLearnedSection) {
    // Append to existing section (before the last closing block if possible)
    content = content.trimEnd() + "\n\n" + snippet + "\n";
  } else {
    // Add at the end
    content = content.trimEnd() + "\n\n" + snippet + "\n";
  }
  
  await fs.writeFile(filepath, content, "utf8");
}
