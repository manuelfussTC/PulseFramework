/**
 * pulse_learn Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerLearnTool() {
  return {
    name: "pulse_learn",
    description: "CALL THIS after successfully solving a non-trivial problem. Documents what worked for future reference.",
    inputSchema: {
      type: "object" as const,
      properties: {
        problem: {
          type: "string",
          description: "What was the problem?",
        },
        solution: {
          type: "string",
          description: "What was the solution?",
        },
        rule: {
          type: "string",
          description: "Derived rule for the future",
        },
      },
      required: ["problem", "solution"],
    },
  };
}

export async function handleLearnTool(args: unknown): Promise<ChainedResponse> {
  const { problem, solution, rule } = (args as {
    problem: string;
    solution: string;
    rule?: string;
  }) || {};
  
  if (!problem || !solution) {
    return chainResponse({
      result: "Error: Problem and solution are required",
      safeguards_active: true,
    });
  }
  
  const cliArgs = ["learn", "--problem", problem, "--solution", solution, "--no-promote"];
  if (rule) {
    cliArgs.push("--rule", rule);
  }
  
  try {
    const result = await runCli(cliArgs);
    
    return chainResponse({
      result: `📚 Knowledge saved\n\n${result}`,
      next_action: "Continue working. Knowledge is saved in .pulse/memory.md.",
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Learn failed: ${error instanceof Error ? error.message : String(error)}`,
      safeguards_active: true,
    });
  }
}

