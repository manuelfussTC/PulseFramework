# RFC / Feedback for Anthropic (Artifacts Team)

**Subject:** UX Request: "Freeze Mode" for Artifacts
**To:** feedback@anthropic.com

---

**Context:**
Claude 4.5 Sonnet + Artifacts is our default "Build Environment" in the **Pulse Framework**. We love the real-time updates, but they pose a significant "Hot-Edit" risk in production workflows.

**The Problem: Unwanted Overwrites**
When we ask for a small change ("Make the button blue"), Claude often re-renders the *entire* Artifact logic, occasionally dropping edge-case handling we added 5 turns ago. We lose code without realizing it.

**The Feature Request (Technically Feasible):**
We need a **"Freeze / Thaw" Toggle** on the Artifact UI.

1.  **Freeze Mode:** When active, Claude CANNOT edit the Artifact code. It can only suggest changes in the chat or explain the code.
2.  **Thaw (Edit Mode):** We explicitly click "Edit" to allow updates.
3.  **Diff View:** When an update comes in, show us a "Review Diff" overlay before the Artifact re-renders.

**Why this matters:**
This allows us to implement a **"Review Pulse"**. We can discuss the change with Claude *before* it destroys the current working state.

**Reference:**
[GitHub: PulseFramework/CHALLENGES.md]

Best,
[Your Name]
