# Example: Debug Loop & Escalation

## Overview
This example demonstrates a **failure scenario** where the standard Build Layer (Layer 2) fails to solve a problem, triggering the **Escalation Protocol** (Layer 3).

## The Flow
1.  **Start Pulse:** Agent asked to fix a complex race condition.
2.  **Build Loop (Fail):** Agent attempts a fix. Tests fail.
3.  **Correction Pulse (Fail):** Human provides a hint. Agent attempts again. Tests fail.
4.  **Loop Detection:** The system detects repeated failure (iteration count > limit).
5.  **Decision Gate (50/50 Rule):**
    *   *Path A (Forward):* Error is simple? Apply patch.
    *   *Path B (Rollback):* Code is messy? Revert to state at Step 1.
6.  **Escalation:** The task is moved from Layer 2 (Build) to Layer 3 (Escalation).
7.  **Resolution:** A higher-reasoning model analyzes the root cause instead of just writing code.

See `debug_loop.ts` for the code logic handling this state transition.

