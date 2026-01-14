/**
 * pulse_status Tool
 * 
 * Quick overview of current project state.
 */

import { chainResponse, type ChainedResponse } from "../lib/chaining.js";
import { runCli } from "../lib/cli.js";
import * as fs from "fs";
import * as path from "path";

export function registerStatusTool() {
  return {
    name: "pulse_status",
    description: "Quick overview: Profile, checkpoint time, changes, findings. CALL THIS TOOL BEFORE EVERY RESPONSE.",
    inputSchema: {
      type: "object" as const,
      properties: {
        userMessage: {
          type: "string",
          description: "The user's latest message (for smart tool suggestions)",
        },
        verbose: {
          type: "boolean",
          description: "Verbose output with scope bars and recommendation",
        },
      },
    },
  };
}

export async function handleStatusTool(args: unknown): Promise<ChainedResponse> {
  const { userMessage, verbose } = (args as { userMessage?: string; verbose?: boolean }) || {};
  
  // Write timestamp so extension knows safeguards are active
  writeStatusTimestamp();
  
  // Check for checkpoint trigger file from extension
  const checkpointTrigger = checkForCheckpointTrigger();
  
  // Analyze user message for smart tool suggestions
  const suggestedTool = analyzeUserMessage(userMessage);
  
  const cliArgs = ["status", "--json"];
  if (verbose) {
    // For MCP we always use JSON and format ourselves
  }
  
  try {
    const result = await runCli(cliArgs);
    const data = JSON.parse(result);
    
    // Format response
    const presetProfile = data.preset ? `${data.preset}/${data.profile}` : data.profile;
    
    // Session detection: If >60 min AND no dirty files, treat as new session
    const minutesAgo = data.lastCheckpointMinutesAgo;
    const isNewSession = minutesAgo !== null && minutesAgo > 60 && data.dirtyFiles === 0;
    const isActiveOverdue = minutesAgo !== null && minutesAgo > 30 && data.dirtyFiles > 0;
    
    // Format checkpoint status with session awareness
    let cpStatus: string;
    if (minutesAgo === null) {
      cpStatus = "none yet";
    } else if (isNewSession) {
      cpStatus = `new session (last: ${minutesAgo > 1440 ? Math.floor(minutesAgo / 1440) + "d" : Math.floor(minutesAgo / 60) + "h"} ago)`;
    } else {
      cpStatus = `${minutesAgo} min ago`;
    }
    
    let recommendation: string | undefined;
    let nextAction: string | undefined;
    
    // Generate recommendations
    if (data.criticalFindings > 0) {
      recommendation = "🛑 CRITICAL - You MUST stop and fix before continuing";
      nextAction = "Call pulse_doctor to see details. DO NOT proceed with other tasks.";
    } else if (isNewSession) {
      // New session - don't block, just recommend starting fresh
      recommendation = "🆕 New session detected";
      nextAction = "Consider pulse_checkpoint to start fresh timer";
    } else if (isActiveOverdue) {
      recommendation = "🛑 CHECKPOINT OVERDUE - You MUST checkpoint before continuing";
      nextAction = "Call pulse_checkpoint NOW. DO NOT proceed with other tasks.";
    } else if (minutesAgo !== null && minutesAgo > 15 && data.dirtyFiles > 0) {
      nextAction = `Call pulse_checkpoint in ~${30 - minutesAgo} min`;
    }
    
    // Check for blocking conditions (only block during ACTIVE work, not new sessions)
    const isOverdue = isActiveOverdue;
    
    const lines: string[] = [
      `📊 PULSE Status`,
      ``,
      `Profile: ${presetProfile}`,
      `Checkpoint: ${cpStatus}`,
      `Files: ${data.dirtyFiles}`,
      `Lines: ${data.linesChanged || "n/a"}`,
      `Findings: ${data.criticalFindings} Critical, ${data.warningFindings || data.findings - data.criticalFindings} Warnings`,
    ];
    
    // Check for checkpoint trigger (highest priority)
    if (checkpointTrigger) {
      lines.unshift(`🔔 CHECKPOINT REQUESTED via Extension - RUN pulse_checkpoint IMMEDIATELY`);
      lines.unshift(``);
      return chainResponse({
        result: lines.join("\n"),
        next_action: "IMMEDIATELY call pulse_checkpoint with a summary of recent work. User requested via extension.",
        recommendation: "🔔 USER REQUESTED CHECKPOINT - Execute pulse_checkpoint NOW with summary from chat context",
        safeguards_active: true,
        is_critical: true, // Force agent to act
      });
    }
    
    // Add blocking header for critical findings or overdue checkpoint
    if (data.criticalFindings > 0) {
      lines.unshift(`🛑 CRITICAL FINDINGS DETECTED - STOP`);
      lines.unshift(``);
    } else if (isNewSession) {
      lines.unshift(`🆕 NEW SESSION - Timer reset recommended`);
      lines.unshift(``);
    } else if (isOverdue) {
      lines.unshift(`🛑 CHECKPOINT OVERDUE (${minutesAgo} min) - STOP AND CHECKPOINT`);
      lines.unshift(``);
    }
    
    // Block agent on: critical findings OR >30 min without checkpoint
    const mustStop = data.criticalFindings > 0 || isOverdue;
    
    // Add smart tool suggestion if detected
    if (suggestedTool && !mustStop) {
      lines.push(``);
      lines.push(`💡 Suggested: ${suggestedTool.tool} - ${suggestedTool.reason}`);
      if (!nextAction) {
        nextAction = `Consider calling ${suggestedTool.tool}`;
      }
    }
    
    return chainResponse({
      result: lines.join("\n"),
      next_action: nextAction,
      recommendation,
      safeguards_active: true,
      is_critical: mustStop,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Error getting status: ${error instanceof Error ? error.message : String(error)}`,
      safeguards_active: true,
    });
  }
}

/**
 * Check for checkpoint trigger file from extension
 * Returns true if trigger exists (and deletes it)
 */
function checkForCheckpointTrigger(): boolean {
  const cwd = process.cwd();
  const triggerPath = path.join(cwd, ".pulse", "checkpoint-requested");
  
  if (fs.existsSync(triggerPath)) {
    try {
      // Delete trigger file so it's not processed again
      fs.unlinkSync(triggerPath);
      return true;
    } catch {
      // Ignore errors
    }
  }
  return false;
}

/**
 * Write timestamp file so extension knows pulse_status was called
 */
function writeStatusTimestamp(): void {
  const cwd = process.cwd();
  const pulseDir = path.join(cwd, ".pulse");
  const timestampPath = path.join(pulseDir, "last-status");
  
  try {
    if (!fs.existsSync(pulseDir)) {
      fs.mkdirSync(pulseDir, { recursive: true });
    }
    fs.writeFileSync(timestampPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      pid: process.pid
    }));
  } catch {
    // Ignore errors - not critical
  }
}

/**
 * Analyze user message to suggest the right tool
 */
function analyzeUserMessage(message?: string): { tool: string; reason: string } | null {
  if (!message) return null;
  
  const lower = message.toLowerCase();
  
  // New task / feature / start working
  if (/^(new|start|begin|implement|create|build|add|make)\b/i.test(message) ||
      /neue[rs]?\s+(feature|aufgabe|task)/i.test(lower) ||
      /lass uns|let's|fang an/i.test(lower)) {
    return { tool: "pulse_run", reason: "New task detected - creates branch & work order" };
  }
  
  // Done / finished / PR / merge
  if (/\b(done|fertig|finished|complete|abgeschlossen|pr|pull.?request|merge|ship)\b/i.test(lower)) {
    return { tool: "pulse_review", reason: "Completion detected - run review checklist" };
  }
  
  // Wrong / not what I meant / stop
  if (/\b(wrong|falsch|nein|stop|nicht|no|halt|undo|revert|zurück)\b/i.test(lower) ||
      /not what i (meant|want)/i.test(lower) ||
      /das stimmt nicht/i.test(lower)) {
    return { tool: "pulse_correct", reason: "Correction needed - get back on track" };
  }
  
  // Stuck / help / doesn't work
  if (/\b(stuck|hilfe|help|doesn'?t work|funktioniert nicht|error|fehler|broken|kaputt)\b/i.test(lower) &&
      /\b(still|immer noch|again|wieder|multiple|mehrmals)\b/i.test(lower)) {
    return { tool: "pulse_escalate", reason: "Repeated issues - consider escalation" };
  }
  
  // Explain / what did you do
  if (/\b(explain|erkläre?|what did|was hast|why|warum|how|wie)\b/i.test(lower) &&
      /\b(you|du|that|das|this|code)\b/i.test(lower)) {
    return { tool: "pulse_review", reason: "Explanation requested - review changes" };
  }
  
  return null;
}

