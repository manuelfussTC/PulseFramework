/**
 * pulse_learn Tool
 */

import { spawn } from "node:child_process";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerLearnTool() {
  return {
    name: "pulse_learn",
    description: "Gelerntes Wissen speichern nach einem gelösten Problem.",
    inputSchema: {
      type: "object" as const,
      properties: {
        problem: {
          type: "string",
          description: "Was war das Problem?",
        },
        solution: {
          type: "string",
          description: "Was war die Lösung?",
        },
        rule: {
          type: "string",
          description: "Abgeleitete Regel für die Zukunft",
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
      result: "Fehler: Problem und Lösung sind erforderlich",
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
      result: `📚 Wissen gespeichert\n\n${result}`,
      next_action: "Weiterarbeiten. Das Wissen ist in .pulse/memory.md gespeichert.",
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Learn fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
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
