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
    const cpStatus = data.lastCheckpointMinutesAgo !== null 
      ? `${data.lastCheckpointMinutesAgo} min ago`
      : "none yet";
    
    let recommendation: string | undefined;
    let nextAction: string | undefined;
    
    // Generate recommendations
    if (data.criticalFindings > 0) {
      recommendation = "🛑 CRITICAL - You MUST stop and fix before continuing";
      nextAction = "Call pulse_doctor to see details. DO NOT proceed with other tasks.";
    } else if (data.lastCheckpointMinutesAgo !== null && data.lastCheckpointMinutesAgo > 30 && data.dirtyFiles > 0) {
      recommendation = "🛑 CHECKPOINT OVERDUE - You MUST checkpoint before continuing";
      nextAction = "Call pulse_checkpoint NOW. DO NOT proceed with other tasks.";
    } else if (data.lastCheckpointMinutesAgo !== null && data.lastCheckpointMinutesAgo > 15 && data.dirtyFiles > 0) {
      nextAction = `Call pulse_checkpoint in ~${30 - data.lastCheckpointMinutesAgo} min`;
    }
    
    // Check for blocking conditions
    const isOverdue = data.lastCheckpointMinutesAgo !== null && data.lastCheckpointMinutesAgo > 30 && data.dirtyFiles > 0;
    
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
    } else if (isOverdue) {
      lines.unshift(`🛑 CHECKPOINT OVERDUE (${data.lastCheckpointMinutesAgo} min) - STOP AND CHECKPOINT`);
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

