# RFC / Feedback for Cursor Team

**Subject:** Architectural Gap: Agent Mode lacks Deterministic Control (Loop Detection)
**To:** founders@cursor.com, hi@cursor.com (or via Forum/Discord)

---

**Context:**
We deploy Cursor in enterprise environments using the **Pulse Framework** (a 3-Layer Control Architecture). While Cursor is the leader in AI-IDE integration, we are hitting a scalability ceiling in "Agent Mode".

**The Problem: Infinite Error Loops**
Agents in Cursor often get stuck in a "Fix -> Terminal Fail -> Fix" loop. Currently, the user must manually watch the terminal to stop this. This is "Baby-sitting", not Engineering.

**The Pulse Solution:**
We enforce a strict rule: If the same error code appears 3 times, we escalate to a reasoning model. Currently, we have to do this manually.

**The Feature Request (Technically Feasible):**
We need **Automated Loop Detection** in `.cursorrules`.

1.  **Terminal Error Counting:** Detect if the *same* terminal exit code (e.g., `1`) or error string occurs >2 times in a row.
2.  **Auto-Pause:** If the count is hit, PAUSE the Agent and prompt the user: *"Loop Detected. Escalate to Reasoning Model?"*
3.  **Context Pinning:** Allow us to tag specific files (e.g., `spec/*.md`) as `read-only-reference`. The Agent must be system-prompted to *never* suggest edits to these files.

**Why this matters:**
Without this, Agent Mode is unsafe for unattended tasks. With this, it becomes an enterprise-grade tool.

**Reference:**
[GitHub: PulseFramework/CHALLENGES.md]

Best,
[Your Name]
