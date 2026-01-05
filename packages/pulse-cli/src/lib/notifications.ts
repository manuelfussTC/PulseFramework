import os from "node:os";
import { exec } from "./exec.js";
import type { NotificationMode } from "./types.js";

export async function notify(
  mode: NotificationMode,
  title: string,
  message: string
): Promise<void> {
  if (mode === "terminal" || mode === "both") {
    // eslint-disable-next-line no-console
    console.log(`\n[PULSE] ${title}\n${message}\n`);
  }

  if (mode === "macos" || mode === "both") {
    if (os.platform() !== "darwin") return;
    // macOS notification via osascript
    const script = `display notification ${jsonString(message)} with title ${jsonString(title)}`;
    await exec("osascript", ["-e", script]);
  }
}

function jsonString(s: string): string {
  // osascript expects quoted AppleScript strings; JSON string works as a safe quoted string
  return JSON.stringify(s);
}

