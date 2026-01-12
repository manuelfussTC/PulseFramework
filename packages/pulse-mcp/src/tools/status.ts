/**
 * pulse_status Tool
 * 
 * Quick overview of current project state.
 */

import { chainResponse, type ChainedResponse } from "../lib/chaining.js";
import { runCli } from "../lib/cli.js";

export function registerStatusTool() {
  return {
    name: "pulse_status",
    description: "Quick overview: Profile, checkpoint time, changes, findings. CALL THIS TOOL BEFORE EVERY RESPONSE.",
    inputSchema: {
      type: "object" as const,
      properties: {
        verbose: {
          type: "boolean",
          description: "Verbose output with scope bars and recommendation",
        },
      },
    },
  };
}

export async function handleStatusTool(args: unknown): Promise<ChainedResponse> {
  const { verbose } = (args as { verbose?: boolean }) || {};
  
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

