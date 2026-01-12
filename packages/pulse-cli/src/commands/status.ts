import type { Command } from "commander";
import { loadState } from "../lib/artifacts.js";
import { loadConfig } from "../lib/config.js";
import { findRepoRoot } from "../lib/paths.js";
import { gitStatusPorcelain, gitLogOneline } from "../lib/git.js";
import { scanDiff, detectLoopSignals } from "../lib/scanner.js";
import { gitDiffText, gitDiffStat, gitDiffNumstat, gitDiffNameStatus } from "../lib/git.js";
import { exec } from "../lib/exec.js";
import {
  calculateScopeCheck,
  calculateRiskSummary,
  calculateTimeSummary,
  generateRecommendation,
  renderProgressBar,
} from "../lib/briefing.js";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Quick overview: Preset/Profile, checkpoint time, changes, findings")
    .option("--json", "Output as JSON")
    .option("-v, --verbose", "Verbose output")
    .option("--share", "Markdown format for Slack/Discord")
    .action(async (opts: { json?: boolean; verbose?: boolean; share?: boolean }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) {
        if (opts.json) {
          // eslint-disable-next-line no-console
          console.log(JSON.stringify({ error: "Not in a git repository" }));
        } else {
          // eslint-disable-next-line no-console
          console.log("❌ Not in a git repository");
        }
        process.exit(1);
      }

      const [state, config, gitStatus] = await Promise.all([
        loadState(repoRoot),
        loadConfig(repoRoot),
        gitStatusPorcelain(repoRoot),
      ]);

      // Calculate time since last checkpoint
      const lastCp = state.lastCheckpointAt ? Date.parse(state.lastCheckpointAt) : null;
      const now = Date.now();
      const minutesSinceCheckpoint =
        lastCp && Number.isFinite(lastCp) ? Math.floor((now - lastCp) / 60000) : null;

      // Count dirty files
      const dirtyFiles = gitStatus
        .split("\n")
        .filter((line) => line.trim().length > 0).length;

      // Scan for findings (if there are changes)
      let findingsCount = 0;
      let criticalCount = 0;
      let warningCount = 0;
      let linesChanged = 0;
      let loopRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
      let recommendation: ReturnType<typeof generateRecommendation> | null = null;

      if (dirtyFiles > 0 || opts.verbose) {
        const [diffText, diffStat, diffNumstat, diffNameStatus, log, logWithFiles] =
          await Promise.all([
            gitDiffText(repoRoot),
            gitDiffStat(repoRoot),
            gitDiffNumstat(repoRoot),
            gitDiffNameStatus(repoRoot),
            gitLogOneline(repoRoot, 15),
            exec("git", ["log", "--name-only", "--oneline", "-15"], { cwd: repoRoot }).then(
              (r) => r.stdout
            ),
          ]);

        const scan = scanDiff(config, { diffText, diffStat, diffNumstat, diffNameStatus });

        // Add loop signals
        const loopSignals = detectLoopSignals(log, logWithFiles);
        for (const signal of loopSignals) {
          scan.findings.push({
            severity: signal.severity,
            code: "LOOP_SIGNAL",
            message: signal.message,
            details: signal.details,
          });
        }

        findingsCount = scan.findings.length;
        criticalCount = scan.findings.filter((f) => f.severity === "critical").length;
        warningCount = scan.findings.filter((f) => f.severity === "warn").length;
        linesChanged = scan.stats.linesAdded + scan.stats.linesDeleted;

        // Calculate risk for verbose/share
        if (opts.verbose || opts.share) {
          const scope = calculateScopeCheck(config, scan.stats);
          const risk = calculateRiskSummary(scan);
          const time = calculateTimeSummary(
            state.lastCheckpointAt,
            config.checkpointReminderMinutes ?? 30
          );
          recommendation = generateRecommendation(scope, risk, time);
          loopRisk = risk.loopRisk;
        }
      }

      // Preset/Profile combo
      const presetProfile = config.preset ? `${config.preset}/${state.profile}` : state.profile;

      // ════════════════════════════════════════════════════════════════════════
      // JSON Output
      // ════════════════════════════════════════════════════════════════════════
      if (opts.json) {
        // eslint-disable-next-line no-console
        console.log(
          JSON.stringify({
            preset: config.preset || null,
            profile: state.profile,
            presetProfile,
            lastCheckpointMinutesAgo: minutesSinceCheckpoint,
            dirtyFiles,
            linesChanged,
            findings: findingsCount,
            criticalFindings: criticalCount,
            warningFindings: warningCount,
            loopRisk,
            recommendation: recommendation?.action || null,
          })
        );
        return;
      }

      // ════════════════════════════════════════════════════════════════════════
      // Share Output (Markdown)
      // ════════════════════════════════════════════════════════════════════════
      if (opts.share) {
        const lines: string[] = [];
        lines.push(`**PULSE Status**`);
        lines.push(``);
        lines.push(`- Profile: \`${presetProfile}\``);
        lines.push(
          `- Checkpoint: ${minutesSinceCheckpoint !== null ? `${minutesSinceCheckpoint} min` : "n/a"}`
        );
        lines.push(`- Files: ${dirtyFiles}`);
        lines.push(`- Lines: ${linesChanged}`);
        lines.push(`- Findings: ${criticalCount} Critical, ${warningCount} Warnings`);
        lines.push(`- Loop risk: ${loopRisk}`);
        if (recommendation) {
          lines.push(``);
          lines.push(`**Recommendation:** ${recommendation.action.toUpperCase()}`);
          lines.push(`> ${recommendation.reason}`);
        }
        // eslint-disable-next-line no-console
        console.log(lines.join("\n"));
        return;
      }

      // ════════════════════════════════════════════════════════════════════════
      // Verbose Output
      // ════════════════════════════════════════════════════════════════════════
      if (opts.verbose) {
        // eslint-disable-next-line no-console
        console.log(`\n📊 PULSE Status\n`);

        // Profile
        const profileEmoji =
          state.profile === "concept" ? "🧠" : state.profile === "build" ? "🔨" : "🚨";
        // eslint-disable-next-line no-console
        console.log(`${profileEmoji} Profile: ${presetProfile}`);

        // Checkpoint
        if (minutesSinceCheckpoint !== null) {
          const cpColor =
            minutesSinceCheckpoint > 30 ? "🔴" : minutesSinceCheckpoint > 15 ? "🟡" : "🟢";
          // eslint-disable-next-line no-console
          console.log(`${cpColor} Checkpoint: ${minutesSinceCheckpoint} min ago`);
        } else {
          // eslint-disable-next-line no-console
          console.log(`⚪ Checkpoint: none yet`);
        }

        // Files & Lines
        // eslint-disable-next-line no-console
        console.log(`📝 Files: ${dirtyFiles}`);
        // eslint-disable-next-line no-console
        console.log(`📏 Lines: ${linesChanged}`);

        // Scope bars
        if (dirtyFiles > 0) {
          const filesPercent = Math.round(
            (dirtyFiles / config.thresholds.warnMaxFilesChanged) * 100
          );
          const linesPercent = Math.round(
            (linesChanged / config.thresholds.warnMaxLinesChanged) * 100
          );
          // eslint-disable-next-line no-console
          console.log(`\n📊 Scope (${config.preset ?? "custom"} Preset):`);
          // eslint-disable-next-line no-console
          console.log(
            `   Files: ${renderProgressBar(filesPercent)} ${filesPercent}% (${dirtyFiles}/${config.thresholds.warnMaxFilesChanged})`
          );
          // eslint-disable-next-line no-console
          console.log(
            `   Lines: ${renderProgressBar(linesPercent)} ${linesPercent}% (${linesChanged}/${config.thresholds.warnMaxLinesChanged})`
          );
        }

        // Findings
        // eslint-disable-next-line no-console
        console.log(`\n🔍 Findings:`);
        if (criticalCount > 0) {
          // eslint-disable-next-line no-console
          console.log(`   🚨 ${criticalCount} Critical`);
        }
        if (warningCount > 0) {
          // eslint-disable-next-line no-console
          console.log(`   ⚠️ ${warningCount} Warnings`);
        }
        if (findingsCount === 0) {
          // eslint-disable-next-line no-console
          console.log(`   ✅ No findings`);
        }

        // Loop Risk
        const loopEmoji = loopRisk === "HIGH" ? "🔴" : loopRisk === "MEDIUM" ? "🟡" : "🟢";
        // eslint-disable-next-line no-console
        console.log(`\n${loopEmoji} Loop risk: ${loopRisk}`);

        // Recommendation
        if (recommendation) {
          // eslint-disable-next-line no-console
          console.log(`\n💡 Recommendation: ${recommendation.action.toUpperCase()}`);
          // eslint-disable-next-line no-console
          console.log(`   → ${recommendation.reason}`);
          if (recommendation.command) {
            // eslint-disable-next-line no-console
            console.log(`   → ${recommendation.command}`);
          }
        }

        // eslint-disable-next-line no-console
        console.log(``);
        return;
      }

      // ════════════════════════════════════════════════════════════════════════
      // Default: One-liner Output
      // ════════════════════════════════════════════════════════════════════════
      const parts: string[] = [];

      // Profile (with preset)
      const profileEmoji =
        state.profile === "concept" ? "🧠" : state.profile === "build" ? "🔨" : "🚨";
      parts.push(`${profileEmoji} ${presetProfile}`);

      // Last checkpoint
      if (minutesSinceCheckpoint !== null) {
        const cpColor =
          minutesSinceCheckpoint > 30 ? "🔴" : minutesSinceCheckpoint > 15 ? "🟡" : "🟢";
        parts.push(`${cpColor} ${minutesSinceCheckpoint}m`);
      } else {
        parts.push("⚪ no cp");
      }

      // Dirty files
      if (dirtyFiles > 0) {
        parts.push(`📝 ${dirtyFiles} files`);
      } else {
        parts.push("✨ clean");
      }

      // Findings
      if (criticalCount > 0) {
        parts.push(`🚨 ${criticalCount} critical`);
      } else if (findingsCount > 0) {
        parts.push(`⚠️ ${findingsCount} warn`);
      } else if (dirtyFiles > 0) {
        parts.push("✅ ok");
      }

      // eslint-disable-next-line no-console
      console.log(parts.join(" | "));

      // Hint if overdue
      if (minutesSinceCheckpoint !== null && minutesSinceCheckpoint > 30 && dirtyFiles > 0) {
        // eslint-disable-next-line no-console
        console.log("\n💡 Tip: `pulse checkpoint` to commit");
      }
    });
}
