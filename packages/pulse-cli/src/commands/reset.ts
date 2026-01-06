import type { Command } from "commander";
import { findRepoRoot } from "../lib/paths.js";
import { promptConfirm, promptSelect } from "../lib/input.js";
import { exec } from "../lib/exec.js";
import { gitLogOneline, gitCurrentBranch } from "../lib/git.js";

export function registerResetCommand(program: Command): void {
  program
    .command("reset")
    .description("Sicherer Git-Reset mit Safeguards (für Loop-Recovery)")
    .option("-n, --commits <n>", "Anzahl Commits zurücksetzen (default: 1)", "1")
    .option("--soft", "Soft reset (Änderungen bleiben staged)")
    .option("--hard", "Hard reset (Änderungen werden verworfen)")
    .option("-y, --yes", "Keine Bestätigung abfragen")
    .action(async (opts: {
      commits?: string;
      soft?: boolean;
      hard?: boolean;
      yes?: boolean;
    }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Nicht in einem Git-Repository.");

      const numCommits = Math.max(1, Math.min(10, parseInt(opts.commits ?? "1", 10)));
      const branch = await gitCurrentBranch(repoRoot);

      // eslint-disable-next-line no-console
      console.log("\n🔄 PULSE Reset\n");

      // ══════════════════════════════════════════════════════════════════════
      // Safeguard: Nicht auf main/master ohne explizite Bestätigung
      // ══════════════════════════════════════════════════════════════════════
      const protectedBranches = ["main", "master", "develop", "production"];
      if (protectedBranches.includes(branch.toLowerCase())) {
        // eslint-disable-next-line no-console
        console.log(`⚠️  WARNUNG: Du bist auf '${branch}' (geschützter Branch)!\n`);
        
        if (!opts.yes) {
          const confirm = await promptConfirm(
            `Wirklich auf '${branch}' resetten? (nicht empfohlen)`,
            false
          );
          if (!confirm) {
            // eslint-disable-next-line no-console
            console.log("❌ Abgebrochen.\n");
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
      console.log(`📋 Betroffene Commits (${numCommits}):\n`);
      
      for (let i = 0; i < Math.min(numCommits, logLines.length); i++) {
        // eslint-disable-next-line no-console
        console.log(`   🗑️  ${logLines[i]}`);
      }
      
      if (logLines.length > numCommits) {
        // eslint-disable-next-line no-console
        console.log(`\n   ✅ Neuer HEAD: ${logLines[numCommits]}`);
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
          { value: "mixed", label: "🔄 Mixed (default) - Änderungen bleiben unstaged" },
          { value: "soft", label: "📝 Soft - Änderungen bleiben staged" },
          { value: "hard", label: "🗑️ Hard - Änderungen werden VERWORFEN" },
        ];
        mode = await promptSelect("Reset-Modus", choices, "mixed") as "soft" | "mixed" | "hard";
      }

      // ══════════════════════════════════════════════════════════════════════
      // Letzte Bestätigung bei Hard Reset
      // ══════════════════════════════════════════════════════════════════════
      if (mode === "hard" && !opts.yes) {
        // eslint-disable-next-line no-console
        console.log("\n⚠️  HARD RESET: Alle nicht-committeten Änderungen gehen verloren!\n");
        
        const confirm = await promptConfirm("Wirklich fortfahren?", false);
        if (!confirm) {
          // eslint-disable-next-line no-console
          console.log("❌ Abgebrochen.\n");
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
      console.log(`\n🔧 Führe aus: git ${args.join(" ")}\n`);
      
      const result = await exec("git", args, { cwd: repoRoot });
      
      if (result.exitCode !== 0) {
        // eslint-disable-next-line no-console
        console.error(`❌ Git reset fehlgeschlagen:\n${result.stderr}`);
        process.exit(1);
      }

      // ══════════════════════════════════════════════════════════════════════
      // Erfolgsmeldung
      // ══════════════════════════════════════════════════════════════════════
      const newLog = await gitLogOneline(repoRoot, 1);
      
      // eslint-disable-next-line no-console
      console.log(`✅ Reset erfolgreich!`);
      // eslint-disable-next-line no-console
      console.log(`📍 Neuer HEAD: ${newLog}\n`);

      // Hinweise
      if (mode === "soft" || mode === "mixed") {
        // eslint-disable-next-line no-console
        console.log(`💡 Tipp: Die Änderungen sind noch da.`);
        // eslint-disable-next-line no-console
        console.log(`   → git status       - Änderungen anzeigen`);
        // eslint-disable-next-line no-console
        console.log(`   → git stash        - Temporär speichern`);
        // eslint-disable-next-line no-console
        console.log(`   → git checkout .   - Verwerfen\n`);
      }

      // eslint-disable-next-line no-console
      console.log(`💡 Nächster Schritt:`);
      // eslint-disable-next-line no-console
      console.log(`   → pulse start      - Neuen Ansatz starten`);
      // eslint-disable-next-line no-console
      console.log(`   → pulse escalate   - Problem eskalieren\n`);
    });
}
