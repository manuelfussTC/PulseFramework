import type { Command } from "commander";
import { loadState, timestampId, writeArtifact } from "../lib/artifacts.js";
import { loadConfig } from "../lib/config.js";
import { findRepoRoot } from "../lib/paths.js";
import {
  gitDiffStat,
  gitDiffText,
  gitDiffNumstat,
  gitDiffNameStatus,
  gitLogOneline,
  gitStatusPorcelain,
} from "../lib/git.js";
import { scanDiff, detectLoopSignals } from "../lib/scanner.js";
import { exec } from "../lib/exec.js";
import {
  calculateScopeCheck,
  calculateRiskSummary,
  calculateTimeSummary,
  generateRecommendation,
  renderBriefing,
  type DecisionBriefing,
} from "../lib/briefing.js";

export function registerReviewCommand(program: Command): void {
  program
    .command("review")
    .alias("r")
    .description("Review v2: Decision Briefing with automatic aggregation")
    .option("--staged", "Staged diff instead of working tree")
    .option("--full", "Full checklist in addition to briefing")
    .option("--json", "Output as JSON")
    .action(async (opts: { staged?: boolean; full?: boolean; json?: boolean }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not in a git repository.");

      const [state, config] = await Promise.all([
        loadState(repoRoot),
        loadConfig(repoRoot),
      ]);

      // Gather all data in parallel
      const [status, log, diffText, diffStat, diffNumstat, diffNameStatus, logWithFiles] =
        await Promise.all([
          gitStatusPorcelain(repoRoot),
          gitLogOneline(repoRoot, 15),
          gitDiffText(repoRoot, { staged: opts.staged }),
          gitDiffStat(repoRoot, { staged: opts.staged }),
          gitDiffNumstat(repoRoot, { staged: opts.staged }),
          gitDiffNameStatus(repoRoot, { staged: opts.staged }),
          exec("git", ["log", "--name-only", "--oneline", "-15"], { cwd: repoRoot }).then(
            (r) => r.stdout
          ),
        ]);

      // Run scanner
      const scanResult = scanDiff(config, { diffText, diffStat, diffNumstat, diffNameStatus });

      // Add loop signals to findings
      const loopSignals = detectLoopSignals(log, logWithFiles);
      for (const signal of loopSignals) {
        scanResult.findings.push({
          severity: signal.severity,
          code: "LOOP_SIGNAL",
          message: signal.message,
          details: signal.details,
        });
      }

      // Calculate briefing components
      const scope = calculateScopeCheck(config, scanResult.stats);
      const risk = calculateRiskSummary(scanResult);
      const time = calculateTimeSummary(
        state.lastCheckpointAt,
        config.checkpointReminderMinutes ?? 30
      );
      const recommendation = generateRecommendation(scope, risk, time);

      const briefing: DecisionBriefing = {
        preset: config.preset ?? null,
        profile: state.profile,
        scope,
        risk,
        time,
        recommendation,
      };

      // JSON output
      if (opts.json) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(briefing, null, 2));
        return;
      }

      // Render briefing
      // eslint-disable-next-line no-console
      console.log("\n" + renderBriefing(briefing) + "\n");

      // Save artifact
      const ts = timestampId();
      const filename = `${ts}-review.md`;

      const artifactLines: string[] = [
        `# Review Pulse (${ts})`,
        ``,
        `## Decision Briefing`,
        ``,
        `- Preset: **${config.preset ?? "custom"}**`,
        `- Profile: **${state.profile}**`,
        `- Scope: **${opts.staged ? "staged" : "working tree"}**`,
        ``,
        `### Scope-Check`,
        ``,
        `| Metric | Current | Limit | Status |`,
        `|--------|---------|-------|--------|`,
        `| Files | ${scope.files.current} | ${scope.files.max} | ${scope.files.percent}% |`,
        `| Lines | ${scope.lines.current} | ${scope.lines.max} | ${scope.lines.percent}% |`,
        `| Deletes | ${scope.deletes.current} | ${scope.deletes.max} | ${scope.deletes.percent}% |`,
        ``,
        `### Risk Summary`,
        ``,
        `- Critical: ${risk.criticalCount}`,
        `- Warnings: ${risk.warningCount}`,
        `- Loop Risk: ${risk.loopRisk}`,
        `- Checkpoint: ${time.minutesSinceCheckpoint ?? "n/a"} min`,
        ``,
        `### Recommendation`,
        ``,
        `**${recommendation.action.toUpperCase()}**: ${recommendation.reason}`,
        recommendation.command ? `\n→ \`${recommendation.command}\`` : "",
        ``,
      ];

      // Add findings if any
      if (scanResult.findings.length > 0) {
        artifactLines.push(`### Findings`, ``);
        for (const f of scanResult.findings) {
          const emoji = f.severity === "critical" ? "🚨" : "⚠️";
          artifactLines.push(`- ${emoji} **${f.code}**: ${f.message}`);
        }
        artifactLines.push(``);
      }

      // Add full checklist if requested
      if (opts.full) {
        artifactLines.push(
          `---`,
          ``,
          `## Full Checklist`,
          ``,
          `### Git Context`,
          ``,
          `**Status:**`,
          "```",
          status || "(clean)",
          "```",
          ``,
          `**Recent Commits:**`,
          "```",
          log || "(none)",
          "```",
          ``,
          `**Diff Stat:**`,
          "```",
          diffStat || "(no changes)",
          "```",
          ``,
          `### Code Quality`,
          `- [ ] Do I understand the code? (If no: STOP)`,
          `- [ ] Naming OK?`,
          `- [ ] Error handling present?`,
          `- [ ] Edge cases considered?`,
          ``,
          `### Functionality`,
          `- [ ] Works as required?`,
          `- [ ] Tested locally?`,
          `- [ ] Invalid input handling OK?`,
          ``,
          `### Security`,
          `- [ ] No hardcoded secrets?`,
          `- [ ] Input validation?`,
          `- [ ] AuthZ/AuthN impact understood?`,
          ``,
          `### Git History`,
          `- [ ] Commit messages clear?`,
          `- [ ] Changes traceable?`,
          ``,
          `### Red Flags`,
          `- [ ] Code I don't understand`,
          `- [ ] Hundreds of lines in one commit`,
          `- [ ] Unknown dependencies`,
          `- [ ] Deleted files without confirmation`,
          ``,
          `## Decision`,
          ``,
          `- [ ] ✅ Approve`,
          `- [ ] ❌ Reject`,
          `- [ ] 🚨 Escalate`,
          ``,
          `**Notes:**`,
          ``,
        );
      }

      const content = artifactLines.filter((l) => l !== "").join("\n");
      const p = await writeArtifact(repoRoot, "reviews", filename, content);

      // eslint-disable-next-line no-console
      console.log(`✅ Saved: ${p}`);

      // Show recommendation action
      if (recommendation.command) {
        // eslint-disable-next-line no-console
        console.log(`\n💡 Recommended next step:`);
        // eslint-disable-next-line no-console
        console.log(`   → ${recommendation.command}\n`);
      }
    });
}
