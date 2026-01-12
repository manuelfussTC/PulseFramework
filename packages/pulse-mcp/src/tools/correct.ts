/**
 * pulse_correct Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerCorrectTool() {
  return {
    name: "pulse_correct",
    description: "CALL THIS when user says 'wrong', 'not what I meant', 'stop'. Creates correction prompt to get back on track.",
    inputSchema: {
      type: "object" as const,
      properties: {
        feedback: {
          type: "string",
          description: "What's wrong? What should be different?",
        },
        mode: {
          type: "string",
          description: "Mode: explain, narrow (minimal change), milestone (split up)",
          enum: ["explain", "narrow", "milestone"],
        },
      },
      required: ["feedback"],
    },
  };
}

export async function handleCorrectTool(args: unknown): Promise<ChainedResponse> {
  const { feedback, mode } = (args as {
    feedback: string;
    mode?: string;
  }) || {};
  
  if (!feedback) {
    return chainResponse({
      result: "Error: Feedback is required",
      safeguards_active: true,
    });
  }
  
  const cliArgs = ["correct", "--feedback", feedback];
  if (mode) {
    cliArgs.push("--mode", mode);
  }
  
  try {
    const result = await runCli(cliArgs);
    
    return chainResponse({
      result: `🔄 Correction created\n\n${result}`,
      next_action: "Apply the correction. Then pulse_checkpoint.",
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Correction failed: ${error instanceof Error ? error.message : String(error)}`,
      safeguards_active: true,
    });
  }
}

