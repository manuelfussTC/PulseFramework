/**
 * pulse_checkpoint Tool
 */

import { spawn } from "node:child_process";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerCheckpointTool() {
  return {
    name: "pulse_checkpoint",
    description: "Git-Checkpoint erstellen: Status prüfen, Red Flags erkennen, optional Tests ausführen und committen.",
    inputSchema: {
      type: "object" as const,
      properties: {
        message: {
          type: "string",
          description: "Git commit message",
        },
        runTests: {
          type: "boolean",
          description: "Konfigurierte Tests vor Commit ausführen",
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
      result: `✅ Checkpoint erstellt\n\n${result}`,
      next_action: "Weiterarbeiten. Nächster Checkpoint in 5-10 Min empfohlen.",
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Checkpoint fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
      recommendation: "Prüfe git status und behebe Konflikte",
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
