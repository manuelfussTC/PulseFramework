/**
 * pulse_correct Tool
 */

import { spawn } from "node:child_process";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerCorrectTool() {
  return {
    name: "pulse_correct",
    description: "Korrektur-Prompt erstellen wenn du falsch abgebogen bist.",
    inputSchema: {
      type: "object" as const,
      properties: {
        feedback: {
          type: "string",
          description: "Was läuft falsch? Was soll anders sein?",
        },
        mode: {
          type: "string",
          description: "Modus: explain (erkläre), narrow (minimale Änderung), milestone (aufteilen)",
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
      result: "Fehler: Feedback ist erforderlich",
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
