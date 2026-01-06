/**
 * Briefing Library - Aggregiert Daten für Decision Briefings
 */

import type { PulseConfig } from "./types.js";
import type { ScanResult, Finding } from "./scanner.js";

export type ScopeCheck = {
  files: { current: number; max: number; percent: number };
  lines: { current: number; max: number; percent: number };
  deletes: { current: number; max: number; percent: number };
  exceeded: boolean;
  exceededFields: string[];
};

export type RiskSummary = {
  criticalCount: number;
  warningCount: number;
  findings: Finding[];
  loopRisk: "LOW" | "MEDIUM" | "HIGH";
  loopSignals: string[];
};

export type TimeSummary = {
  minutesSinceCheckpoint: number | null;
  checkpointOverdue: boolean;
  sessionMinutes: number | null;
};

export type Recommendation = {
  action: "approve" | "checkpoint" | "escalate" | "stop";
  reason: string;
  command?: string;
};

export type DecisionBriefing = {
  preset: string | null;
  profile: string;
  scope: ScopeCheck;
  risk: RiskSummary;
  time: TimeSummary;
  recommendation: Recommendation;
};

/**
 * Calculate scope check against preset limits
 */
export function calculateScopeCheck(
  config: PulseConfig,
  stats: { filesChanged: number; linesAdded: number; linesDeleted: number }
): ScopeCheck {
  const totalLines = stats.linesAdded + stats.linesDeleted;
  
  const files = {
    current: stats.filesChanged,
    max: config.thresholds.warnMaxFilesChanged,
    percent: Math.round((stats.filesChanged / config.thresholds.warnMaxFilesChanged) * 100),
  };
  
  const lines = {
    current: totalLines,
    max: config.thresholds.warnMaxLinesChanged,
    percent: Math.round((totalLines / config.thresholds.warnMaxLinesChanged) * 100),
  };
  
  const deletes = {
    current: stats.linesDeleted,
    max: config.thresholds.warnMaxDeletions,
    percent: Math.round((stats.linesDeleted / config.thresholds.warnMaxDeletions) * 100),
  };

  const exceededFields: string[] = [];
  if (files.percent > 100) exceededFields.push("files");
  if (lines.percent > 100) exceededFields.push("lines");
  if (deletes.percent > 100) exceededFields.push("deletes");

  return {
    files,
    lines,
    deletes,
    exceeded: exceededFields.length > 0,
    exceededFields,
  };
}

/**
 * Summarize risks from scan results
 */
export function calculateRiskSummary(scanResult: ScanResult): RiskSummary {
  const criticalCount = scanResult.findings.filter((f) => f.severity === "critical").length;
  const warningCount = scanResult.findings.filter((f) => f.severity === "warn").length;
  
  const loopSignals = scanResult.findings
    .filter((f) => f.code === "LOOP_SIGNAL")
    .map((f) => f.message);

  let loopRisk: "LOW" | "MEDIUM" | "HIGH" = "LOW";
  if (loopSignals.length >= 3) {
    loopRisk = "HIGH";
  } else if (loopSignals.length >= 1) {
    loopRisk = "MEDIUM";
  }

  return {
    criticalCount,
    warningCount,
    findings: scanResult.findings,
    loopRisk,
    loopSignals,
  };
}

/**
 * Calculate time-based metrics
 */
export function calculateTimeSummary(
  lastCheckpointAt: string | undefined,
  checkpointReminderMinutes: number
): TimeSummary {
  const now = Date.now();
  
  let minutesSinceCheckpoint: number | null = null;
  let checkpointOverdue = false;
  
  if (lastCheckpointAt) {
    const lastCp = Date.parse(lastCheckpointAt);
    if (Number.isFinite(lastCp)) {
      minutesSinceCheckpoint = Math.floor((now - lastCp) / 60000);
      checkpointOverdue = minutesSinceCheckpoint > checkpointReminderMinutes;
    }
  }

  return {
    minutesSinceCheckpoint,
    checkpointOverdue,
    sessionMinutes: minutesSinceCheckpoint, // For now, same as checkpoint
  };
}

/**
 * Generate recommendation based on all factors
 */
export function generateRecommendation(
  scope: ScopeCheck,
  risk: RiskSummary,
  time: TimeSummary
): Recommendation {
  // Critical findings = STOP
  if (risk.criticalCount > 0) {
    return {
      action: "stop",
      reason: `${risk.criticalCount} Critical Finding(s) - Fix vor Merge`,
      command: "pulse doctor",
    };
  }

  // High loop risk = Escalate
  if (risk.loopRisk === "HIGH") {
    return {
      action: "escalate",
      reason: "Hohes Loop-Risiko erkannt",
      command: "pulse escalate",
    };
  }

  // Scope exceeded significantly = Checkpoint
  if (scope.exceeded && scope.lines.percent > 150) {
    return {
      action: "checkpoint",
      reason: `Scope überschritten (${scope.lines.current}/${scope.lines.max} Lines)`,
      command: "pulse checkpoint -m 'wip: progress'",
    };
  }

  // Checkpoint overdue = Checkpoint
  if (time.checkpointOverdue) {
    return {
      action: "checkpoint",
      reason: `${time.minutesSinceCheckpoint} Min seit letztem Checkpoint`,
      command: "pulse checkpoint -m 'wip: progress'",
    };
  }

  // Medium loop risk = Checkpoint
  if (risk.loopRisk === "MEDIUM") {
    return {
      action: "checkpoint",
      reason: "Loop-Signale erkannt - Checkpoint empfohlen",
      command: "pulse checkpoint -m 'wip: checkpoint before continuing'",
    };
  }

  // Warnings but manageable = Approve with note
  if (risk.warningCount > 0) {
    return {
      action: "approve",
      reason: `${risk.warningCount} Warning(s) - Approve mit Vorbehalt`,
    };
  }

  // All good
  return {
    action: "approve",
    reason: "Keine Findings, Scope OK",
  };
}

/**
 * Render progress bar
 */
export function renderProgressBar(percent: number, width = 15): string {
  const filled = Math.min(width, Math.round((percent / 100) * width));
  const empty = width - filled;
  const bar = "█".repeat(filled) + "░".repeat(empty);
  return bar;
}

/**
 * Render full Decision Briefing to terminal
 */
export function renderBriefing(briefing: DecisionBriefing): string {
  const lines: string[] = [];
  
  const boxWidth = 55;
  const hr = "─".repeat(boxWidth);
  
  lines.push(`┌${"─".repeat(boxWidth)}┐`);
  lines.push(`│ PULSE Review – Decision Briefing${" ".repeat(boxWidth - 35)}│`);
  lines.push(`├${hr}┤`);
  
  // Preset + Profile
  const presetProfile = briefing.preset 
    ? `${briefing.preset}/${briefing.profile}`
    : briefing.profile;
  lines.push(`│ Profil: ${presetProfile}${" ".repeat(boxWidth - 10 - presetProfile.length)}│`);
  lines.push(`├${hr}┤`);
  
  // Scope Check
  lines.push(`│ SCOPE-CHECK${" ".repeat(boxWidth - 12)}│`);
  
  const { scope } = briefing;
  const filesBar = renderProgressBar(scope.files.percent);
  const linesBar = renderProgressBar(scope.lines.percent);
  const deletesBar = renderProgressBar(scope.deletes.percent);
  
  const filesLine = `  Files: ${scope.files.current}/${scope.files.max} (${scope.files.percent}%)  ${filesBar}`;
  const linesLine = `  Lines: ${scope.lines.current}/${scope.lines.max} (${scope.lines.percent}%)  ${linesBar}`;
  const deletesLine = `  Deletes: ${scope.deletes.current}/${scope.deletes.max} (${scope.deletes.percent}%)  ${deletesBar}`;
  
  lines.push(`│${filesLine}${" ".repeat(Math.max(0, boxWidth - filesLine.length))}│`);
  lines.push(`│${linesLine}${" ".repeat(Math.max(0, boxWidth - linesLine.length))}│`);
  lines.push(`│${deletesLine}${" ".repeat(Math.max(0, boxWidth - deletesLine.length))}│`);
  
  if (scope.exceeded) {
    const warn = `  ⚠️ Überschritten: ${scope.exceededFields.join(", ")}`;
    lines.push(`│${warn}${" ".repeat(Math.max(0, boxWidth - warn.length))}│`);
  }
  
  lines.push(`├${hr}┤`);
  
  // Risk Summary
  lines.push(`│ RISIKO-SUMMARY${" ".repeat(boxWidth - 15)}│`);
  
  const { risk, time } = briefing;
  
  if (risk.criticalCount > 0) {
    const crit = `  🚨 ${risk.criticalCount} Critical`;
    lines.push(`│${crit}${" ".repeat(Math.max(0, boxWidth - crit.length))}│`);
  }
  if (risk.warningCount > 0) {
    const warn = `  ⚠️ ${risk.warningCount} Warnings`;
    lines.push(`│${warn}${" ".repeat(Math.max(0, boxWidth - warn.length))}│`);
  }
  if (risk.criticalCount === 0 && risk.warningCount === 0) {
    const ok = `  ✅ Keine Findings`;
    lines.push(`│${ok}${" ".repeat(Math.max(0, boxWidth - ok.length))}│`);
  }
  
  const timeStr = time.minutesSinceCheckpoint !== null
    ? `  ⏱️ Checkpoint vor ${time.minutesSinceCheckpoint} Min`
    : `  ⏱️ Kein Checkpoint`;
  lines.push(`│${timeStr}${" ".repeat(Math.max(0, boxWidth - timeStr.length))}│`);
  
  const loopEmoji = risk.loopRisk === "HIGH" ? "🔴" : risk.loopRisk === "MEDIUM" ? "🟡" : "🟢";
  const loopStr = `  ${loopEmoji} Loop-Risiko: ${risk.loopRisk}`;
  lines.push(`│${loopStr}${" ".repeat(Math.max(0, boxWidth - loopStr.length))}│`);
  
  lines.push(`├${hr}┤`);
  
  // Recommendation
  const { recommendation } = briefing;
  const actionEmoji = {
    approve: "✅",
    checkpoint: "⏱️",
    escalate: "🚨",
    stop: "🛑",
  }[recommendation.action];
  
  const recLine = `${actionEmoji} EMPFEHLUNG: ${recommendation.action.toUpperCase()}`;
  lines.push(`│ ${recLine}${" ".repeat(Math.max(0, boxWidth - recLine.length - 1))}│`);
  
  const reasonLine = `  → ${recommendation.reason}`;
  lines.push(`│${reasonLine}${" ".repeat(Math.max(0, boxWidth - reasonLine.length))}│`);
  
  if (recommendation.command) {
    const cmdLine = `  → ${recommendation.command}`;
    lines.push(`│${cmdLine}${" ".repeat(Math.max(0, boxWidth - cmdLine.length))}│`);
  }
  
  lines.push(`└${"─".repeat(boxWidth)}┘`);
  
  return lines.join("\n");
}
