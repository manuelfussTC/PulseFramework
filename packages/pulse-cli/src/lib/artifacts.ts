import fs from "node:fs/promises";
import path from "node:path";
import { pulseDir, stateFile } from "./paths.js";
import type { PulseState } from "./types.js";

export type ArtifactKind = "pulses" | "reviews" | "escalations" | "worklogs";

export function timestampId(d = new Date()): string {
  // 2026-01-05T12-34-56Z (filename-safe)
  return d.toISOString().replace(/:/g, "-");
}

export async function ensurePulseDirs(repoRoot: string): Promise<void> {
  const base = pulseDir(repoRoot);
  await fs.mkdir(base, { recursive: true });
  await fs.mkdir(path.join(base, "pulses"), { recursive: true });
  await fs.mkdir(path.join(base, "reviews"), { recursive: true });
  await fs.mkdir(path.join(base, "escalations"), { recursive: true });
  await fs.mkdir(path.join(base, "worklogs"), { recursive: true });
}

export async function writeArtifact(
  repoRoot: string,
  kind: ArtifactKind,
  name: string,
  content: string
): Promise<string> {
  await ensurePulseDirs(repoRoot);
  const p = path.join(pulseDir(repoRoot), kind, name);
  await fs.writeFile(p, content, "utf8");
  return p;
}

export async function loadState(repoRoot: string): Promise<PulseState> {
  try {
    const raw = await fs.readFile(stateFile(repoRoot), "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      return {
        version: 1,
        profile: parsed.profile ?? "build",
        lastCheckpointAt: parsed.lastCheckpointAt,
      };
    }
  } catch {
    // ignore
  }
  return { version: 1, profile: "build" };
}

export async function saveState(repoRoot: string, next: PulseState): Promise<void> {
  await ensurePulseDirs(repoRoot);
  await fs.writeFile(stateFile(repoRoot), JSON.stringify(next, null, 2) + "\n", "utf8");
}

