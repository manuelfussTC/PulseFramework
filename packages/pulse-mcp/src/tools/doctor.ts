/**
 * pulse_doctor Tool
 */

import { spawn } from "node:child_process";
import { chainResponse, type ChainedResponse } from "../lib/chaining.js";

export function registerDoctorTool() {
  return {
    name: "pulse_doctor",
    description: "Safeguards + Red Flags prüfen: Secrets, Deletes, Scope, Loop-Signale. RUFE NACH CODE-ÄNDERUNGEN AUF.",
    inputSchema: {
      type: "object" as const,
      properties: {
        loop: {
          type: "boolean",
          description: "Loop-Detection aktivieren (Fix-Chain, Reverts, etc.)",
        },
        staged: {
          type: "boolean",
          description: "Nur staged Änderungen prüfen",
        },
      },
    },
  };
}

export async function handleDoctorTool(args: unknown): Promise<ChainedResponse> {
  const { loop, staged } = (args as { loop?: boolean; staged?: boolean }) || {};
  
  const cliArgs = ["doctor"];
  if (loop) {
    cliArgs.push("--loop");
  }
  if (staged) {
    cliArgs.push("--staged");
  }
  
  try {
    const result = await runCli(cliArgs);
    
    // Check for critical findings
    const hasCritical = result.includes("🚨") || result.includes("CRITICAL");
    const hasWarning = result.includes("⚠️") || result.includes("WARN");
    
    let recommendation: string | undefined;
    let nextAction: string | undefined;
    
    if (hasCritical) {
      recommendation = "STOP - Critical Findings beheben vor Commit";
      nextAction = "Behebe die Critical Findings und rufe pulse_doctor erneut auf";
    } else if (hasWarning) {
      recommendation = "Warnings prüfen, dann pulse_checkpoint";
      nextAction = "Entscheide ob Warnings akzeptabel sind";
    } else {
      nextAction = "Alles OK - weiterarbeiten oder pulse_checkpoint";
    }
    
    return chainResponse({
      result,
      recommendation,
      next_action: nextAction,
      safeguards_active: true,
    });
    
  } catch (error) {
    return chainResponse({
      result: `Doctor Scan fehlgeschlagen: ${error instanceof Error ? error.message : String(error)}`,
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
      // Doctor returns exit codes 1/2 for warnings/critical but still outputs useful info
      resolve(stdout || stderr);
    });
    
    proc.on("error", reject);
  });
}
