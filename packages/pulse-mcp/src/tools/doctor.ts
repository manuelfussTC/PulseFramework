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
    
    // Track if we had critical before (for learn suggestion)
    const hadCriticalBefore = process.env.PULSE_HAD_CRITICAL === "true";
    
    let recommendation: string | undefined;
    let nextAction: string | undefined;
    let learnSuggestion = "";
    
    if (hasCritical) {
      process.env.PULSE_HAD_CRITICAL = "true";
      recommendation = "STOP - Fix critical findings before commit";
      nextAction = "Fix the critical findings and call pulse_doctor again";
    } else if (hasWarning) {
      recommendation = "Review warnings, then pulse_checkpoint";
      nextAction = "Decide whether warnings are acceptable, then checkpoint";
    } else {
      // Clean scan - if we had critical before, suggest learning
      if (hadCriticalBefore) {
        process.env.PULSE_HAD_CRITICAL = "false";
        learnSuggestion = "\n\n📚 You fixed a critical issue! Call pulse_learn to document what you learned.";
      }
      nextAction = "All OK - continue working or pulse_checkpoint";
    }
    
    return chainResponse({
      result: result + learnSuggestion,
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

