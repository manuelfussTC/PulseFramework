import fs from "node:fs/promises";
import path from "node:path";

async function ensureExecutable(filePath: string): Promise<void> {
  try {
    await fs.chmod(filePath, 0o755);
  } catch {
    // ignore
  }
}

export async function installHooks(repoRoot: string): Promise<void> {
  const hooksDir = path.join(repoRoot, ".git", "hooks");
  await fs.mkdir(hooksDir, { recursive: true });

  const preCommit = path.join(hooksDir, "pre-commit");
  const prePush = path.join(hooksDir, "pre-push");

  await fs.writeFile(
    preCommit,
    `#!/bin/sh
set -e

# Pulse mixed enforcement:
# - blocks critical findings (secrets, deletes) unless explicitly confirmed
#
# Confirm deletes for this commit by running:
#   PULSE_CONFIRM_DELETE=1 git commit ...

pulse doctor --staged --hook pre-commit
`,
    "utf8"
  );
  await ensureExecutable(preCommit);

  await fs.writeFile(
    prePush,
    `#!/bin/sh
set -e

# Pulse safeguard: never push without explicit permission.
# Allow push explicitly by running:
#   PULSE_ALLOW_PUSH=1 git push ...

pulse doctor --hook pre-push
`,
    "utf8"
  );
  await ensureExecutable(prePush);

  // eslint-disable-next-line no-console
  console.log(`Installed git hooks:\n- ${preCommit}\n- ${prePush}`);
}

