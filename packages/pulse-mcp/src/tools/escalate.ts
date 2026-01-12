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
          description: "Was hast du bereits versucht?",
        },
        error: {
          type: "string",
          description: "Fehlermeldung / Logs",
        },
        question: {
          type: "string",
          description: "Konkrete Frage an externes Model",
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
    
    return chainResponse({
      result: `🚨 Escalation created\n\n${result}`,
      next_action: "STOP - Warte auf Analyse vom externen Model. Führe keine weiteren Änderungen durch.",
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

