/**
 * pulse_escalate Tool
 */

import { spawn } from "node:child_process";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerEscalateTool() {
  return {
    name: "pulse_escalate",
    description: "Eskalations-Paket für externes Model erstellen. RUFE AUF WENN DU NACH 2-3 VERSUCHEN NICHT WEITERKOMMST.",
    inputSchema: {
      type: "object" as const,
      properties: {
        problem: {
          type: "string",
          description: "Was ist das Problem?",
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
      result: "Fehler: Problem-Beschreibung ist erforderlich",
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
      result: `🚨 Eskalation erstellt\n\n${result}`,
      next_action: "STOP - Warte auf Analyse vom externen Model. Führe keine weiteren Änderungen durch.",
      recommendation: "Kopiere den Prompt in ChatGPT/Claude/GPT-5 und warte auf Anweisungen",
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Eskalation fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
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
