import fs from "node:fs/promises";
import { configFile } from "./paths.js";
import type { PulseConfig } from "./types.js";

export const DEFAULT_CONFIG: PulseConfig = {
  version: 1,
  projectType: "unknown",
  enforcement: "mixed",
  notifications: "both",
  thresholds: {
    warnMaxFilesChanged: 15,
    warnMaxLinesChanged: 300,
    warnMaxDeletions: 50,
  },
  patterns: {
    // Keep these as regex source strings (without surrounding / /).
    // We intentionally include a few high-signal patterns + a generic catch-all.
    secret: [
      "AKIA[0-9A-Z]{16}", // AWS access key id
      "ASIA[0-9A-Z]{16}", // AWS temporary key id
      "ghp_[A-Za-z0-9]{36}", // GitHub classic token
      "github_pat_[A-Za-z0-9_]{80,}", // GitHub fine-grained token
      "sk_(live|test)_[A-Za-z0-9]{16,}", // Stripe
      "AIzaSy[A-Za-z0-9_-]{30,}", // Google API key
      "(?i)(api[_-]?key|secret|token|password)\\s*[:=]\\s*['\\\"][^'\\\"]{8,}['\\\"]", // generic
      "(?i)-----BEGIN (RSA|EC|OPENSSH) PRIVATE KEY-----",
    ],
    prodUrl: [
      // any http(s) URL that isn't localhost or example domains
      "https?://(?!localhost\\b)(?!127\\.0\\.0\\.1\\b)(?!0\\.0\\.0\\.0\\b)(?!example\\.com\\b)[^\\s'\\\"]+",
    ],
  },
  commands: {
    test: "",
  },
};

export async function loadConfig(repoRoot: string): Promise<PulseConfig> {
  const p = configFile(repoRoot);
  try {
    const raw = await fs.readFile(p, "utf8");
    const parsed = JSON.parse(raw);
    return normalizeConfig(parsed);
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function writeDefaultConfig(repoRoot: string): Promise<void> {
  const p = configFile(repoRoot);
  await fs.writeFile(p, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n", "utf8");
}

export function normalizeConfig(input: any): PulseConfig {
  const merged: PulseConfig = {
    ...DEFAULT_CONFIG,
    ...(typeof input === "object" && input ? input : {}),
    thresholds: {
      ...DEFAULT_CONFIG.thresholds,
      ...(input?.thresholds ?? {}),
    },
    patterns: {
      ...DEFAULT_CONFIG.patterns,
      ...(input?.patterns ?? {}),
    },
    commands: {
      ...DEFAULT_CONFIG.commands,
      ...(input?.commands ?? {}),
    },
  };
  // Defensive: ensure required shapes
  merged.version = 1;
  if (!["advisory", "mixed", "strict"].includes(merged.enforcement)) {
    merged.enforcement = DEFAULT_CONFIG.enforcement;
  }
  if (!["terminal", "macos", "both"].includes(merged.notifications)) {
    merged.notifications = DEFAULT_CONFIG.notifications;
  }
  if (!["node", "python", "unknown"].includes(merged.projectType)) {
    merged.projectType = DEFAULT_CONFIG.projectType;
  }
  return merged;
}

