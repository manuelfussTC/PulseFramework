/**
 * pulse_start Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerStartTool() {
  return {
    name: "pulse_start",
    description: "Generate a structured prompt using the 6-element framework.",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          description: "ACTION - What should be done? (required)",
        },
        template: {
          type: "string",
          description: "Template: feature, bugfix, refactor, concept, analyze, review",
        },
        role: {
          type: "string",
          description: "ROLE - Who should the AI be?",
        },
        context: {
          type: "string",
          description: "CONTEXT - Project, stack, situation",
        },
      },
      required: ["action"],
    },
  };
}

export async function handleStartTool(args: unknown): Promise<ChainedResponse> {
  const { action, template, role, context } = (args as {
    action: string;
    template?: string;
    role?: string;
    context?: string;
  }) || {};
  
  if (!action) {
    return chainResponse({
      result: "Error: ACTION is required",
      safeguards_active: true,
    });
  }
  
  const cliArgs = ["start", "--action", action];
  if (template) {
    cliArgs.push("-t", template);
  }
  if (role) {
    cliArgs.push("--role", role);
  }
  if (context) {
    cliArgs.push("--context", context);
  }
  cliArgs.push("-q"); // Quick mode to avoid interactive prompts
  
  try {
    const result = await runCli(cliArgs);
    
    return chainResponse({
      result: `✅ Prompt created\n\n${result}`,
      next_action: "Execute the ACTION. Checkpoint after 5-10 min.",
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Start failed: ${error instanceof Error ? error.message : String(error)}`,
      safeguards_active: true,
    });
  }
}

