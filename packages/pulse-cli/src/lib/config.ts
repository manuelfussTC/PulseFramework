import fs from "node:fs/promises";
import { configFile } from "./paths.js";
import type { PulseConfig, PresetName, PresetConfig } from "./types.js";

// ════════════════════════════════════════════════════════════════════════════
// TEAM PRESETS
// ════════════════════════════════════════════════════════════════════════════

export const PRESETS: Record<PresetName, PresetConfig> = {
  frontend: {
    warnMaxFilesChanged: 10,
    warnMaxLinesChanged: 200,
    warnMaxDeletions: 30,
    checkpointReminderMinutes: 20,
    extraSecretPatterns: [
      "NEXT_PUBLIC_",
      "VITE_",
    ],
  },
  backend: {
    warnMaxFilesChanged: 15,
    warnMaxLinesChanged: 400,
    warnMaxDeletions: 50,
    checkpointReminderMinutes: 30,
    extraSecretPatterns: [
      "DATABASE_URL",
      "REDIS_URL",
      "SMTP_",
    ],
  },
  fullstack: {
    warnMaxFilesChanged: 20,
    warnMaxLinesChanged: 500,
    warnMaxDeletions: 60,
    checkpointReminderMinutes: 25,
  },
  monorepo: {
    warnMaxFilesChanged: 30,
    warnMaxLinesChanged: 800,
    warnMaxDeletions: 100,
    checkpointReminderMinutes: 30,
  },
  custom: {
    warnMaxFilesChanged: 15,
    warnMaxLinesChanged: 300,
    warnMaxDeletions: 50,
    checkpointReminderMinutes: 30,
  },
};

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
  // Apply preset defaults first if preset is set
  const presetName = input?.preset as PresetName | undefined;
  const presetDefaults = presetName && PRESETS[presetName] ? PRESETS[presetName] : null;

  const merged: PulseConfig = {
    ...DEFAULT_CONFIG,
    ...(typeof input === "object" && input ? input : {}),
    thresholds: {
      ...DEFAULT_CONFIG.thresholds,
      // Apply preset thresholds
      ...(presetDefaults ? {
        warnMaxFilesChanged: presetDefaults.warnMaxFilesChanged,
        warnMaxLinesChanged: presetDefaults.warnMaxLinesChanged,
        warnMaxDeletions: presetDefaults.warnMaxDeletions,
      } : {}),
      // User overrides take precedence
      ...(input?.thresholds ?? {}),
    },
    patterns: {
      ...DEFAULT_CONFIG.patterns,
      ...(input?.patterns ?? {}),
      // Merge extra secret patterns from preset
      secret: [
        ...DEFAULT_CONFIG.patterns.secret,
        ...(presetDefaults?.extraSecretPatterns ?? []),
        ...(input?.patterns?.secret ?? []),
      ],
    },
    commands: {
      ...DEFAULT_CONFIG.commands,
      ...(input?.commands ?? {}),
    },
    // Apply preset checkpoint reminder
    checkpointReminderMinutes: input?.checkpointReminderMinutes 
      ?? presetDefaults?.checkpointReminderMinutes 
      ?? 30,
  };
  
  // Defensive: ensure required shapes
  merged.version = 1;
  merged.preset = presetName;
  
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

/**
 * Get all available preset names
 */
export function getPresetNames(): PresetName[] {
  return Object.keys(PRESETS) as PresetName[];
}

/**
 * Get preset configuration by name
 */
export function getPreset(name: PresetName): PresetConfig {
  return PRESETS[name] ?? PRESETS.custom;
}

