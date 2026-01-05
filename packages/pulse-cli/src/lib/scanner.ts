import path from "node:path";
import type { PulseConfig } from "./types.js";

export type FindingSeverity = "critical" | "warn" | "info";

export type Finding = {
  severity: FindingSeverity;
  code:
    | "SECRETS"
    | "PROD_URL"
    | "MASS_DELETE"
    | "BIG_CHANGESET"
    | "UNKNOWN_DEPS"
    | "CONSOLE_LOG"
    | "COMMENTED_CODE"
    | "TODO_NO_ISSUE"
    | "LOOP_SIGNAL";
  message: string;
  details?: string;
};

export type ScanInput = {
  diffText: string;
  diffStat: string;
  diffNumstat: string;
  diffNameStatus: string;
};

export type ScanResult = {
  findings: Finding[];
  stats: {
    filesChanged: number;
    linesAdded: number;
    linesDeleted: number;
    deletedFiles: string[];
    touchedFiles: string[];
  };
};

export function scanDiff(config: PulseConfig, input: ScanInput): ScanResult {
  const findings: Finding[] = [];

  const num = parseNumstat(input.diffNumstat);
  const deletedFiles = parseDeletedFiles(input.diffNameStatus);
  const touchedFiles = num.map((n) => n.file);

  const stats = {
    filesChanged: touchedFiles.length,
    linesAdded: num.reduce((a, n) => a + n.added, 0),
    linesDeleted: num.reduce((a, n) => a + n.deleted, 0),
    deletedFiles,
    touchedFiles,
  };

  // --- Critical: secrets ---
  const secretHits = matchAny(config.patterns.secret, input.diffText);
  if (secretHits.length) {
    findings.push({
      severity: "critical",
      code: "SECRETS",
      message: `Possible secrets found in diff (${secretHits.length} hit(s)).`,
      details: secretHits.slice(0, 5).join("\n"),
    });
  }

  // --- Warn: production URLs ---
  const prodUrlHits = matchAny(config.patterns.prodUrl, input.diffText).filter(
    (m) => !m.includes("localhost") && !m.includes("127.0.0.1")
  );
  if (prodUrlHits.length) {
    findings.push({
      severity: config.enforcement === "strict" ? "critical" : "warn",
      code: "PROD_URL",
      message: `Production/external URL(s) detected in diff (${prodUrlHits.length} hit(s)). Prefer env vars.`,
      details: prodUrlHits.slice(0, 5).join("\n"),
    });
  }

  // --- Critical/Warn: mass deletes (DELETE safeguard) ---
  if (deletedFiles.length) {
    findings.push({
      severity: config.enforcement === "advisory" ? "warn" : "critical",
      code: "MASS_DELETE",
      message: `File deletion detected (${deletedFiles.length} file(s)). DELETE requires explicit confirmation.`,
      details: deletedFiles.slice(0, 10).join("\n"),
    });
  } else if (stats.linesDeleted >= config.thresholds.warnMaxDeletions) {
    findings.push({
      severity: "warn",
      code: "MASS_DELETE",
      message: `High deletions in diff (${stats.linesDeleted}). Consider smaller milestones / checkpoint.`,
    });
  }

  // --- Warn: big changeset (red flag: too much at once) ---
  if (
    stats.filesChanged >= config.thresholds.warnMaxFilesChanged ||
    stats.linesAdded + stats.linesDeleted >= config.thresholds.warnMaxLinesChanged
  ) {
    findings.push({
      severity: "warn",
      code: "BIG_CHANGESET",
      message: `Large changeset (files=${stats.filesChanged}, lines=${stats.linesAdded + stats.linesDeleted}). Consider smaller milestones.`,
      details: input.diffStat || undefined,
    });
  }

  // --- Warn: dependencies changed (unknown deps) ---
  const depsTouched = touchedFiles.some((f) =>
    ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"].includes(path.basename(f))
  );
  if (depsTouched) {
    findings.push({
      severity: "warn",
      code: "UNKNOWN_DEPS",
      message:
        "Dependency/lockfile change detected. Verify why dependencies changed and whether they are intended.",
    });
  }

  // --- Warn: console.log / debug leftovers ---
  const consoleHits = simpleLineHits(input.diffText, /^\+\s*console\.log\(/gm, 5);
  if (consoleHits.length) {
    findings.push({
      severity: "warn",
      code: "CONSOLE_LOG",
      message: "console.log detected in added lines. Remove debug output before merging.",
      details: consoleHits.join("\n"),
    });
  }

  // --- Warn: commented-out code (very heuristic) ---
  const commentedHits = simpleLineHits(input.diffText, /^\+\s*\/\/\s*(if|for|while|return|const|let|function|class)\b/gim, 5);
  if (commentedHits.length) {
    findings.push({
      severity: "warn",
      code: "COMMENTED_CODE",
      message: "Commented-out code detected in added lines. Prefer deleting or tracking via issue.",
      details: commentedHits.join("\n"),
    });
  }

  // --- Warn: TODO without issue ref ---
  const todoHits = simpleLineHits(input.diffText, /^\+\s*\/\/\s*TODO\b(?!.*#\d+)(?!.*CU-)(?!.*JIRA-)/gim, 5);
  if (todoHits.length) {
    findings.push({
      severity: "warn",
      code: "TODO_NO_ISSUE",
      message: "TODO comment without issue reference detected. Add ticket reference to avoid orphan TODOs.",
      details: todoHits.join("\n"),
    });
  }

  return { findings, stats };
}

function matchAny(patterns: string[], text: string): string[] {
  const out: string[] = [];
  for (const p of patterns) {
    try {
      const re = new RegExp(p, "g");
      const m = text.match(re);
      if (m) out.push(...m.slice(0, 5));
    } catch {
      // ignore invalid patterns
    }
  }
  // de-dupe
  return [...new Set(out)];
}

function simpleLineHits(text: string, re: RegExp, limit: number): string[] {
  const hits: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) && hits.length < limit) {
    hits.push(m[0]);
  }
  return hits;
}

function parseDeletedFiles(nameStatus: string): string[] {
  const files: string[] = [];
  for (const line of nameStatus.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [status, file] = trimmed.split(/\s+/);
    if (status === "D" && file) files.push(file);
  }
  return files;
}

type NumstatRow = { added: number; deleted: number; file: string };
function parseNumstat(numstat: string): NumstatRow[] {
  const rows: NumstatRow[] = [];
  for (const line of numstat.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split("\t");
    if (parts.length < 3) continue;
    const [a, d, file] = parts;
    const added = a === "-" ? 0 : Number(a);
    const deleted = d === "-" ? 0 : Number(d);
    rows.push({ added: Number.isFinite(added) ? added : 0, deleted: Number.isFinite(deleted) ? deleted : 0, file: file ?? "" });
  }
  return rows;
}

