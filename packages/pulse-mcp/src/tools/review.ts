/**
 * pulse_review Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerReviewTool() {
  return {
    name: "pulse_review",
    description: "CALL THIS before saying 'done', creating a PR, or merging. Creates Decision Briefing with Scope, Risk, Recommendation.",
    inputSchema: {
      type: "object" as const,
      properties: {
        staged: {
          type: "boolean",
          description: "Review staged changes instead of working tree",
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
      recommendation = "Changes can be merged";
    } else if (result.includes("ESCALATE")) {
      recommendation = "External analysis recommended - call pulse_escalate";
    } else if (result.includes("CHECKPOINT")) {
      recommendation = "Checkpoint recommended - call pulse_checkpoint";
    } else if (result.includes("STOP")) {
      recommendation = "STOP - Fix critical findings first";
    }
    
    return chainResponse({
      result: `📋 Review\n\n${result}`,
      recommendation,
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Review failed: ${error instanceof Error ? error.message : String(error)}`,
      safeguards_active: true,
    });
  }
}

