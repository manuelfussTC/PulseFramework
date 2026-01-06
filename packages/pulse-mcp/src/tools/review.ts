/**
 * pulse_review Tool
 */

import { spawn } from "node:child_process";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerReviewTool() {
  return {
    name: "pulse_review",
    description: "Decision Briefing erstellen: Scope, Risiko, Empfehlung für Approve/Reject/Escalate.",
    inputSchema: {
      type: "object" as const,
      properties: {
        staged: {
          type: "boolean",
          description: "Staged diff statt working tree reviewen",
        },
      },
    },
  };
}

export async function handleReviewTool(args: unknown): Promise<ChainedResponse> {
  const { staged } = (args as { staged?: boolean }) || {};
  
  const cliArgs = ["review"];
  if (staged) {
    cliArgs.push("--staged");
  }
  
  try {
    const result = await runCli(cliArgs);
    
    // Parse recommendation from output
    let recommendation: string | undefined;
    if (result.includes("APPROVE")) {
      recommendation = "Änderungen können gemerged werden";
    } else if (result.includes("ESCALATE")) {
      recommendation = "Externe Analyse empfohlen - rufe pulse_escalate auf";
    } else if (result.includes("CHECKPOINT")) {
      recommendation = "Checkpoint empfohlen - rufe pulse_checkpoint auf";
    } else if (result.includes("STOP")) {
      recommendation = "STOP - Critical Findings beheben";
    }
    
    return chainResponse({
      result: `📋 Review\n\n${result}`,
      recommendation,
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Review fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
      safeguards_active: true,
    });
  }
}

async function runCli(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn("pulse", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });
    
    let stdout = "";
    let stderr = "";
    
    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    
    proc.on("close", (code) => {
      if (code === 0 || stdout) {
        resolve(stdout);
      } else {
        reject(new Error(stderr || `Exit code ${code}`));
      }
    });
    
    proc.on("error", reject);
  });
}
