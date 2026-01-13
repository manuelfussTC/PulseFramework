/**
 * pulse_escalate Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerEscalateTool() {
  return {
    name: "pulse_escalate",
    description: "Create escalation package for external model. CALL THIS IF YOU CAN'T PROGRESS AFTER 2-3 ATTEMPTS.",
    inputSchema: {
      type: "object" as const,
      properties: {
        problem: {
          type: "string",
          description: "What is the problem?",
        },
        tried: {
          type: "string",
          description: "What have you already tried?",
        },
        error: {
          type: "string",
          description: "Error message / logs",
        },
        question: {
          type: "string",
          description: "Specific question for external model",
        },
      },
      required: ["problem"],
    },
  };
}

export async function handleEscalateTool(args: unknown): Promise<ChainedResponse> {
  const { problem, tried, error, question } = (args as {
    problem: string;
    tried?: string;
    error?: string;
    question?: string;
  }) || {};
  
  if (!problem) {
    return chainResponse({
      result: "Error: Problem description is required",
      safeguards_active: true,
    });
  }
  
  const cliArgs = ["escalate", "--problem", problem, "--auto-include"];
  if (tried) {
    cliArgs.push("--tried", tried);
  }
  if (error) {
    cliArgs.push("--error", error);
  }
  if (question) {
    cliArgs.push("--question", question);
  }
  
  try {
    const result = await runCli(cliArgs);
    
    // Track that we escalated (for learn suggestion later)
    process.env.PULSE_ESCALATED = "true";
    process.env.PULSE_ESCALATE_PROBLEM = problem;
    
    return chainResponse({
      result: `🚨 Escalation created\n\n${result}`,
      next_action: "STOP - Wait for analysis from external model. DO NOT make further changes.",
      recommendation: "Copy the prompt to ChatGPT/Claude/GPT-5 and wait for instructions",
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Escalation failed: ${error instanceof Error ? error.message : String(error)}`,
      safeguards_active: true,
    });
  }
}

