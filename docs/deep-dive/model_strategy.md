# Pulse Deep Dive: Multi-Model Strategy

The "Single Model" era is over. Professional Pulse Engineers do not just "use AI"; they orchestrate a hierarchy of models based on the task type. 

We use the **80/15/5 Protocol**.

---

## Level 1: The Daily Driver (80%)
**Models:** Claude Sonnet (Latest), GPT-4o/5.x (via Cursor Agent Mode)
**Context:** Inside the IDE.
**Use Case:** 
- Standard feature implementation.
- Refactoring within a file.
- Writing tests.

**Why?** These models prioritize **Velocity**. They are fast, good at syntax, and integrate with the filesystem.

---

## Level 2: The Advisor (15%)
**Models:** Claude Web Interface (Opus-Class), ChatGPT Plus (Standard/Pro)
**Context:** External Browser Window.
**Use Case:** 
- "Agent is stuck" (Loop detected).
- "I need a second opinion on this error."
- "Explain this concept to me."

**The Trigger:**
If the IDE Agent fails the same test **twice**, do NOT try a third time. 
**Action:** Copy the error + the code -> Paste into Level 2 Model -> "What is wrong with this approach?"
**Why?** The IDE context often gets "polluted". A fresh chat window forces a context reset and provides an unbiased perspective.

---

## Level 3: The Heavy Lifter (5%)
**Models:** o1, Opus (Reasoning Models)
**Context:** External Browser or API.
**Use Case:**
- Architectural decisions ("How should we structure the DB?").
- Complex logical bugs (Race conditions, deadlock).
- Security audits.

**The Trigger:**
If Level 2 cannot explain the error, or if you are planning a feature >5 files.
**Action:** "Stop the Line". Do not write code. Switch to a Reasoning Model. Ask for a **Plan**.
**Why?** These models "think" before they speak. They are slow but architecturally sound.

---

## Summary Table

| Level | Role | Model Class | Trigger |
|-------|------|-------------|---------|
| **1** | **Builder** | High-Velocity (Sonnet/GPT-5.x) | Default State |
| **2** | **Advisor** | Chat (GPT/Claude) | 2x Loop Failure |
| **3** | **Architect** | Reasoning (o1/Opus) | Structural/Logic Failure |

