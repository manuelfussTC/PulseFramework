export type PulseLayer = "concept" | "build" | "escalation";

export type EnforcementMode = "advisory" | "mixed" | "strict";

export type NotificationMode = "terminal" | "macos" | "both";

export type ProjectType = "node" | "python" | "unknown";

export type PresetName = "frontend" | "backend" | "fullstack" | "monorepo" | "custom";

export type PresetConfig = {
  warnMaxFilesChanged: number;
  warnMaxLinesChanged: number;
  warnMaxDeletions: number;
  checkpointReminderMinutes: number;
  extraSecretPatterns?: string[];
};

export type PulseConfig = {
  version: 1;
  projectType: ProjectType;
  enforcement: EnforcementMode;
  notifications: NotificationMode;
  preset?: PresetName;
  thresholds: {
    warnMaxFilesChanged: number;
    warnMaxLinesChanged: number;
    warnMaxDeletions: number;
  };
  patterns: {
    secret: string[];
    prodUrl: string[];
  };
  commands: {
    test?: string;
  };
  checkpointReminderMinutes?: number;
};

export type PulseState = {
  version: 1;
  profile: PulseLayer;
  lastCheckpointAt?: string; // ISO
};

