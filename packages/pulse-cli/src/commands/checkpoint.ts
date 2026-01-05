import type { Command } from "commander";
import { loadState, saveState, timestampId, writeArtifact } from "../lib/artifacts.js";
import { loadConfig } from "../lib/config.js";
import { exec } from "../lib/exec.js";
import { findRepoRoot } from "../lib/paths.js";
import { gitDiffNumstat, gitDiffStat, gitLogOneline, gitStatusPorcelain, gitDiffText } from "../lib/git.js";
import { scanDiff } from "../lib/scanner.js";

export function registerCheckpointCommand(program: Command): void {
  program
    .command("checkpoint")
    .description("Checkpoint helper: show git context, warn on red flags, optionally run tests/commit, update last checkpoint time.")
    .option("--staged", "Use staged diff")
    .option("--inspect-latest", "Inspect the latest commit diff (useful if Cursor auto-committed)")
    .option("--run-tests", "Run configured test command")
    .option("-m, --message <msg>", "If provided, run git commit -am/-m with this message (staged only)")
    .action(
      async (opts: { staged?: boolean; inspectLatest?: boolean; runTests?: boolean; message?: string }) => {
        const repoRoot = await findRepoRoot(process.cwd());
        if (!repoRoot) throw new Error("Not inside a git repository.");

        const [config, status, log] = await Promise.all([
          loadConfig(repoRoot),
          gitStatusPorcelain(repoRoot),
          gitLogOneline(repoRoot, 5),
        ]);

        let diffText = "";
        let diffStat = "";
        let diffNumstat = "";
        let diffNameStatus = "";

        if (opts.inspectLatest) {
          // last commit diff
          const d = await exec("git", ["show", "--format=", "--unified=0"], { cwd: repoRoot });
          diffText = d.stdout;
          const s = await exec("git", ["show", "--format=", "--stat"], { cwd: repoRoot });
          diffStat = s.stdout.trimEnd();
          const n = await exec("git", ["show", "--format=", "--numstat"], { cwd: repoRoot });
          diffNumstat = n.stdout.trimEnd();
          const ns = await exec("git", ["show", "--format=", "--name-status"], { cwd: repoRoot });
          diffNameStatus = ns.stdout.trimEnd();
        } else {
          const staged = Boolean(opts.staged);
          [diffText, diffStat, diffNumstat] = await Promise.all([
            gitDiffText(repoRoot, { staged }),
            gitDiffStat(repoRoot, { staged }),
            gitDiffNumstat(repoRoot, { staged }),
          ]);
          const ns = await exec("git", ["diff", "--name-status", ...(staged ? ["--staged"] : [])], { cwd: repoRoot });
          diffNameStatus = ns.stdout.trimEnd();
        }

        const scan = scanDiff(config, { diffText, diffStat, diffNumstat, diffNameStatus });

        const ts = timestampId();
        const artifact = [
          `# Checkpoint (${ts})`,
          ``,
          `## Git status`,
          "```",
          status || "(clean)",
          "```",
          ``,
          `## Recent commits`,
          "```",
          log || "(none)",
          "```",
          ``,
          `## Diff stat`,
          "```",
          diffStat || "(no changes)",
          "```",
          ``,
          `## Findings`,
          ...formatFindings(scan.findings),
          ``,
        ].join("\n");

        const p = await writeArtifact(repoRoot, "worklogs", `${ts}-checkpoint.md`, artifact);
        // eslint-disable-next-line no-console
        console.log(`Wrote ${p}`);

        if (scan.findings.length) {
          // eslint-disable-next-line no-console
          console.log("\nFindings:");
          for (const f of scan.findings) {
            // eslint-disable-next-line no-console
            console.log(`- [${f.severity.toUpperCase()}] ${f.code}: ${f.message}`);
          }
        }

        // Optionally run tests
        const shouldRunTests = Boolean(opts.runTests) && Boolean(config.commands.test?.trim());
        if (shouldRunTests) {
          // eslint-disable-next-line no-console
          console.log(`\nRunning tests: ${config.commands.test}`);
          const res = await execShell(config.commands.test!, repoRoot);
          if (res.exitCode !== 0) {
            // eslint-disable-next-line no-console
            console.error(res.stderr || res.stdout);
            process.exit(res.exitCode);
          }
        }

        // Optional commit (staged only)
        if (opts.message) {
          // eslint-disable-next-line no-console
          console.log(`\nCreating commit: ${opts.message}`);
          const res = await exec("git", ["commit", "-m", opts.message], { cwd: repoRoot });
          if (res.exitCode !== 0) {
            // eslint-disable-next-line no-console
            console.error(res.stderr || res.stdout);
            process.exit(res.exitCode);
          }
        }

        const state = await loadState(repoRoot);
        state.lastCheckpointAt = new Date().toISOString();
        await saveState(repoRoot, state);
      }
    );
}

function formatFindings(findings: { severity: string; code: string; message: string; details?: string }[]): string[] {
  if (!findings.length) return ["- ✅ No findings."];
  return findings.map((f) => {
    const details = f.details ? `\n  - Details:\n\n\`\`\`\n${f.details}\n\`\`\`` : "";
    return `- **${f.severity.toUpperCase()} ${f.code}**: ${f.message}${details}`;
  });
}

async function execShell(cmd: string, cwd: string) {
  // minimal shell wrapper to run configured commands
  const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
  const args = process.platform === "win32" ? ["/c", cmd] : ["-lc", cmd];
  return await exec(shell, args, { cwd });
}

