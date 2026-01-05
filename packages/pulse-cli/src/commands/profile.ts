import type { Command } from "commander";
import { loadState, saveState } from "../lib/artifacts.js";
import { findRepoRoot } from "../lib/paths.js";
import type { PulseLayer } from "../lib/types.js";

export function registerProfileCommand(program: Command): void {
  const profileCmd = program
    .command("profile")
    .description("View or set the active Pulse layer profile (concept/build/escalation).");

  // Show current profile
  profileCmd
    .command("show", { isDefault: true })
    .description("Show current profile")
    .action(async () => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not inside a git repository.");
      const state = await loadState(repoRoot);
      // eslint-disable-next-line no-console
      console.log(state.profile);
    });

  // Set profile
  profileCmd
    .command("set <layer>")
    .description("Set profile: concept | build | escalation")
    .action(async (layer: string) => {
      const repoRoot = await findRepoRoot(process.cwd());
      if (!repoRoot) throw new Error("Not inside a git repository.");

      if (!["concept", "build", "escalation"].includes(layer)) {
        throw new Error(`Invalid layer: ${layer}. Use: concept | build | escalation`);
      }

      const state = await loadState(repoRoot);
      state.profile = layer as PulseLayer;
      await saveState(repoRoot, state);
      // eslint-disable-next-line no-console
      console.log(`Profile set to ${state.profile}`);
    });
}

