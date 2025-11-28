# RFC / Feedback for Anthropic (Artifacts Team)

**Subject:** "Artifacts" need Engineering Lifecycle States (Draft vs. Review)
**To:** feedback@anthropic.com

---

**Context:**
Claude 4.5 Sonnet + Artifacts is currently the gold standard for our **Layer 1 (Concept)** and **Layer 2 (Build)** tasks in the **Pulse Framework**. However, Artifacts lack the lifecycle states necessary for safe deployment.

**The Problem: The "Hot-Edit" Risk**
Artifacts update instantly in real-time. In an engineering context, this is dangerous. A "Correction Pulse" (human feedback) often causes Claude to rewrite the entire component, losing edge-case handling from previous versions.

**The Pulse Solution:**
We require a **Review Pulse**—a frozen state where code is inspected before it is "accepted."

**The Technical Challenge / Request:**
We need **Artifact Version Control**.

1.  **Draft vs. Published:** An Artifact should have a "Draft" mode where Claude iterates, and a "Published" mode which is pinned. Claude should not be able to overwrite the "Published" version without an explicit "Promote Draft" user action.
2.  **Diff View:** Show us `diff(Version N, Version N-1)` directly in the Artifact UI.
3.  **Test Runner:** Allow us to define a simple "Assertion" (e.g., "Must contain function X") that runs automatically against new Artifact versions.

**Reference:**
We define this "Review Pulse" requirement in our spec: [GitHub: PulseFramework/CHALLENGES.md].

We believe Artifacts can replace local IDEs for many tasks, but only if they adopt these software engineering primitives.

Best,
[Your Name]

