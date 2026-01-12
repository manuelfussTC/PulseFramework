/**
 * pulse_correct Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerCorrectTool() {
  return {
    name: "pulse_correct",
    description: "Create correction prompt when you went off track.",
    inputSchema: {
      type: "object" as const,
      properties: {
        feedback: {
          type: "string",
          description: "Was läuft falsch? Was soll anders sein?",
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
      result: `🔄 Korrektur erstellt\n\n${result}`,
      next_action: "Wende die Korrektur an. Dann pulse_checkpoint.",
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Korrektur fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
      safeguards_active: true,
    });
  }
}

