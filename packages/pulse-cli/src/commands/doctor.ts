import type { Command } from "commander";
import { loadConfig } from "../lib/config.js";
import { exec } from "../lib/exec.js";
import { findRepoRoot } from "../lib/paths.js";
import { gitDiffNameStatus, gitDiffNumstat, gitDiffStat, gitDiffText, gitLogOneline } from "../lib/git.js";
import { scanDiff } from "../lib/scanner.js";

type HookName = "pre-commit" | "pre-push" | "none";

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Scan current changes for Pulse Safeguards + Red Flags (mixed enforcement).")
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
        if (!repoRoot) throw new Error("Not inside a git repository.");

        const config = await loadConfig(repoRoot);
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
        const hasDeleteFinding = scan.findings.some((f) => f.code === "MASS_DELETE" && f.message.includes("File deletion"));
        const deleteConfirmed = Boolean(opts.confirmDelete) || process.env.PULSE_CONFIRM_DELETE === "1";
        if (hasDeleteFinding && deleteConfirmed) {
          scan.findings = scan.findings.map((f) =>
            f.code === "MASS_DELETE" && f.message.includes("File deletion")
              ? { ...f, severity: "warn", message: `${f.message} (confirmed)` }
              : f
          );
        }

        // Optional loop heuristics (based on commit messages + diff patterns)
        if (opts.loop) {
          const log = await gitLogOneline(repoRoot, 8);
          const loopHints = loopHeuristics(log);
          for (const h of loopHints) scan.findings.push(h);
        }

        // Output
        const critical = scan.findings.filter((f) => f.severity === "critical");
        const warnings = scan.findings.filter((f) => f.severity === "warn");

        if (!opts.ci) {
          // eslint-disable-next-line no-console
          console.log(`Pulse Doctor (${staged ? "staged" : "working tree"})`);
          // eslint-disable-next-line no-console
          console.log(`Files changed: ${scan.stats.filesChanged} | +${scan.stats.linesAdded} -${scan.stats.linesDeleted}`);
          // eslint-disable-next-line no-console
          console.log(`Diff stat:\n${diffStat || "(no changes)"}`);
          // eslint-disable-next-line no-console
          console.log("");
          printFindings(scan.findings);
          // eslint-disable-next-line no-console
          console.log("");
          printActions(critical, warnings);
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

function printFindings(findings: { severity: string; code: string; message: string; details?: string }[]) {
  if (!findings.length) {
    // eslint-disable-next-line no-console
    console.log("OK: no findings");
    return;
  }
  for (const f of findings) {
    // eslint-disable-next-line no-console
    console.log(`${f.severity.toUpperCase()}: ${f.code}: ${f.message}`);
    if (f.details) {
      // eslint-disable-next-line no-console
      console.log(f.details.split("\n").map((l) => `  ${l}`).join("\n"));
    }
  }
}

function printActions(
  critical: { code: string; message: string }[],
  warnings: { code: string; message: string }[]
) {
  if (!critical.length && !warnings.length) {
    // eslint-disable-next-line no-console
    console.log("✅ No action needed.");
    return;
  }
  // eslint-disable-next-line no-console
  console.log("Recommended actions:");
  if (critical.length) {
    // eslint-disable-next-line no-console
    console.log("- STOP: Critical safeguard hit. Fix or explicitly confirm (if appropriate).");
    for (const c of critical) {
      if (c.code === "SECRETS") {
        // eslint-disable-next-line no-console
        console.log("  - Remove secret, rotate it, and move to env/secret manager.");
      }
      if (c.code === "MASS_DELETE") {
        // eslint-disable-next-line no-console
        console.log("  - If delete is intended: re-run with PULSE_CONFIRM_DELETE=1 (or --confirm-delete).");
      }
    }
  }
  if (warnings.length) {
    // eslint-disable-next-line no-console
    console.log("- REVIEW: Warnings suggest risk/over-scope. Consider splitting milestones and checkpointing.");
  }
}

function loopHeuristics(logOneline: string) {
  const hints: { severity: "warn"; code: "LOOP_SIGNAL"; message: string; details?: string }[] = [];
  const lines = logOneline
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return hints;

  const msgs = lines.map((l) => l.replace(/^[a-f0-9]+\s+/, ""));
  const fixCount = msgs.filter((m) => /^fix(\(|:)/i.test(m)).length;
  if (fixCount >= 3) {
    hints.push({
      severity: "warn",
      code: "LOOP_SIGNAL",
      message:
        'Loop risk: multiple recent "fix" commits. If issue persists after 2–3 attempts: STOP, reject last commits, escalate with Cursor explanation.',
      details: msgs.slice(0, 6).join("\n"),
    });
  }

  const revertCount = msgs.filter((m) => /\brevert\b/i.test(m)).length;
  if (revertCount >= 1) {
    hints.push({
      severity: "warn",
      code: "LOOP_SIGNAL",
      message:
        "Loop risk: revert detected. If A↔B toggling: reset to last stable commit and choose one approach explicitly.",
      details: msgs.slice(0, 6).join("\n"),
    });
  }

  return hints;
}

