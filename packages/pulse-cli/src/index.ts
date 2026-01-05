#!/usr/bin/env node

import { Command } from "commander";
import { registerInitCommand } from "./commands/init.js";
import { registerProfileCommand } from "./commands/profile.js";
import { registerStartCommand } from "./commands/start.js";
import { registerCorrectCommand } from "./commands/correct.js";
import { registerReviewCommand } from "./commands/review.js";
import { registerEscalateCommand } from "./commands/escalate.js";
import { registerCheckpointCommand } from "./commands/checkpoint.js";
import { registerDoctorCommand } from "./commands/doctor.js";
import { registerLearnCommand } from "./commands/learn.js";
import { registerWatchCommand } from "./commands/watch.js";

const program = new Command();

program
  .name("pulse")
  .description(
    "Pulse Toolkit CLI: controlled agentic development loops with guardrails, checkpoints, and escalation."
  )
  .version("0.1.0");

registerInitCommand(program);
registerProfileCommand(program);
registerStartCommand(program);
registerCorrectCommand(program);
registerReviewCommand(program);
registerEscalateCommand(program);
registerCheckpointCommand(program);
registerDoctorCommand(program);
registerLearnCommand(program);
registerWatchCommand(program);

program.parseAsync(process.argv).catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err?.stack || String(err));
  process.exit(1);
});

