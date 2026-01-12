/**
 * pulse_profile Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerProfileTool() {
  return {
    name: "pulse_profile",
    description: "Show or switch Pulse layer profile.",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          description: "show = show current profile, set = change profile",
          enum: ["show", "set"],
        },
        layer: {
          type: "string",
          description: "Layer for set: concept, build, escalation",
          enum: ["concept", "build", "escalation"],
        },
      },
      required: ["action"],
    },
  };
}

export async function handleProfileTool(args: unknown): Promise<ChainedResponse> {
  const { action, layer } = (args as {
    action: "show" | "set";
    layer?: string;
  }) || {};
  
  if (!action) {
    return chainResponse({
      result: "Error: Action (show/set) is required",
      safeguards_active: true,
    });
  }
  
  const cliArgs = ["profile", action];
  if (action === "set" && layer) {
    cliArgs.push(layer);
  }
  
  try {
    const result = await runCli(cliArgs);
    
    return chainResponse({
      result: `📋 Profile\n\n${result}`,
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Profile fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
      safeguards_active: true,
    });
  }
}

