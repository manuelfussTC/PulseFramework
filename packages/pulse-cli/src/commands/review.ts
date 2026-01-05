import type { Command } from "commander";
import { timestampId, writeArtifact } from "../lib/artifacts.js";
import { findRepoRoot } from "../lib/paths.js";
import { gitDiffStat, gitLogOneline, gitStatusPorcelain } from "../lib/git.js";

export function registerReviewCommand(program: Command): void {
  program
    .command("review")
    .alias("r") // Kurzform: pulse r
    .description("Review-Checkliste erstellen (Code-Quality, Security, Red Flags)")
    .option("--staged", "Review staged diff instead of working tree diff")
    .action(async (opts: { staged?: boolean }) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not inside a git repository.");

      const [status, log, stat] = await Promise.all([
        gitStatusPorcelain(repoRoot),
        gitLogOneline(repoRoot, 5),
        gitDiffStat(repoRoot, { staged: opts.staged }),
      ]);

      const ts = timestampId();
      const filename = `${ts}-review.md`;

      const content = [
        `# Review Pulse (${ts})`,
        ``,
        `## Context`,
        ``,
        `- Scope: **${opts.staged ? "staged" : "working tree"}**`,
        ``,
        `### Git status (porcelain)`,
        "```",
        status || "(clean)",
        "```",
        ``,
        `### Recent commits`,
        "```",
        log || "(none)",
        "```",
        ``,
        `### Diff stat`,
        "```",
        stat || "(no changes)",
        "```",
        ``,
        `## Review Checklist (Pulse)`,
        ``,
        `### Code quality`,
        `- [ ] Do I understand what the code does? (If no: STOP and ask for explanation.)`,
        `- [ ] Naming OK? Consistent conventions?`,
        `- [ ] Error handling present?`,
        `- [ ] Edge cases considered?`,
        ``,
        `### Functionality`,
        `- [ ] Does it work as requested?`,
        `- [ ] Tested locally?`,
        `- [ ] Invalid input behavior OK?`,
        `- [ ] Network/error scenarios OK?`,
        ``,
        `### Security`,
        `- [ ] No secrets hardcoded?`,
        `- [ ] Input validation present?`,
        `- [ ] AuthZ/AuthN impacts understood?`,
        ``,
        `### Git history`,
        `- [ ] Commit messages clear?`,
        `- [ ] Changes are traceable (small milestones)?`,
        `- [ ] Rollback points make sense?`,
        ``,
        `### Documentation`,
        `- [ ] New behavior documented?`,
        `- [ ] Breaking changes documented?`,
        ``,
        `## Red Flags (STOP + ACTION)`,
        `- [ ] Code you don’t understand`,
        `- [ ] Hundreds of lines in one commit`,
        `- [ ] Unknown dependencies added`,
        `- [ ] Deleted files without explicit confirmation`,
        `- [ ] Production URLs in code (use env)`,
        ``,
        `## Outcome`,
        `- Decision: [ ] Approve  [ ] Reject  [ ] Escalate`,
        `- Notes:`,
        ``,
      ].join("\n");

      const p = await writeArtifact(repoRoot, "reviews", filename, content);
      // eslint-disable-next-line no-console
      console.log(`Wrote ${p}`);
    });
}

