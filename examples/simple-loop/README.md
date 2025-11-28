# Example: Simple Pulse Loop

## Overview
This example demonstrates a minimal, successful Pulse workflow for a standard feature request: **Building a simple API endpoint.**

It illustrates the three core pulses in action:
1.  **Start Pulse:** Initializing the task with context and constraints.
2.  **Correction Pulse:** A minor adjustment requested by the human.
3.  **Review Pulse:** Final verification and acceptance.

## The Flow
-   **Context:** The system needs a new endpoint `GET /api/status`.
-   **Agent Action:** Scaffolds the route.
-   **Human Action:** Notices a missing type definition (Correction Pulse).
-   **Agent Action:** Fixes the type.
-   **Human Action:** Approves and merges (Review Pulse).

See `pulse_loop.ts` for the code representation of this flow.

