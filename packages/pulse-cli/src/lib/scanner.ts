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
    // Parse NEW dependencies from diff
    const newDeps = extractNewDependencies(input.diffText);
    
    if (newDeps.length > 0) {
      findings.push({
        severity: "warn",
        code: "UNKNOWN_DEPS",
        message: `Neue Dependencies erkannt (${newDeps.length}): Kennst du diese?`,
        details: newDeps.slice(0, 10).map((d) => `  + ${d.name}${d.version ? ` @ ${d.version}` : ""}`).join("\n"),
      });
    } else {
      findings.push({
        severity: "warn",
        code: "UNKNOWN_DEPS",
        message:
          "Dependency/lockfile Änderung erkannt. Prüfe ob die Änderungen gewollt sind.",
      });
    }
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

// ════════════════════════════════════════════════════════════════════════════
// DEPENDENCY EXTRACTION
// ════════════════════════════════════════════════════════════════════════════

type NewDependency = {
  name: string;
  version?: string;
};

/**
 * Extract NEW dependencies from git diff of package.json
 * Looks for added lines with "package": "version" pattern
 */
function extractNewDependencies(diffText: string): NewDependency[] {
  const deps: NewDependency[] = [];
  const seen = new Set<string>();
  
  // Match added lines in package.json that look like dependencies
  // Pattern: +    "package-name": "^1.2.3"
  const depLineRegex = /^\+\s*"(@?[\w\-./]+)"\s*:\s*"([^"]+)"/gm;
  
  let match;
  while ((match = depLineRegex.exec(diffText)) !== null) {
    const name = match[1] ?? "";
    const version = match[2] ?? "";
    
    // Skip common non-dependency fields
    if (isNonDependencyField(name)) continue;
    
    // Skip if it looks like a lockfile internal entry
    if (name.startsWith("node_modules/")) continue;
    
    // Must look like a valid npm package name
    // - Starts with @ (scoped) or a letter
    // - Contains only valid chars
    // - Version looks like a semver range
    if (!isValidPackageName(name)) continue;
    if (!isValidVersionRange(version)) continue;
    
    // Dedupe
    if (seen.has(name)) continue;
    seen.add(name);
    
    deps.push({ name, version });
  }
  
  return deps;
}

/**
 * Check if name looks like a valid npm package name
 */
function isValidPackageName(name: string): boolean {
  // Scoped packages: @scope/name
  if (name.startsWith("@")) {
    return /^@[\w-]+\/[\w.-]+$/.test(name);
  }
  // Regular packages: name or name-with-dashes
  return /^[a-z][\w.-]*$/.test(name);
}

/**
 * Check if version looks like a semver range
 */
function isValidVersionRange(version: string): boolean {
  // Common patterns: ^1.0.0, ~1.0.0, >=1.0.0, 1.0.0, *, latest
  // Also: npm:package@version, workspace:*
  if (version === "*" || version === "latest" || version === "next") return true;
  if (version.startsWith("npm:")) return true;
  if (version.startsWith("workspace:")) return true;
  if (/^[\^~>=<]?\d/.test(version)) return true;
  return false;
}

/**
 * Check if a field name is a common package.json field (not a dependency)
 */
function isNonDependencyField(name: string): boolean {
  const nonDepFields = [
    // package.json fields
    "name", "version", "description", "main", "module", "types", "typings",
    "scripts", "bin", "files", "repository", "keywords", "author", "license",
    "bugs", "homepage", "engines", "private", "workspaces", "publishConfig",
    "type", "exports", "imports", "sideEffects", "browserslist", "eslintConfig",
    "prettier", "jest", "mocha", "nyc", "lint-staged", "husky", "config",
    "peerDependenciesMeta", "bundleDependencies", "optionalDependencies",
    "overrides", "resolutions", "packageManager", "volta", "directories",
    // Script names
    "dev", "build", "start", "test", "lint", "format", "clean", "watch",
    "preinstall", "postinstall", "prepublish", "prepare",
    // Lock file internal fields
    "resolved", "integrity", "dev", "optional", "requires", "dependencies",
    "node", "npm", "funding", "hasInstallScript", "hasShrinkwrap", "deprecated",
    "peer", "engines", "os", "cpu", "libc", "bin", "license",
    // Common config field values
    "preset", "extends", "plugins", "rules", "env", "globals", "parser",
    "parserOptions", "settings", "ignorePatterns",
  ];
  
  // Also skip if it looks like a version range or URL
  if (/^[\d^~<>=*]/.test(name)) return true;
  if (name.startsWith("http")) return true;
  if (name.startsWith("git")) return true;
  if (name.startsWith("file:")) return true;
  if (name.startsWith("npm:")) return true;
  
  return nonDepFields.includes(name);
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

// ════════════════════════════════════════════════════════════════════════════
// ERWEITERTE LOOP-DETECTION
// ════════════════════════════════════════════════════════════════════════════

export type LoopSignal = {
  type: "fix_chain" | "revert" | "churn" | "pendeln" | "fix_no_test";
  severity: FindingSeverity;
  message: string;
  details?: string;
};

/**
 * Analyze git log for loop signals
 * @param gitLog Output from `git log --oneline -n 15`
 * @param gitLogWithFiles Output from `git log --name-only --oneline -n 15`
 */
export function detectLoopSignals(
  gitLog: string,
  gitLogWithFiles?: string
): LoopSignal[] {
  const signals: LoopSignal[] = [];
  const lines = gitLog.split("\n").filter((l) => l.trim());
  const messages = lines.map((l) => l.replace(/^[a-f0-9]+\s+/, "").toLowerCase());

  // ────────────────────────────────────────────────────────────────────────────
  // Signal 1: Fix-Chain (mehrere "fix" Commits hintereinander)
  // ────────────────────────────────────────────────────────────────────────────
  const fixCount = messages.filter((m) => /^fix(\(|:|\s)/i.test(m)).length;
  if (fixCount >= 3) {
    signals.push({
      type: "fix_chain",
      severity: "warn",
      message: `Loop-Signal: ${fixCount}x "fix" Commits in den letzten 15 Commits. Möglicher Fix-Loop.`,
      details: messages.slice(0, 6).join("\n"),
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Signal 2: Revert-Pattern (explizite Reverts)
  // ────────────────────────────────────────────────────────────────────────────
  const revertCount = messages.filter((m) => /\brevert\b/i.test(m)).length;
  if (revertCount >= 1) {
    signals.push({
      type: "revert",
      severity: revertCount >= 2 ? "critical" : "warn",
      message: `Loop-Signal: ${revertCount}x "revert" gefunden. A↔B Toggling möglich.`,
      details: messages.filter((m) => /\brevert\b/i.test(m)).join("\n"),
    });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Signal 3: File-Churn (gleiche Datei mehrfach in kurzer Zeit geändert)
  // ────────────────────────────────────────────────────────────────────────────
  if (gitLogWithFiles) {
    const fileChanges = parseFileChangesFromLog(gitLogWithFiles);
    const churnFiles = Object.entries(fileChanges)
      .filter(([_, count]) => count >= 5)
      .map(([file, count]) => `${file} (${count}x)`);

    if (churnFiles.length > 0) {
      signals.push({
        type: "churn",
        severity: "warn",
        message: `Loop-Signal: File-Churn - ${churnFiles.length} Datei(en) wurden 5+ mal geändert.`,
        details: churnFiles.slice(0, 5).join("\n"),
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Signal 4: Fix ohne Test-Änderung
  // ────────────────────────────────────────────────────────────────────────────
  if (gitLogWithFiles) {
    const fixWithoutTest = detectFixWithoutTest(gitLogWithFiles);
    if (fixWithoutTest.length >= 2) {
      signals.push({
        type: "fix_no_test",
        severity: "warn",
        message: `Loop-Signal: ${fixWithoutTest.length}x "fix" Commits ohne Test-Änderungen.`,
        details: fixWithoutTest.slice(0, 3).join("\n"),
      });
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Signal 5: Pendeln (ähnliche Commit-Messages wiederholen sich)
  // ────────────────────────────────────────────────────────────────────────────
  const similarMessages = findSimilarMessages(messages);
  if (similarMessages.length > 0) {
    signals.push({
      type: "pendeln",
      severity: "critical",
      message: `Loop-Signal: Ähnliche Commits wiederholen sich. Mögliches Diff-Pendeln.`,
      details: similarMessages.join("\n"),
    });
  }

  return signals;
}

/**
 * Parse file changes from git log --name-only output
 */
function parseFileChangesFromLog(logWithFiles: string): Record<string, number> {
  const fileCount: Record<string, number> = {};
  const lines = logWithFiles.split("\n");
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip commit hashes and empty lines
    if (!trimmed || /^[a-f0-9]{7,}/.test(trimmed)) continue;
    // Count file occurrences
    if (trimmed.includes(".") || trimmed.includes("/")) {
      fileCount[trimmed] = (fileCount[trimmed] ?? 0) + 1;
    }
  }
  
  return fileCount;
}

/**
 * Detect "fix" commits that don't touch test files
 */
function detectFixWithoutTest(logWithFiles: string): string[] {
  const results: string[] = [];
  const blocks = logWithFiles.split(/\n(?=[a-f0-9]{7,})/);
  
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim());
    if (lines.length === 0) continue;
    
    const firstLine = lines[0] ?? "";
    const message = firstLine.replace(/^[a-f0-9]+\s+/, "").toLowerCase();
    
    // Check if it's a fix commit
    if (!/^fix(\(|:|\s)/i.test(message)) continue;
    
    // Check if any files are test files
    const files = lines.slice(1);
    const hasTestFile = files.some((f) => 
      /\.(test|spec)\.[jt]sx?$/.test(f) ||
      /__(tests|test)__/.test(f) ||
      /\.test\./.test(f)
    );
    
    if (!hasTestFile) {
      results.push(firstLine);
    }
  }
  
  return results;
}

/**
 * Find similar commit messages that might indicate pendeln
 */
function findSimilarMessages(messages: string[]): string[] {
  const similar: string[] = [];
  
  // Simple: Check for near-identical messages
  for (let i = 0; i < messages.length - 1; i++) {
    for (let j = i + 1; j < messages.length; j++) {
      const m1 = messages[i] ?? "";
      const m2 = messages[j] ?? "";
      
      // Normalize: remove version numbers, timestamps
      const norm1 = m1.replace(/v?\d+(\.\d+)*/g, "").replace(/\s+/g, " ").trim();
      const norm2 = m2.replace(/v?\d+(\.\d+)*/g, "").replace(/\s+/g, " ").trim();
      
      if (norm1 === norm2 && norm1.length > 10) {
        similar.push(`"${m1}" ≈ "${m2}"`);
      }
    }
  }
  
  return similar;
}

