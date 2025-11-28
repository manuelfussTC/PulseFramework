# Pulse Framework Specification v1.0

## 1. Introduction
Pulse is a methodology for controlled agentic development with Large Language Models (LLMs). It addresses the fundamental challenge of integrating autonomous coding agents into rigorous engineering workflows. Pulse is not a tool, but a standard—a set of protocols, architectural layers, and interaction patterns designed to ensure that human intent remains the governing force in AI-assisted software development.

## 2. Design Goals & Non-Goals

### Goals
- **Controllability:** Ensuring agent behavior is deterministic and bounded within specific scopes.
- **Repeatability:** Standardizing how engineers interact with agents to produce consistent results.
- **Safety:** Preventing destructive actions (data loss, regression) through architectural safeguards.
- **Measurable ROI:** Focusing on workflows that demonstrably reduce cycle time vs. manual coding.
- **Compatibility:** Agnostic to specific tools, applicable to Cursor, GitHub Copilot, Replit, etc.

### Non-Goals
- **AI Ethics:** This spec focuses purely on engineering utility and safety, not broader ethical implications.
- **Tool Hype:** Pulse avoids vendor-specific evangelism; it treats models as interchangeable components.
- **Prompt Library:** Pulse defines a framework for prompting, not a static collection of "magic words."

## 3. Core Concepts

### The 3-Layer Architecture
Pulse organizes development into three distinct cognitive layers:

1.  **Layer 1: Concept & Strategy (The Architect)**
    *   **Role:** High-level reasoning, architecture design, and requirement specification.
    *   **Model Class:** Advanced Reasoning Models (e.g., o1, Opus-class).
    *   **Output:** Strategy documents, pseudo-code, architectural diagrams. Code is rarely generated here directly.

2.  **Layer 2: Build & Implementation (The Builder)**
    *   **Role:** Execution of specific tasks defined by Layer 1. The "Agent Mode" environment.
    *   **Model Class:** High-Velocity Code Models (e.g., next-gen Sonnet, GPT-class execution).
    *   **Output:** Production-ready code, tests, refactors.

3.  **Layer 3: Escalation & Problem Solving (The Fixer)**
    *   **Role:** Handling edge cases, stuck agents, or complex logical bugs where Layer 2 fails.
    *   **Model Class:** Deep Reasoning / "Max" thinking modes.
    *   **Output:** Debug analysis, patch strategies, unblocking instructions.

### The Pulse Loops
Development proceeds in discrete units of work called **Pulses**:
-   **Start Pulse:** The initialization of a task. Establishes the `Context`, `Role`, and `Constraint`.
-   **Correction Pulse:** An intervention loop where the human provides steering feedback to a diverging agent.
-   **Review Pulse:** A verification step where code is audited against the spec before commitment.

### Advanced Workflow Patterns
-   **Parallel Pulse Orchestration:** Experienced engineers can run multiple Start Pulses in parallel (e.g., Feature A in Tab 1, Feature B in Tab 2), provided they share a locked Layer 1 context.
-   **The 3-Level Documentation System:**
    1.  **Project Context:** High-level goals (Layer 1).
    2.  **Tech Spec:** Implementation details (Layer 2).
    3.  **Work Log:** Decisions and loop outcomes (Layer 3).

### Workflow Patterns (Use Cases)
Pulse defines specific loop structures for different task types:
-   **Feature Expansion Loop:** Standard Start -> Correction -> Review.
-   **Bug Fix Loop:** Requires a reproduction test case in the Start Pulse. The loop cannot close until the test passes.
-   **Analysis Loop:** Agent is restricted to Read-Only access. Output is a Markdown report, not code.
-   **Refactor Loop:** Requires a strict "Behaviour Preservation" constraint.

### The 6-Element Prompt Framework
To ensure deterministic outputs, all instruction inputs (Pulses) should contain six elements:
1.  **Role:** Who is the agent acting as? (e.g., "Senior TypeScript Engineer").
2.  **Context:** What is the surrounding system state?
3.  **Input:** What specific data or file is being acted upon?
4.  **Action:** What exact transformation is required?
5.  **Output:** What is the expected format? (e.g., "Unified diff", "JSON").
6.  **Examples:** (Optional) One-shot or few-shot examples of success.

## 4. Process Model

A typical Pulse Loop follows this sequence:

1.  **Concept Phase (Layer 1):** Engineer defines the feature spec.
2.  **Start Pulse (Layer 2):** Engineer initiates the agent with the spec.
3.  **Build Loop:** Agent generates code.
    *   *Check:* Does it compile? Do tests pass?
4.  **Correction Pulse (Layer 2):** If minor issues arise, engineer guides the agent.
5.  **Review Pulse:** Engineer inspects the diff.
6.  **Commit:** Changes are saved to Git.
7.  **Escalation (Layer 3):** If the agent loops >3 times without success, the task moves to Layer 3 for root cause analysis.

**Key Principle:** The agent is never fully autonomous. It operates on a "supervised leash."

## 5. Safeguards, Energy & Failure Modes

### Energy Management (Sustainable Velocity)
Pulse is not just about code speed; it is about sustaining developer focus.
-   **Vibe Coding Definition:** A state of high-flow development where the human orchestrates and the AI executes. It is NOT "passive copy-pasting". It requires active cognitive engagement.
-   **Subjective Success Metrics:**
    -   *Do I understand this code?* (If No -> STOP).
    -   *Do I feel productive or like a bot?* (If Bot -> SWITCH task).
-   **The Context Switch Limit:** Do not run more than 2 parallel Pulse Loops. The cognitive load of switching contexts ("Start Pulse A" -> "Review Pulse B") degrades decision quality.
-   **Rest Intervals:** After 90 minutes of intensive Agent Mode, mandatory break or switch to Layer 1 (Strategy) work.

### Multi-Model Escalation Matrix
Pulse uses a strict hierarchy of models based on the problem complexity:
1.  **Level 1 (80% of cases): High-Velocity Models (e.g., Sonnet/GPT-4o)**
    -   *Use for:* Standard feature implementation, minor refactors.
    -   *Environment:* Inside IDE (Cursor Agent Mode).
2.  **Level 2 (15% of cases): "Advisor" Models (e.g., Claude Web/ChatGPT)**
    -   *Trigger:* Agent stuck in a loop > 2 iterations.
    -   *Action:* Copy error + code to external chat. Ask: "What is wrong with this approach?"
3.  **Level 3 (5% of cases): "Max" Reasoning Models (e.g., o1/Opus)**
    -   *Trigger:* Fundamental logic flaw or complex architecture bug.
    -   *Action:* Full "Stop the Line". Re-plan the architecture using reasoning models.

### Critical Safeguards
-   **Git Safety Net & Micro-Commits:**
    -   **Checkpoint Strategy:** Commit every 5-10 minutes.
    -   **Commit Rule:** Use "save points" before every complex agent instruction.
-   **Deletion Lock:** Agents are forbidden from deleting non-empty files without explicit, separate confirmation.
-   **30-Minute Rule:** If a task takes longer than 30 minutes of agent supervision without a result, it is a process failure—abort and redesign at Layer 1.

### The Debug Protocol: 50/50 Rule
When an agent fails, apply the **50/50 Rule** to decide between Rollback vs. Forward Patch:
-   **Rollback (50%):** If the agent introduces "magic" code you don't understand, or if the path is messy. **Revert immediately.**
-   **Forward Patch (50%):** Only if the error is a specific, isolated syntax/logic error that you fully understand.

### Common Failure Modes & Anti-Patterns
Even with the right structure, "Human Error" is the biggest risk.
1.  **Impatience & "Set in Stone" (Mistake #1):**
    *   *Symptom:* Engineer tries to build a complex feature in one prompt without checkpoints.
    *   *Result:* Agent hallucinates details; massive rollback required.
    *   *Pulse Fix:* Break tasks into 15-minute chunks.
2.  **Vague Assumptions (Mistake #2):**
    *   *Symptom:* Prompting "Make it better" or "Fix the bug" without context.
    *   *Result:* Agent rewrites code style instead of logic.
    *   *Pulse Fix:* Use the 6-Element Framework mandatory constraints.
3.  **Passive Observation (Red Flag):**
    *   *Symptom:* "I don't understand the code anymore."
    *   *Result:* Technical debt accumulates invisibly.
    *   *Pulse Fix:* Immediate stop. Switch to Layer 3 explanation mode.

### Common Failure Modes
-   **Looping:** The agent oscillates between two incorrect solutions. *Fix:* Stop, revert, and use Layer 3 to analyze why.
-   **Over-Editing:** The agent refactors code unrelated to the task. *Fix:* Strict context scoping in the Start Pulse.
-   **Broken Production:** Agent commits code that breaks existing functionality. *Fix:* Mandatory test runs before Review Pulse.

## 6. Evaluation & Metrics
Success with Pulse is measured by:
-   **Loop Incidents:** Number of times an agent required escalation.
-   **Rollback Frequency:** How often agent code had to be reverted.
-   **Task Velocity:** Time from Concept to Commit.

## 7. Versioning & Future Work
**Current Version:** 1.0

Future iterations of this specification will address:
-   Formal notation for defining Pulse Loops.
-   Language-agnostic API definitions for tool builders.
-   Integration patterns for CI/CD pipelines.

