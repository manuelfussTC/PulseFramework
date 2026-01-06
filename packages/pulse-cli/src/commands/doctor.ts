import type { Command } from "commander";
import { loadConfig } from "../lib/config.js";
import { loadState } from "../lib/artifacts.js";
import { exec } from "../lib/exec.js";
import { findRepoRoot } from "../lib/paths.js";
import {
  gitDiffNameStatus,
  gitDiffNumstat,
  gitDiffStat,
  gitDiffText,
  gitLogOneline,
} from "../lib/git.js";
import { scanDiff, detectLoopSignals } from "../lib/scanner.js";
import {
  calculateScopeCheck,
  calculateRiskSummary,
  calculateTimeSummary,
  generateRecommendation,
} from "../lib/briefing.js";

type HookName = "pre-commit" | "pre-push" | "none";

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .alias("d")
    .description("Safeguards + Red Flags prüfen (Secrets, Deletes, Loops, Scope)")
    .option("--staged", "Scan staged diff")
    .option("--ci", "CI mode: quieter output + exit codes")
    .option("--hook <name>", "Hook mode: pre-commit | pre-push", "none")
    .option("--loop", "Include loop-detection hints (heuristics)")
    .option("--confirm-delete", "Explicitly confirm deletes (for this run)")
    .option("--allow-push", "Explicitly allow push (for this run)")
    .action(
      async (opts: {
        staged?: boolean;
        ci?: boolean;
        hook?: HookName;
        loop?: boolean;
        confirmDelete?: boolean;
        allowPush?: boolean;
      }) => {
        const repoRoot = await findRepoRoot(process.cwd());
        if (!repoRoot) throw new Error("Nicht in einem Git-Repository.");

        const [config, state] = await Promise.all([loadConfig(repoRoot), loadState(repoRoot)]);
        const hook = (opts.hook ?? "none") as HookName;

        // Safeguard: Push gate (hook-only)
        if (hook === "pre-push") {
          const allowed = opts.allowPush || process.env.PULSE_ALLOW_PUSH === "1";
          if (!allowed) {
            print(
              opts.ci,
              `PULSE safeguard: push blocked. Set PULSE_ALLOW_PUSH=1 for an explicit push.`,
              ""
            );
            process.exit(2);
          }
        }

        const staged = Boolean(opts.staged) || hook === "pre-commit";

        const [diffText, diffStat, diffNumstat, diffNameStatus] = await Promise.all([
          gitDiffText(repoRoot, { staged }),
          gitDiffStat(repoRoot, { staged }),
          gitDiffNumstat(repoRoot, { staged }),
          gitDiffNameStatus(repoRoot, { staged }),
        ]);

        const scan = scanDiff(config, { diffText, diffStat, diffNumstat, diffNameStatus });

        // Mixed enforcement: deletes are critical only if not explicitly confirmed
        const hasDeleteFinding = scan.findings.some(
          (f) => f.code === "MASS_DELETE" && f.message.includes("File deletion")
        );
        const deleteConfirmed =
          Boolean(opts.confirmDelete) || process.env.PULSE_CONFIRM_DELETE === "1";
        if (hasDeleteFinding && deleteConfirmed) {
          scan.findings = scan.findings.map((f) =>
            f.code === "MASS_DELETE" && f.message.includes("File deletion")
              ? { ...f, severity: "warn", message: `${f.message} (confirmed)` }
              : f
          );
        }

        // Optional loop heuristics
        if (opts.loop) {
          const log = await gitLogOneline(repoRoot, 15);
          const logWithFiles = await exec("git", ["log", "--name-only", "--oneline", "-15"], {
            cwd: repoRoot,
          });

          const loopSignals = detectLoopSignals(log, logWithFiles.stdout);
          for (const signal of loopSignals) {
            scan.findings.push({
              severity: signal.severity,
              code: "LOOP_SIGNAL",
              message: signal.message,
              details: signal.details,
            });
          }
        }

        // ════════════════════════════════════════════════════════════════════════
        // Preset-Verletzungen explizit hinzufügen
        // ════════════════════════════════════════════════════════════════════════
        const scope = calculateScopeCheck(config, scan.stats);
        if (scope.exceeded) {
          const presetName = config.preset ?? "custom";
          for (const field of scope.exceededFields) {
            const current =
              field === "files"
                ? scope.files.current
                : field === "lines"
                  ? scope.lines.current
                  : scope.deletes.current;
            const max =
              field === "files"
                ? scope.files.max
                : field === "lines"
                  ? scope.lines.max
                  : scope.deletes.max;

            scan.findings.push({
              severity: "warn",
              code: "BIG_CHANGESET",
              message: `Preset-Limit überschritten (${presetName}): ${field} ${current}/${max}`,
            });
          }
        }

        // Output
        const critical = scan.findings.filter((f) => f.severity === "critical");
        const warnings = scan.findings.filter((f) => f.severity === "warn");

        // Calculate recommendation
        const risk = calculateRiskSummary(scan);
        const time = calculateTimeSummary(
          state.lastCheckpointAt,
          config.checkpointReminderMinutes ?? 30
        );
        const recommendation = generateRecommendation(scope, risk, time);

        if (!opts.ci) {
          const presetProfile = config.preset
            ? `${config.preset}/${state.profile}`
            : state.profile;

          // eslint-disable-next-line no-console
          console.log(`\n🔍 Pulse Doctor (${staged ? "staged" : "working tree"})\n`);
          // eslint-disable-next-line no-console
          console.log(`Profil: ${presetProfile}`);
          // eslint-disable-next-line no-console
          console.log(
            `Scope: ${scan.stats.filesChanged} files | +${scan.stats.linesAdded} -${scan.stats.linesDeleted} lines`
          );

          // Scope progress
          if (scan.stats.filesChanged > 0) {
            // eslint-disable-next-line no-console
            console.log(
              `Limits (${config.preset ?? "custom"}): Files ${scope.files.percent}%, Lines ${scope.lines.percent}%`
            );
          }

          // eslint-disable-next-line no-console
          console.log(`\nDiff stat:\n${diffStat || "(no changes)"}`);
          // eslint-disable-next-line no-console
          console.log("");
          printFindings(scan.findings);
          // eslint-disable-next-line no-console
          console.log("");

          // ══════════════════════════════════════════════════════════════════════
          // Empfehlung anzeigen
          // ══════════════════════════════════════════════════════════════════════
          const actionEmoji = {
            approve: "✅",
            checkpoint: "⏱️",
            escalate: "🚨",
            stop: "🛑",
          }[recommendation.action];

          // eslint-disable-next-line no-console
          console.log(`${actionEmoji} EMPFEHLUNG: ${recommendation.action.toUpperCase()}`);
          // eslint-disable-next-line no-console
          console.log(`   → ${recommendation.reason}`);
          if (recommendation.command) {
            // eslint-disable-next-line no-console
            console.log(`   → ${recommendation.command}`);
          }
          // eslint-disable-next-line no-console
          console.log("");
        } else {
          printFindings(scan.findings);
        }

        if (critical.length) process.exit(2);
        if (warnings.length) process.exit(1);
        process.exit(0);
      }
    );
}

function print(ci: boolean | undefined, msg: string, details: string) {
  if (!ci) {
    // eslint-disable-next-line no-console
    console.error(msg);
    if (details) {
      // eslint-disable-next-line no-console
      console.error(details);
    }
  } else {
    // eslint-disable-next-line no-console
    console.log(msg);
  }
}

function printFindings(
  findings: { severity: string; code: string; message: string; details?: string }[]
) {
  if (!findings.length) {
    // eslint-disable-next-line no-console
    console.log("✅ Keine Findings");
    return;
  }
  for (const f of findings) {
    const emoji = f.severity === "critical" ? "🚨" : "⚠️";
    // eslint-disable-next-line no-console
    console.log(`${emoji} ${f.code}: ${f.message}`);
    if (f.details) {
      // eslint-disable-next-line no-console
      console.log(
        f.details
          .split("\n")
          .map((l) => `   ${l}`)
          .join("\n")
      );
    }
  }
}
