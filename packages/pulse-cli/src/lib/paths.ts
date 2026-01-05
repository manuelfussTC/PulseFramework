import fs from "node:fs/promises";
import path from "node:path";

export async function findRepoRoot(startDir: string): Promise<string | null> {
  let cur = path.resolve(startDir);
  for (let i = 0; i < 50; i++) {
    const gitDir = path.join(cur, ".git");
    try {
      const st = await fs.stat(gitDir);
      if (st.isDirectory()) return cur;
    } catch {
      // ignore
    }
    const parent = path.dirname(cur);
    if (parent === cur) return null;
    cur = parent;
  }
  return null;
}

export function pulseDir(repoRoot: string): string {
  return path.join(repoRoot, ".pulse");
}

export function stateFile(repoRoot: string): string {
  return path.join(pulseDir(repoRoot), "state.json");
}

export function configFile(repoRoot: string): string {
  return path.join(repoRoot, "pulse.config.json");
}

