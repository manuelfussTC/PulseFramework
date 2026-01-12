/**
 * pulse_doctor Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerDoctorTool() {
  return {
    name: "pulse_doctor",
    description: "Check safeguards + red flags: Secrets, Deletes, Scope, Loop signals. CALL AFTER CODE CHANGES.",
    inputSchema: {
      type: "object" as const,
      properties: {
        loop: {
          type: "boolean",
          description: "Enable loop detection hints (fix-chain, reverts, churn, etc.)",
        },
        staged: {
          type: "boolean",
          description: "Only check staged changes",
        },
      },
    },
  };
}

export async function handleDoctorTool(args: unknown): Promise<ChainedResponse> {
  const { loop, staged } = (args as { loop?: boolean; staged?: boolean }) || {};
  
  const cliArgs = ["doctor"];
  if (loop) {
    cliArgs.push("--loop");
  }
  if (staged) {
    cliArgs.push("--staged");
  }
  
  try {
    const result = await runCli(cliArgs);
    
    // Check for critical findings
    const hasCritical = result.includes("🚨") || result.includes("CRITICAL");
    const hasWarning = result.includes("⚠️") || result.includes("WARN");
    
    let recommendation: string | undefined;
    let nextAction: string | undefined;
    
    if (hasCritical) {
      recommendation = "STOP - Fix critical findings before commit";
      nextAction = "Fix the critical findings and call pulse_doctor again";
    } else if (hasWarning) {
      recommendation = "Review warnings, then pulse_checkpoint";
      nextAction = "Decide whether warnings are acceptable, then checkpoint";
    } else {
      nextAction = "All OK - continue working or pulse_checkpoint";
    }
    
    return chainResponse({
      result,
      recommendation,
      next_action: nextAction,
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Doctor scan failed: ${error instanceof Error ? error.message : String(error)}`,
      safeguards_active: true,
    });
  }
}

