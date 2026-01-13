/**
 * pulse_checkpoint Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerCheckpointTool() {
  return {
    name: "pulse_checkpoint",
    description: "Create Git checkpoint WITH COMMIT: Logs status, commits all changes, detects red flags. ALWAYS provide a summary!",
    inputSchema: {
      type: "object" as const,
      properties: {
        summary: {
          type: "string",
          description: "REQUIRED: Brief summary of what was done (becomes commit message). E.g. 'Implemented user auth, fixed login bug'",
        },
        runTests: {
          type: "boolean",
          description: "Run configured tests before commit",
        },
        skipCommit: {
          type: "boolean",
          description: "Skip the automatic commit (only create log, not recommended)",
        },
      },
      required: ["summary"],
    },
  };
}

export async function handleCheckpointTool(args: unknown): Promise<ChainedResponse> {
  const { summary, runTests, skipCommit } = (args as { summary?: string; runTests?: boolean; skipCommit?: boolean }) || {};
  
  const cliArgs = ["checkpoint"];
  if (summary) {
    cliArgs.push("-s", summary);
    // Auto-commit with summary as message (unless skipped)
    if (!skipCommit) {
      cliArgs.push("-m", `checkpoint: ${summary}`);
    }
  }
  if (runTests) {
    cliArgs.push("--run-tests");
  }
  
  try {
    const result = await runCli(cliArgs);
    
    const commitInfo = skipCommit ? "(log only, no commit)" : "(committed to git)";
    
    return chainResponse({
      result: `✅ Checkpoint created ${commitInfo}\n\n${result}`,
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

