/**
 * pulse_start Tool
 */

import { spawn } from "node:child_process";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerStartTool() {
  return {
    name: "pulse_start",
    description: "Strukturierten Prompt nach 6-Elemente-Framework generieren.",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          description: "ACTION - Was soll gemacht werden? (PFLICHT)",
        },
        template: {
          type: "string",
          description: "Template: feature, bugfix, refactor, concept, analyze, review",
        },
        role: {
          type: "string",
          description: "ROLLE - Wer soll die KI sein?",
        },
        context: {
          type: "string",
          description: "KONTEXT - Projekt, Stack, Situation",
        },
      },
      required: ["action"],
    },
  };
}

export async function handleStartTool(args: unknown): Promise<ChainedResponse> {
  const { action, template, role, context } = (args as {
    action: string;
    template?: string;
    role?: string;
    context?: string;
  }) || {};
  
  if (!action) {
    return chainResponse({
      result: "Fehler: ACTION ist erforderlich",
      safeguards_active: true,
    });
  }
  
  const cliArgs = ["start", "--action", action];
  if (template) {
    cliArgs.push("-t", template);
  }
  if (role) {
    cliArgs.push("--role", role);
  }
  if (context) {
    cliArgs.push("--context", context);
  }
  cliArgs.push("-q"); // Quick mode to avoid interactive prompts
  
  try {
    const result = await runCli(cliArgs);
    
    return chainResponse({
      result: `✅ Prompt erstellt\n\n${result}`,
      next_action: "Führe die ACTION aus. Checkpoint nach 5-10 Min.",
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Start fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
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
