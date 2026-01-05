import fs from "node:fs/promises";
import path from "node:path";
import type { Command } from "commander";
import { ensurePulseDirs, timestampId } from "../lib/artifacts.js";
import { promptText } from "../lib/input.js";
import { findRepoRoot, pulseDir } from "../lib/paths.js";

export function registerLearnCommand(program: Command): void {
  program
    .command("learn")
    .description("Append a learned rule/memory (problem solved -> make it persistent).")
    .option("--rule <text>", "The rule to remember")
    .option("--reason <text>", "Why this rule exists")
    .option("--suggest-cursorrules", "Also print a suggested .cursorrules snippet")
    .action(async (opts: { rule?: string; reason?: string; suggestCursorrules?: boolean }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not inside a git repository.");

      await ensurePulseDirs(repoRoot);

      const rule = opts.rule ?? (await promptText("Rule (what should never happen again?)", ""));
      const reason = opts.reason ?? (await promptText("Reason (why)", ""));

      const ts = timestampId();
      const entry = [
        `## ${ts}`,
        ``,
        `- Rule: ${rule.trim() || "(empty)"}`,
        reason.trim() ? `- Reason: ${reason.trim()}` : ``,
        ``,
      ]
        .filter((l) => l !== "")
        .join("\n");

      const memPath = path.join(pulseDir(repoRoot), "memory.md");
      await fs.appendFile(memPath, entry + "\n", "utf8");

      // eslint-disable-next-line no-console
      console.log(`Appended memory to ${memPath}`);

      if (opts.suggestCursorrules) {
        const snippet = [
          "# --- Pulse Memory (suggested) ---",
          `# Rule: ${rule.trim()}`,
          reason.trim() ? `# Reason: ${reason.trim()}` : "# Reason: (add reason)",
          "",
        ].join("\n");
        // eslint-disable-next-line no-console
        console.log("\nSuggested .cursorrules snippet:\n");
        // eslint-disable-next-line no-console
        console.log(snippet);
      }
    });
}

