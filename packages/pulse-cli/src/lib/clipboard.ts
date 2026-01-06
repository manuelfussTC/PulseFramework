import os from "node:os";
import { exec } from "./exec.js";

/**
 * Copy text to system clipboard (cross-platform)
 * Returns true if successful, false otherwise
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const platform = os.platform();

  try {
    if (platform === "darwin") {
      // macOS: pbcopy
      await execWithStdin("pbcopy", [], text);
      return true;
    }

    if (platform === "win32") {
      // Windows: clip
      await execWithStdin("clip", [], text);
      return true;
    }

    if (platform === "linux") {
      // Linux: try xclip, then xsel
      try {
        await execWithStdin("xclip", ["-selection", "clipboard"], text);
        return true;
      } catch {
        try {
          await execWithStdin("xsel", ["--clipboard", "--input"], text);
          return true;
        } catch {
          return false;
        }
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Execute a command with stdin input
 */
async function execWithStdin(cmd: string, args: string[], input: string): Promise<void> {
  const { spawn } = await import("node:child_process");
  
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${cmd} exited with code ${code}`));
      }
    });

    proc.stdin?.write(input);
    proc.stdin?.end();
  });
}

/**
 * Copy text to clipboard and return status message
 */
export async function copyAndNotify(text: string): Promise<string> {
  const success = await copyToClipboard(text);
  
  if (success) {
    return "📋 In Zwischenablage kopiert!";
  }
  
  const platform = os.platform();
  if (platform === "linux") {
    return "⚠️ Clipboard nicht verfügbar (xclip/xsel nicht installiert)";
  }
  
  return "⚠️ Konnte nicht in Zwischenablage kopieren";
}
