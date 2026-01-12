/**
 * pulse_review Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerReviewTool() {
  return {
    name: "pulse_review",
    description: "Create Decision Briefing: Scope, Risk, Recommendation for Approve/Reject/Escalate.",
    inputSchema: {
      type: "object" as const,
      properties: {
        staged: {
          type: "boolean",
          description: "Staged diff statt working tree reviewen",
        },
      },
    },
  };
}

export async function handleReviewTool(args: unknown): Promise<ChainedResponse> {
  const { staged } = (args as { staged?: boolean }) || {};
  
  const cliArgs = ["review"];
  if (staged) {
    cliArgs.push("--staged");
  }
  
  try {
    const result = await runCli(cliArgs);
    
    // Parse recommendation from output
    let recommendation: string | undefined;
    if (result.includes("APPROVE")) {
      recommendation = "Änderungen können gemerged werden";
    } else if (result.includes("ESCALATE")) {
      recommendation = "Externe Analyse empfohlen - rufe pulse_escalate auf";
    } else if (result.includes("CHECKPOINT")) {
      recommendation = "Checkpoint recommended - call pulse_checkpoint";
    } else if (result.includes("STOP")) {
      recommendation = "STOP - Critical Findings beheben";
    }
    
    return chainResponse({
      result: `📋 Review\n\n${result}`,
      recommendation,
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Review fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
      safeguards_active: true,
    });
  }
}

