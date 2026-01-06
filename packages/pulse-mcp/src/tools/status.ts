/**
 * pulse_status Tool
 * 
 * Quick overview of current project state.
 */

import { spawn } from "node:child_process";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerStatusTool() {
  return {
    name: "pulse_status",
    description: "Schneller Überblick: Profil, Checkpoint-Zeit, Änderungen, Findings. RUFE DIESES TOOL VOR JEDER ANTWORT AUF.",
    inputSchema: {
      type: "object" as const,
      properties: {
        verbose: {
          type: "boolean",
          description: "Ausführliche Ausgabe mit Scope-Bars und Empfehlung",
        },
      },
    },
  };
}

export async function handleStatusTool(args: unknown): Promise<ChainedResponse> {
  const { verbose } = (args as { verbose?: boolean }) || {};
  
  const cliArgs = ["status", "--json"];
  if (verbose) {
    // For MCP we always use JSON and format ourselves
  }
  
  try {
    const result = await runCli(cliArgs);
    const data = JSON.parse(result);
    
    // Format response
    const presetProfile = data.preset ? `${data.preset}/${data.profile}` : data.profile;
    const cpStatus = data.lastCheckpointMinutesAgo !== null 
      ? `vor ${data.lastCheckpointMinutesAgo} Min`
      : "noch keiner";
    
    let recommendation: string | undefined;
    let nextAction: string | undefined;
    
    // Generate recommendations
    if (data.criticalFindings > 0) {
      recommendation = "STOP - Critical Findings beheben";
      nextAction = "Rufe pulse_doctor auf um Details zu sehen";
    } else if (data.lastCheckpointMinutesAgo !== null && data.lastCheckpointMinutesAgo > 30 && data.dirtyFiles > 0) {
      recommendation = "Checkpoint überfällig";
      nextAction = "Rufe pulse_checkpoint auf";
    } else if (data.lastCheckpointMinutesAgo !== null && data.lastCheckpointMinutesAgo > 15 && data.dirtyFiles > 0) {
      nextAction = "In ~${30 - data.lastCheckpointMinutesAgo} Min pulse_checkpoint aufrufen";
    }
    
    const lines: string[] = [
      `📊 PULSE Status`,
      ``,
      `Profil: ${presetProfile}`,
      `Checkpoint: ${cpStatus}`,
      `Dateien: ${data.dirtyFiles}`,
      `Lines: ${data.linesChanged || "n/a"}`,
      `Findings: ${data.criticalFindings} Critical, ${data.warningFindings || data.findings - data.criticalFindings} Warnings`,
    ];
    
    return chainResponse({
      result: lines.join("\n"),
      next_action: nextAction,
      recommendation,
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Fehler beim Status-Abruf: ${error instanceof Error ? error.message : String(error)}`,
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
