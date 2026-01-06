import { exec } from "./exec.js";

// ════════════════════════════════════════════════════════════════════════════
// Branch-Utilities
// ════════════════════════════════════════════════════════════════════════════

export async function gitCurrentBranch(repoRoot: string): Promise<string> {
  const res = await exec("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repoRoot });
  return res.stdout.trim();
}

export async function gitIsMainBranch(repoRoot: string): Promise<boolean> {
  const branch = await gitCurrentBranch(repoRoot);
  return ["main", "master", "develop", "development"].includes(branch.toLowerCase());
}

export async function gitCreateBranch(repoRoot: string, name: string): Promise<boolean> {
  const res = await exec("git", ["checkout", "-b", name], { cwd: repoRoot });
  return res.exitCode === 0;
}

export async function git(
  repoRoot: string,
  args: string[]
): Promise<{ ok: boolean; stdout: string; stderr: string; exitCode: number }> {
  const res = await exec("git", args, { cwd: repoRoot });
  return { ok: res.exitCode === 0, stdout: res.stdout, stderr: res.stderr, exitCode: res.exitCode };
}

export async function gitStatusPorcelain(repoRoot: string): Promise<string> {
  const res = await git(repoRoot, ["status", "--porcelain"]);
  return res.stdout.trimEnd();
}

export async function gitLogOneline(repoRoot: string, n = 5): Promise<string> {
  const res = await git(repoRoot, ["log", "--oneline", `-${n}`]);
  return res.stdout.trimEnd();
}

export async function gitDiffStat(repoRoot: string, opts?: { staged?: boolean }): Promise<string> {
  const baseArgs = ["diff", "--stat"];
  if (opts?.staged) baseArgs.push("--staged");
  const res = await git(repoRoot, baseArgs);
  return res.stdout.trimEnd();
}

export async function gitDiffNameStatus(
  repoRoot: string,
  opts?: { staged?: boolean }
): Promise<string> {
  const baseArgs = ["diff", "--name-status"];
  if (opts?.staged) baseArgs.push("--staged");
  const res = await git(repoRoot, baseArgs);
  return res.stdout.trimEnd();
}

export async function gitDiffNumstat(repoRoot: string, opts?: { staged?: boolean }): Promise<string> {
  const baseArgs = ["diff", "--numstat"];
  if (opts?.staged) baseArgs.push("--staged");
  const res = await git(repoRoot, baseArgs);
  return res.stdout.trimEnd();
}

export async function gitDiffText(
  repoRoot: string,
  opts?: { staged?: boolean; maxLines?: number }
): Promise<string> {
  const baseArgs = ["diff"];
  if (opts?.staged) baseArgs.push("--staged");
  const res = await git(repoRoot, baseArgs);
  
  if (opts?.maxLines && res.stdout) {
    const lines = res.stdout.split("\n");
    if (lines.length > opts.maxLines) {
      return lines.slice(0, opts.maxLines).join("\n") + `\n\n... (truncated, ${lines.length - opts.maxLines} more lines)`;
    }
  }
  
  return res.stdout;
}

