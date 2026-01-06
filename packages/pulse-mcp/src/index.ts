#!/usr/bin/env node

/**
 * PULSE MCP Server
 * 
 * Model Context Protocol Server für Cursor IDE Integration.
 * Exposed die Pulse CLI Funktionen als MCP Tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { registerStatusTool, handleStatusTool } from "./tools/status.js";
import { registerCheckpointTool, handleCheckpointTool } from "./tools/checkpoint.js";
import { registerDoctorTool, handleDoctorTool } from "./tools/doctor.js";
import { registerStartTool, handleStartTool } from "./tools/start.js";
import { registerEscalateTool, handleEscalateTool } from "./tools/escalate.js";
import { registerCorrectTool, handleCorrectTool } from "./tools/correct.js";
import { registerLearnTool, handleLearnTool } from "./tools/learn.js";
import { registerProfileTool, handleProfileTool } from "./tools/profile.js";
import { registerReviewTool, handleReviewTool } from "./tools/review.js";
import { registerRunTool, handleRunTool } from "./tools/run.js";

const server = new Server(
  {
    name: "pulse",
    version: "0.3.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register all tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      registerStatusTool(),
      registerCheckpointTool(),
      registerDoctorTool(),
      registerStartTool(),
      registerEscalateTool(),
      registerCorrectTool(),
      registerLearnTool(),
      registerProfileTool(),
      registerReviewTool(),
      registerRunTool(),
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "pulse_status":
        return await handleStatusTool(args);
      case "pulse_checkpoint":
        return await handleCheckpointTool(args);
      case "pulse_doctor":
        return await handleDoctorTool(args);
      case "pulse_start":
        return await handleStartTool(args);
      case "pulse_escalate":
        return await handleEscalateTool(args);
      case "pulse_correct":
        return await handleCorrectTool(args);
      case "pulse_learn":
        return await handleLearnTool(args);
      case "pulse_profile":
        return await handleProfileTool(args);
      case "pulse_review":
        return await handleReviewTool(args);
      case "pulse_run":
        return await handleRunTool(args as { action?: string; template?: string });
      default:
        return {
          content: [
            {
              type: "text",
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
