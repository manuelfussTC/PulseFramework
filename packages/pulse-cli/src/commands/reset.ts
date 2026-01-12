import type { Command } from "commander";
import { findRepoRoot } from "../lib/paths.js";
import { promptConfirm, promptSelect } from "../lib/input.js";
import { exec } from "../lib/exec.js";
import { gitLogOneline, gitCurrentBranch } from "../lib/git.js";

export function registerResetCommand(program: Command): void {
  program
    .command("reset")
    .description("Safe Git reset with safeguards (for loop recovery)")
    .option("-n, --commits <n>", "Number of commits to reset (default: 1)", "1")
    .option("--soft", "Soft reset (changes remain staged)")
    .option("--hard", "Hard reset (changes are DISCARDED)")
    .option("-y, --yes", "Do not ask for confirmation")
    .action(async (opts: {
      commits?: string;
      soft?: boolean;
      hard?: boolean;
      yes?: boolean;
    }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not in a git repository.");

      const numCommits = Math.max(1, Math.min(10, parseInt(opts.commits ?? "1", 10)));
      const branch = await gitCurrentBranch(repoRoot);

      // eslint-disable-next-line no-console
      console.log("\n🔄 PULSE Reset\n");

      // ══════════════════════════════════════════════════════════════════════
      // Safeguard: Not on main/master without explicit confirmation
      // ══════════════════════════════════════════════════════════════════════
      const protectedBranches = ["main", "master", "develop", "production"];
      if (protectedBranches.includes(branch.toLowerCase())) {
        // eslint-disable-next-line no-console
        console.log(`⚠️  WARNING: You are on '${branch}' (protected branch)!\n`);
        
        if (!opts.yes) {
          const confirm = await promptConfirm(
            `Really reset on '${branch}'? (not recommended)`,
            false
          );
          if (!confirm) {
            // eslint-disable-next-line no-console
            console.log("❌ Aborted.\n");
            return;
          }
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // Zeige betroffene Commits
      // ══════════════════════════════════════════════════════════════════════
      const recentLog = await gitLogOneline(repoRoot, numCommits + 2);
      const logLines = recentLog.split("\n").filter((l) => l.trim());
      
      // eslint-disable-next-line no-console
      console.log(`📍 Branch: ${branch}`);
      // eslint-disable-next-line no-console
      console.log(`📋 Affected commits (${numCommits}):\n`);
      
      for (let i = 0; i < Math.min(numCommits, logLines.length); i++) {
        // eslint-disable-next-line no-console
        console.log(`   🗑️  ${logLines[i]}`);
      }
      
      if (logLines.length > numCommits) {
        // eslint-disable-next-line no-console
        console.log(`\n   ✅ New HEAD: ${logLines[numCommits]}`);
      }
      // eslint-disable-next-line no-console
      console.log("");

      // ══════════════════════════════════════════════════════════════════════
      // Reset-Modus wählen
      // ══════════════════════════════════════════════════════════════════════
      let mode: "soft" | "mixed" | "hard" = "mixed";
      
      if (opts.soft) {
        mode = "soft";
      } else if (opts.hard) {
        mode = "hard";
      } else if (!opts.yes) {
        const choices = [
          { value: "mixed", label: "🔄 Mixed (default) - changes remain unstaged" },
          { value: "soft", label: "📝 Soft - changes remain staged" },
          { value: "hard", label: "🗑️ Hard - changes are DISCARDED" },
        ];
        mode = await promptSelect("Reset mode", choices, "mixed") as "soft" | "mixed" | "hard";
      }

      // ══════════════════════════════════════════════════════════════════════
      // Letzte Bestätigung bei Hard Reset
      // ══════════════════════════════════════════════════════════════════════
      if (mode === "hard" && !opts.yes) {
        // eslint-disable-next-line no-console
        console.log("\n⚠️  HARD RESET: All uncommitted changes will be lost!\n");
        
        const confirm = await promptConfirm("Really continue?", false);
        if (!confirm) {
          // eslint-disable-next-line no-console
          console.log("❌ Aborted.\n");
          return;
        }
      }

      // ══════════════════════════════════════════════════════════════════════
      // Git Reset ausführen
      // ══════════════════════════════════════════════════════════════════════
      const resetArg = `HEAD~${numCommits}`;
      const modeArg = mode === "mixed" ? "" : `--${mode}`;
      
      const args = ["reset", modeArg, resetArg].filter(Boolean);
      
      // eslint-disable-next-line no-console
      console.log(`\n🔧 Running: git ${args.join(" ")}\n`);
      
      const result = await exec("git", args, { cwd: repoRoot });
      
      if (result.exitCode !== 0) {
        // eslint-disable-next-line no-console
        console.error(`❌ Git reset failed:\n${result.stderr}`);
        process.exit(1);
      }

      // ══════════════════════════════════════════════════════════════════════
      // Erfolgsmeldung
      // ══════════════════════════════════════════════════════════════════════
      const newLog = await gitLogOneline(repoRoot, 1);
      
      // eslint-disable-next-line no-console
      console.log(`✅ Reset successful!`);
      // eslint-disable-next-line no-console
      console.log(`📍 New HEAD: ${newLog}\n`);

      // Hinweise
      if (mode === "soft" || mode === "mixed") {
        // eslint-disable-next-line no-console
        console.log(`💡 Tip: Changes are still there.`);
        // eslint-disable-next-line no-console
        console.log(`   → git status       - Show changes`);
        // eslint-disable-next-line no-console
        console.log(`   → git stash        - Stash temporarily`);
        // eslint-disable-next-line no-console
        console.log(`   → git checkout .   - Discard\n`);
      }

      // eslint-disable-next-line no-console
      console.log(`💡 Next step:`);
      // eslint-disable-next-line no-console
      console.log(`   → pulse start      - Start new approach`);
      // eslint-disable-next-line no-console
      console.log(`   → pulse escalate   - Escalate problem\n`);
    });
}
