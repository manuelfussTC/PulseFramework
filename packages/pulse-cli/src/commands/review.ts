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
    .description("Review v2: Decision Briefing mit automatischer Aggregation")
    .option("--staged", "Staged diff statt working tree")
    .option("--full", "Volle Checkliste zusätzlich zum Briefing")
    .option("--json", "Output als JSON")
    .action(async (opts: { staged?: boolean; full?: boolean; json?: boolean }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Nicht in einem Git-Repository.");

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
        `- Profil: **${state.profile}**`,
        `- Scope: **${opts.staged ? "staged" : "working tree"}**`,
        ``,
        `### Scope-Check`,
        ``,
        `| Metrik | Aktuell | Limit | Status |`,
        `|--------|---------|-------|--------|`,
        `| Files | ${scope.files.current} | ${scope.files.max} | ${scope.files.percent}% |`,
        `| Lines | ${scope.lines.current} | ${scope.lines.max} | ${scope.lines.percent}% |`,
        `| Deletes | ${scope.deletes.current} | ${scope.deletes.max} | ${scope.deletes.percent}% |`,
        ``,
        `### Risiko-Summary`,
        ``,
        `- Critical: ${risk.criticalCount}`,
        `- Warnings: ${risk.warningCount}`,
        `- Loop-Risiko: ${risk.loopRisk}`,
        `- Checkpoint: ${time.minutesSinceCheckpoint ?? "n/a"} Min`,
        ``,
        `### Empfehlung`,
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
          `## Volle Checkliste`,
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
          `- [ ] Verstehe ich den Code? (Wenn nein: STOP)`,
          `- [ ] Naming OK?`,
          `- [ ] Error Handling vorhanden?`,
          `- [ ] Edge Cases berücksichtigt?`,
          ``,
          `### Funktionalität`,
          `- [ ] Funktioniert wie gefordert?`,
          `- [ ] Lokal getestet?`,
          `- [ ] Invalid Input Handling OK?`,
          ``,
          `### Security`,
          `- [ ] Keine Secrets hardcoded?`,
          `- [ ] Input Validation?`,
          `- [ ] AuthZ/AuthN Impact verstanden?`,
          ``,
          `### Git History`,
          `- [ ] Commit Messages klar?`,
          `- [ ] Änderungen traceable?`,
          ``,
          `### Red Flags`,
          `- [ ] Code den ich nicht verstehe`,
          `- [ ] Hunderte Lines in einem Commit`,
          `- [ ] Unbekannte Dependencies`,
          `- [ ] Gelöschte Dateien ohne Bestätigung`,
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
      console.log(`✅ Gespeichert: ${p}`);

      // Show recommendation action
      if (recommendation.command) {
        // eslint-disable-next-line no-console
        console.log(`\n💡 Empfohlener nächster Schritt:`);
        // eslint-disable-next-line no-console
        console.log(`   → ${recommendation.command}\n`);
      }
    });
}
