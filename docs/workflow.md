# How We Work with PULSE + Cursor

> The recommended workflow for controlled AI-assisted development.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  1. START SESSION                                               │
│     pulse run                                                   │
│     → Choose template                                          │
│     → Define ACTION                                            │
│     → Paste prompt into Cursor                                 │
├─────────────────────────────────────────────────────────────────┤
│  2. DURING WORK                                                 │
│     → Every 5-10 min: pulse checkpoint                         │
│     → When uncertain: pulse status                             │
│     → On problems: pulse doctor --loop                         │
├─────────────────────────────────────────────────────────────────┤
│  3. ON PROBLEMS                                                 │
│     pulse escalate                                              │
│     → Describe problem                                         │
│     → Prompt to external model (GPT-5/Claude)                  │
│     → Instructions back to Cursor                              │
├─────────────────────────────────────────────────────────────────┤
│  4. CONCLUSION                                                  │
│     pulse review                                                │
│     → Check Decision Briefing                                  │
│     → Approve / Reject / Escalate                              │
├─────────────────────────────────────────────────────────────────┤
│  5. SAVE KNOWLEDGE                                              │
│     pulse learn                                                 │
│     → Document problem                                         │
│     → Record solution                                          │
│     → Derive rule                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Start Session

### Option A: Combined Workflow (recommended)

```bash
pulse run
```

This command:
1. Asks for template (feature, bugfix, refactor, etc.)
2. Collects ACTION and CONTEXT
3. Generates structured prompt
4. Starts checkpoint watcher
5. Offers review at the end

### Option B: Single Prompt

```bash
pulse s --action "Implement user dashboard" -C
```

The `-C` flag copies the prompt directly to clipboard.

### Option C: Quick Bug-Fix

```bash
pulse s --ist "Button doesn't work" --soll "Button should be clickable"
```

---

## 2. During Work

### Check Regularly

```bash
# Quick status
pulse status

# Example output:
# 🔨 backend/build | 🟢 8m | 📝 5 files | ✅ ok
```

### Set Checkpoints (every 5-10 min)

```bash
pulse checkpoint -m "feat: Dashboard UI implemented"

# Or short:
pulse c -m "wip: progress"
```

### When Uncertain: Doctor

```bash
pulse doctor --loop

# Checks:
# - Secrets in code?
# - Too many changes?
# - Loop signals (fix-chain, reverts)?
```

---

## 3. On Problems

### When to Escalate?

- After 2-3 unsuccessful fix attempts
- When Cursor runs in circles
- On unclear root cause
- When you need a second opinion

### Create Escalation

```bash
pulse escalate --auto-include -C
```

**Flow:**
1. Describe problem
2. What did Cursor try?
3. Enter error message
4. Relevant files are auto-included
5. Prompt is generated and copied

**Then:**
1. Paste prompt into ChatGPT / Claude / GPT-5
2. Read analysis and step-by-step instructions
3. Give instructions to Cursor (DON'T blindly copy code!)

---

## 4. Conclusion

### Create Review

```bash
pulse review
```

**Decision Briefing shows:**

```
┌─────────────────────────────────────────────────────────────────┐
│ PULSE Review – Decision Briefing                                │
├─────────────────────────────────────────────────────────────────┤
│ SCOPE-CHECK (backend preset)                                    │
│   Files: 8/15 (53%)  ████████░░░░░░░                           │
│   Lines: 280/400 (70%)  ██████████████░░                       │
├─────────────────────────────────────────────────────────────────┤
│ RISK-SUMMARY                                                    │
│   ⚠️ 2 Warnings                                                 │
│   ⏱️ Checkpoint 12 min ago                                      │
│   🟢 Loop-Risk: LOW                                             │
├─────────────────────────────────────────────────────────────────┤
│ ✅ RECOMMENDATION: APPROVE                                      │
│   → No critical findings, scope OK                             │
└─────────────────────────────────────────────────────────────────┘
```

**Decision:**
- **Approve**: All good, can be merged
- **Reject**: Problems found, back to Cursor
- **Escalate**: Unclear, needs external analysis

---

## 5. Save Knowledge

### After Solved Problems

```bash
pulse learn
```

**Input:**
- What was the problem?
- What was the solution?
- What rule do you derive?

**Example:**
```
Problem: Prisma 5 breaking change in findUnique
Solution: Replace { rejectOnNotFound: true } with orThrow()
Rule: Always check Migration Guide on Prisma updates
```

**Auto-Promotion:** The rule can be automatically added to `.cursorrules`.

---

## Safeguards (non-negotiable)

These rules ALWAYS apply:

| Safeguard | Description |
|-----------|-------------|
| ⏱️ 30-Min-Limit | After 30 min autonomous → STOP + ask |
| 🗑️ Delete Guard | NO file deletion without confirmation |
| 📤 Push Guard | NO git push without confirmation |
| 🔐 Secrets Guard | NO API keys, passwords in code |
| 📋 Checkpoint | Git commit every 5-10 min |

---

## Presets

When running `pulse init` you choose a preset that sets the limits:

| Preset | Max Lines | Max Files | Checkpoint |
|--------|-----------|-----------|------------|
| frontend | 200 | 10 | 20 min |
| backend | 400 | 15 | 30 min |
| fullstack | 500 | 20 | 25 min |
| monorepo | 800 | 30 | 30 min |

On exceeding, `pulse doctor` warns.

---

## Command Reference (Quick)

| What | Command |
|------|---------|
| Check status | `pulse status` |
| Start session | `pulse run` |
| Single prompt | `pulse s --action "..." -C` |
| Checkpoint | `pulse c -m "message"` |
| Check safeguards | `pulse d --loop` |
| Escalate | `pulse e --auto-include -C` |
| Review | `pulse r` |
| Save knowledge | `pulse learn` |

---

## Troubleshooting

### "Cursor runs in circles"

```bash
pulse doctor --loop
# Shows loop signals

pulse escalate
# Have problem analyzed externally
```

### "Too many changes"

```bash
pulse status --verbose
# Shows scope utilization

pulse checkpoint -m "wip: split"
# Save intermediate state
```

### "I'm uncertain"

```bash
pulse review
# Decision Briefing gives recommendation
```

---

## Checklist: Before Merge

- [ ] `pulse review` executed
- [ ] No critical findings
- [ ] Scope within limit (or consciously exceeded)
- [ ] Loop risk LOW
- [ ] Code understood (not blindly adopted)
- [ ] Tested locally

---

*Workflow documentation for PULSE Framework v0.3*
