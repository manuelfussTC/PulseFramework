# RFC / Feedback for Cursor Team

**Subject:** Feature Request: Agent Mode Constraints based on Pulse Framework
**To:** founders@cursor.com, hi@cursor.com (or via Forum/Discord)

---

**Context:**
We are deploying Cursor in enterprise environments using the **Pulse Framework** (a 3-Layer Control Architecture). While Cursor is currently the best tool for this, we are hitting specific ceilings in "Composer" and "Agent Mode" that limit scalability.

**The Problem: Layer Collapse**
Your current Agent implementations treat all context as equal. An agent fixing a bug (Layer 2) often hallucinates changes to the architectural spec (Layer 1) to make the bug "go away." This is a critical failure mode in large codebases.

**The Pulse Solution (Current Manual Workaround):**
We force engineers to manually "re-paste" architectural rules in every prompt to ensure the agent doesn't drift. This is inefficient.

**The Technical Challenge / Request:**
We need **Context Pinning** in `.cursorrules` or the UI.

1.  **Immutable Context:** Allow us to tag specific files (e.g., `spec/*.md`) as `read-only-reference`. The Agent must be system-prompted to *never* suggest edits to these files, only read them as ground truth.
2.  **Loop Detection:** If Composer applies an edit, runs a terminal command, fails, and retries the *same* edit >2 times, the UI should pause and flag "Potential Loop".
3.  **Deletion Guard:** Any generated diff that deletes >50 lines of code should require a distinct "Unsafe Apply" click, separate from the standard "Cmd+K" flow.

**Reference:**
We have documented these failure modes in our open standard: [GitHub: PulseFramework/CHALLENGES.md]

We would love to share telemetry from our usage if you are interested in hardening Agent Mode for enterprise control.

Best,
[Your Name]

