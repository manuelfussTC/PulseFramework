/**
 * pulse_checkpoint Tool
 */

import { runCli } from "../lib/cli.js";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";
import * as fs from "fs";
import * as path from "path";

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
    
    // Write timestamp file so extension can detect checkpoint
    writeCheckpointTimestamp();
    
    const commitInfo = skipCommit ? "(log only, no commit)" : "(committed to git)";
    
    // Track checkpoint count for learn suggestions
    const checkpointCount = parseInt(process.env.PULSE_CHECKPOINT_COUNT || "0") + 1;
    process.env.PULSE_CHECKPOINT_COUNT = String(checkpointCount);
    
    // Check if we resolved an escalation
    const wasEscalated = process.env.PULSE_ESCALATED === "true";
    const escalateProblem = process.env.PULSE_ESCALATE_PROBLEM || "";
    
    // Suggest learning: every 5 checkpoints, after escalation, or if summary mentions fix/solve
    const shouldSuggestLearn = checkpointCount % 5 === 0 || 
      wasEscalated ||
      (summary && /fix|solve|resolve|implement|complete|bug/i.test(summary));
    
    let nextAction = "Continue working. Next checkpoint recommended in 5-10 min.";
    let learnReminder = "";
    
    if (wasEscalated) {
      // Clear escalation state
      process.env.PULSE_ESCALATED = "false";
      process.env.PULSE_ESCALATE_PROBLEM = "";
      learnReminder = `\n\n📚 You resolved an escalation! Call pulse_learn to document:\n- Problem: ${escalateProblem}\n- Solution: (what fixed it)\n- Rule: (what to remember)`;
    } else if (shouldSuggestLearn) {
      learnReminder = "\n\n💡 Consider calling pulse_learn if you solved a non-trivial problem.";
    }
    
    return chainResponse({
      result: `✅ Checkpoint created ${commitInfo}\n\n${result}${learnReminder}`,
      next_action: nextAction,
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

/**
 * Write timestamp file so extension knows checkpoint was created
 */
function writeCheckpointTimestamp(): void {
  const cwd = process.cwd();
  const pulseDir = path.join(cwd, ".pulse");
  const timestampPath = path.join(pulseDir, "last-checkpoint");
  
  try {
    if (!fs.existsSync(pulseDir)) {
      fs.mkdirSync(pulseDir, { recursive: true });
    }
    fs.writeFileSync(timestampPath, JSON.stringify({
      timestamp: new Date().toISOString(),
    }));
  } catch {
    // Ignore errors - not critical
  }
}

