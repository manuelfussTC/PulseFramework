/**
 * pulse_profile Tool
 */

import { spawn } from "node:child_process";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerProfileTool() {
  return {
    name: "pulse_profile",
    description: "Pulse Layer-Profil anzeigen oder wechseln.",
    inputSchema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          description: "show = aktuelles Profil anzeigen, set = Profil wechseln",
          enum: ["show", "set"],
        },
        layer: {
          type: "string",
          description: "Layer für set: concept, build, escalation",
          enum: ["concept", "build", "escalation"],
        },
      },
      required: ["action"],
    },
  };
}

export async function handleProfileTool(args: unknown): Promise<ChainedResponse> {
  const { action, layer } = (args as {
    action: "show" | "set";
    layer?: string;
  }) || {};
  
  if (!action) {
    return chainResponse({
      result: "Fehler: Action (show/set) ist erforderlich",
      safeguards_active: true,
    });
  }
  
  const cliArgs = ["profile", action];
  if (action === "set" && layer) {
    cliArgs.push(layer);
  }
  
  try {
    const result = await runCli(cliArgs);
    
    return chainResponse({
      result: `📋 Profil\n\n${result}`,
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Profile fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
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
