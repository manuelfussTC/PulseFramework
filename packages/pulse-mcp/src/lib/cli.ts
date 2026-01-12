/**
 * Central CLI runner for PULSE MCP tools
 * 
 * Supports PULSE_PROJECT_ROOT environment variable for correct working directory.
 */

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";

/**
 * Resolve the git project root directory.
 *
 * Why:
 * - MCP servers can run with an unexpected cwd depending on editor/workspace setup.
 * - Users may set PULSE_PROJECT_ROOT; it should be validated and normalized to the git top-level.
 *
 * Priority:
 * - Valid PULSE_PROJECT_ROOT (normalized to git top-level)
 * - process.cwd() (normalized to git top-level)
 */
export function getProjectRoot(): string {
  const envRoot = process.env.PULSE_PROJECT_ROOT;

  const candidates: string[] = [];
  if (envRoot && fs.existsSync(envRoot)) candidates.push(envRoot);
  candidates.push(process.cwd());

  for (const candidate of candidates) {
    const res = spawnSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: candidate,
      encoding: "utf8",
    });
    if (res.status === 0) {
      const root = String(res.stdout || "").trim();
      if (root) return root;
    }
  }

  // Fallback: prefer env if it exists, otherwise cwd
  return envRoot && fs.existsSync(envRoot) ? envRoot : process.cwd();
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
