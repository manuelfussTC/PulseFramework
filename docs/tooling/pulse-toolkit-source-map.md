# Pulse Toolkit: Source Map (Cheatsheet + Spec + PDF-Text)

This document proves that every operational rule in Pulse is represented as an executable feature (CLI / watcher / hooks / CI / optional IDE extension).

## Sources

- Cheatsheet: `docs/cheatsheet/PULSE-Cheatsheet.md`
- Spec: `spec/pulse-spec-v1.md`
- PDF-Text (extracted): `pulse_text.txt`
- Reference rules: `templates/.cursorrules`

## Cheatsheet 01–12 → Features

| Cheatsheet | Rule/Intent | Toolkit Feature(s) | Enforced / Warned |
|---|---|---|---|
| 01 Controlled Loops | Start → Loop → Correct → Review | `pulse start`, `pulse correct`, `pulse review`, `pulse escalate` (writes `.pulse/` artifacts + paste-ready prompts) | N/A |
| 02 3-Layer Architecture | Concept vs Build vs Escalation (don’t mix) | `pulse profile set concept|build|escalation` influences templates/outputs; `pulse start` validates structure | Warn |
| 03 6-Element Framework | Role/Context/Input/Action/Output/Examples | `pulse start` prompt-builder validates **min 3–4 elements** and **one action** | Warn |
| 04 30-Min Rule | Never unattended >30 min; checkpoint/review | `pulse watch` timer + reminders (terminal + macOS), suggests `pulse checkpoint` | Remind/Warn |
| 05 5 Critical Safeguards | Delete/Push/Deploy/Breaking/Secrets | `pulse doctor` checks; Git hooks + CI (mixed) block only **critical** cases | Mixed |
| 06 Loop Detection | 4 loop types + actions | `pulse doctor --loop` heuristics + action outputs + prompt templates (“explain what you understood”, “reset + choose approach”) | Warn |
| 07 3-Stage Escalation | Cursor explain → external model → model switch | `pulse escalate` builds a portable escalation package (includes Cursor explanation, diff stats, logs/tests if available) | N/A |
| 08 Git Safety Net | Commits every 5–10 min; reset strategies | `pulse checkpoint` analyzes diffs/logs, warns about huge changes, prints rollback commands; optionally runs tests | Warn |
| 09 `.cursorrules` Memory | “Solved once → remember forever” | `pulse learn` append-only memory + optional `.cursorrules` suggestion snippet generation | N/A |
| 10 Review Checklist | Code/function/security/git/docs | `pulse review` generates & stores checklist + outcome | Warn |
| 11 Red Flags | Stop immediately | `pulse doctor` red-flag scan (unknown deps, huge diff, deletes, prod URLs, secrets, debug leftovers) | Warn/Block (critical) |
| 12 Beginner Mistakes | Avoid vague prompts, impatience, over-scope | `pulse start` coach prompts + `pulse doctor` over-scope warnings + milestone suggestions | Warn |

## PDF-Text alignment notes (high-signal excerpts)

- **30-minute rule**: `pulse_text.txt` describes timer + frequent manual review and says “30 minutes is a maximum autonomy cap” → implemented in `pulse watch` reminders + `pulse checkpoint` workflow.
- **Safeguards**: PDF gives canonical wordings for Delete/Push/Deploy/Breaking/Secrets and notes Cursor settings as a first layer and `.cursorrules` as a second layer → we implement a third layer (tool-based checks + optional hooks/CI).
- **Loop actions**: PDF says after 2–3 “fixed but not” attempts: STOP, reject last 2–3 commits, escalate with Cursor explanation + error/code → implemented in `pulse doctor --loop` + `pulse escalate`.
- **Git workflow**: PDF provides `git log`, `git diff`, and reset commands → surfaced by `pulse checkpoint` output.

## Mixed enforcement definition (project policy)

**Block** only when one of these is detected (or explicitly configured otherwise):

- Secrets in diff
- Unsafe delete patterns without explicit confirmation flag
- Push to remote without explicit allow flag (hook-only)
- “Test-before-deploy” when configured as required and deploy markers are detected

Everything else is **warn + guidance**.

