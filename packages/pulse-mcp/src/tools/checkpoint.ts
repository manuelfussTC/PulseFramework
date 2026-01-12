/**
 * pulse_checkpoint Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerCheckpointTool() {
  return {
    name: "pulse_checkpoint",
    description: "Create Git checkpoint: Check status, detect red flags, optionally run tests and commit.",
    inputSchema: {
      type: "object" as const,
      properties: {
        message: {
          type: "string",
          description: "Git commit message",
        },
        runTests: {
          type: "boolean",
          description: "Run configured tests before commit",
        },
      },
    },
  };
}

export async function handleCheckpointTool(args: unknown): Promise<ChainedResponse> {
  const { message, runTests } = (args as { message?: string; runTests?: boolean }) || {};
  
  const cliArgs = ["checkpoint"];
  if (message) {
    cliArgs.push("-m", message);
  }
  if (runTests) {
    cliArgs.push("--run-tests");
  }
  
  try {
    const result = await runCli(cliArgs);
    
    return chainResponse({
      result: `✅ Checkpoint created\n\n${result}`,
      next_action: "Continue working. Next checkpoint recommended in 5-10 min.",
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Checkpoint failed: ${error instanceof Error ? error.message : String(error)}`,
      recommendation: "Check git status and fix conflicts",
      safeguards_active: true,
    });
  }
}

