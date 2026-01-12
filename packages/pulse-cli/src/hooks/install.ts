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
  const postCommit = path.join(hooksDir, "post-commit");
  const prePush = path.join(hooksDir, "pre-push");

  await fs.writeFile(
    preCommit,
    `#!/bin/sh
# Pulse mixed enforcement:
# - blocks CRITICAL findings (secrets, mass deletes) - exit code 2
# - warns on other findings but allows commit - exit code 1
#
# Bypass for this commit:
#   PULSE_SKIP_HOOKS=1 git commit ...

if [ "$PULSE_SKIP_HOOKS" = "1" ]; then
  exit 0
fi

pulse doctor --staged --hook pre-commit
EXIT_CODE=$?

# Only block on CRITICAL (exit 2), allow warnings (exit 1)
if [ $EXIT_CODE -eq 2 ]; then
  echo ""
  echo "❌ Commit blocked by PULSE (critical findings)"
  echo "   Fix issues or use: PULSE_SKIP_HOOKS=1 git commit ..."
  exit 2
fi

exit 0
`,
    "utf8"
  );
  await ensureExecutable(preCommit);

  // Post-commit: Update checkpoint timestamp so timer resets on every commit
  await fs.writeFile(
    postCommit,
    `#!/bin/sh
# Pulse: Track every commit as a checkpoint (reset timer)
# This updates .pulse/state.json with current timestamp

PULSE_DIR=".pulse"
STATE_FILE="$PULSE_DIR/state.json"

if [ -d "$PULSE_DIR" ]; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
  
  if [ -f "$STATE_FILE" ]; then
    # Update existing state.json
    if command -v node >/dev/null 2>&1; then
      node -e "
        const fs = require('fs');
        const state = JSON.parse(fs.readFileSync('$STATE_FILE', 'utf8'));
        state.lastCheckpointAt = '$TIMESTAMP';
        fs.writeFileSync('$STATE_FILE', JSON.stringify(state, null, 2));
      " 2>/dev/null || true
    fi
  else
    # Create new state.json
    echo '{"version":1,"profile":"build","lastCheckpointAt":"'$TIMESTAMP'"}' > "$STATE_FILE"
  fi
fi
`,
    "utf8"
  );
  await ensureExecutable(postCommit);

  await fs.writeFile(
    prePush,
    `#!/bin/sh
# Pulse safeguard: never push without explicit permission.
# Allow push explicitly by running:
#   PULSE_ALLOW_PUSH=1 git push ...

if [ "$PULSE_SKIP_HOOKS" = "1" ]; then
  exit 0
fi

if [ "$PULSE_ALLOW_PUSH" != "1" ]; then
  echo "PULSE safeguard: push blocked. Set PULSE_ALLOW_PUSH=1 for an explicit push."
  exit 1
fi

# Run doctor check if pulse CLI is available
if command -v pulse >/dev/null 2>&1; then
  pulse doctor --hook pre-push
  EXIT_CODE=$?
elif command -v pulse-framework >/dev/null 2>&1; then
  pulse-framework doctor --hook pre-push
  EXIT_CODE=$?
else
  EXIT_CODE=0
fi

# Only block on CRITICAL (exit 2), allow warnings (exit 1) - consistent with pre-commit
if [ $EXIT_CODE -eq 2 ]; then
  echo ""
  echo "❌ Push blocked by PULSE (critical findings)"
  echo "   Fix issues or use: PULSE_SKIP_HOOKS=1 git push ..."
  exit 2
fi

exit 0
`,
    "utf8"
  );
  await ensureExecutable(prePush);

  // eslint-disable-next-line no-console
  console.log(`Installed git hooks:\n- ${preCommit}\n- ${postCommit}\n- ${prePush}`);
}
