/**
 * Central CLI runner for PULSE MCP tools
 * 
 * Supports PULSE_PROJECT_ROOT environment variable for correct working directory.
 */

import { spawn } from "node:child_process";

/**
 * Get the project root directory
 * Priority: PULSE_PROJECT_ROOT env > cwd
 */
export function getProjectRoot(): string {
  return process.env.PULSE_PROJECT_ROOT || process.cwd();
}

/**
 * Run the pulse CLI with the given arguments
 * Automatically uses the correct working directory based on PULSE_PROJECT_ROOT
 */
export async function runCli(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const cwd = getProjectRoot();
    
    const proc = spawn("pulse", args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd,
      env: {
        ...process.env,
        PULSE_PROJECT_ROOT: cwd,
      },
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
    
    proc.on("error", (err) => {
      // Provide helpful error message
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(new Error(
          `'pulse' command not found. Ensure @pulseframework/pulse-cli is installed globally.\n` +
          `Run: npm install -g @pulseframework/pulse-cli\n` +
          `Or: npm link -w packages/pulse-cli (from PulseFramework repo)`
        ));
      } else {
        reject(err);
      }
    });
  });
}
