import type { Command } from "commander";
import { loadState, timestampId, writeArtifact } from "../lib/artifacts.js";
import { loadConfig } from "../lib/config.js";
import { promptText } from "../lib/input.js";
import { findRepoRoot } from "../lib/paths.js";
import { countProvidedElements, renderSixElementPrompt, validateOneAction } from "../lib/prompts.js";

export function registerStartCommand(program: Command): void {
  program
    .command("start")
    .description("Create a Start Pulse artifact + paste-ready prompt (6-element framework).")
    .option("--role <text>")
    .option("--context <text>")
    .option("--input <text>")
    .option("--action <text>")
    .option("--output <text>")
    .option("--examples <text>")
    .action(
      async (opts: {
        role?: string;
        context?: string;
        input?: string;
        action?: string;
        output?: string;
        examples?: string;
      }) => {
        const repoRoot = await findRepoRoot(process.cwd());
        if (!repoRoot) throw new Error("Not inside a git repository.");

        const [state, config] = await Promise.all([loadState(repoRoot), loadConfig(repoRoot)]);

        const el = { ...opts };

        // If user provided too little, ask interactively for the core trio.
        if (countProvidedElements(el) < 3) {
          el.role = el.role ?? (await promptText("ROLE", "Senior Software Engineer"));
          el.context = el.context ?? (await promptText("CONTEXT", ""));
          el.action = el.action ?? (await promptText("ACTION (one action only)", ""));
        }

        const prompt = renderSixElementPrompt(state.profile, el);
        const actionWarning = validateOneAction(el.action);
        const elementCount = countProvidedElements(el);

        const ts = timestampId();
        const filename = `${ts}-start.md`;
        const content = [
          `# Start Pulse (${ts})`,
          ``,
          `- Layer: **${state.profile}**`,
          `- Elements provided: **${elementCount}/6**`,
          actionWarning ? `- ⚠ Action warning: **${actionWarning}**` : `- Action: OK`,
          ``,
          `## Paste into Cursor (Agent Mode)`,
          ``,
          "```",
          prompt.trimEnd(),
          "```",
          ``,
          `## Notes`,
          `- Cheatsheet: docs/cheatsheet/PULSE-Cheatsheet.md`,
          `- Rules: .cursorrules`,
          ``,
        ].join("\n");

        const p = await writeArtifact(repoRoot, "pulses", filename, content);

        // eslint-disable-next-line no-console
        console.log(`Wrote ${p}`);
        // eslint-disable-next-line no-console
        console.log("\n---\nPaste-ready prompt:\n");
        // eslint-disable-next-line no-console
        console.log(prompt.trimEnd());

        if (config.enforcement !== "advisory" && actionWarning) {
          // eslint-disable-next-line no-console
          console.log(`\n[PULSE WARNING] ${actionWarning}`);
        }
      }
    );
}

