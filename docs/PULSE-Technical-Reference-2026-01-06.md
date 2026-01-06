# PULSE Framework - Technical Reference

**Version:** 0.3.0  
**Datum:** 2026-01-06  
**Packages:** `@pulseframework/pulse-cli`, `@pulseframework/pulse-mcp`

---

## Inhaltsverzeichnis

1. [MCP Tools](#mcp-tools)
2. [CLI Commands](#cli-commands)
3. [Konfiguration](#konfiguration)
4. [Automatisierung (Cursor Rules)](#automatisierung)
5. [Datenstrukturen](#datenstrukturen)

---

## MCP Tools

MCP (Model Context Protocol) Tools werden von Cursor automatisch aufgerufen. Der MCP Server läuft als Hintergrundprozess.

### `pulse_status`

**Zweck:** Projekt-Status abrufen (PFLICHT vor jeder Agent-Antwort)

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "json": {
      "type": "boolean",
      "description": "JSON-Output statt formatiert"
    }
  }
}
```

**Beispiel-Aufruf:**
```
pulse_status
```

**Beispiel-Output:**
```
📊 PULSE Status

🔨 Profil: build
🔴 Checkpoint: vor 18 Min
📝 Dateien: 5
📏 Lines: 234

📊 Scope (frontend Preset):
   Files: ████████░░░░░░░ 50% (5/10)
   Lines: ██████████████░ 93% (234/250)

🔍 Findings:
   ⚠️ 2 Warnings

🟢 Loop-Risiko: LOW

💡 Empfehlung: CHECKPOINT
   → 18 Min seit Checkpoint
   → pulse checkpoint -m 'wip: progress'
```

**JSON-Output:**
```json
{
  "profile": "build",
  "preset": "frontend",
  "minutesSinceCheckpoint": 18,
  "filesChanged": 5,
  "linesChanged": 234,
  "warnings": 2,
  "criticals": 0,
  "loopRisk": "LOW",
  "recommendation": "checkpoint"
}
```

---

### `pulse_run`

**Zweck:** Neuen Workflow starten (Branch erstellen + Arbeitsauftrag)

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "description": "Was soll gemacht werden?"
    },
    "template": {
      "type": "string",
      "enum": ["feature", "bugfix", "refactor", "concept", "analyze"]
    },
    "branch": {
      "type": "string",
      "description": "Branch-Name (optional, wird automatisch generiert)"
    }
  },
  "required": ["action"]
}
```

**Beispiel-Aufruf:**
```
pulse_run action="User Dashboard implementieren" template="feature"
```

**Automatische Aktionen:**
1. Prüft aktuellen Branch
2. Erstellt Feature-Branch wenn auf main/master: `feature/user-dashboard-implementieren`
3. Speichert Worklog in `.pulse/pulses/`
4. Gibt Arbeitsauftrag zurück

**Beispiel-Output:**
```
# 🚀 ARBEITSAUFTRAG

✅ Branch erstellt: `feature/user-dashboard-implementieren`

**ACTION:** User Dashboard implementieren

## JETZT SOFORT ANFANGEN

Du bist der Agent. Beginne DIREKT mit der Implementierung.

## Deine Aufgabe

Implementiere: **User Dashboard implementieren**

Template: feature
Profil: frontend/build
Branch: feature/user-dashboard-implementieren

## Während der Arbeit

- ⏱️ **Checkpoint alle 15 Min:** `pulse_checkpoint` aufrufen
- 🔍 **Nach Code-Änderungen:** `pulse_doctor` aufrufen
- ❌ **Bei Problemen nach 2-3 Versuchen:** `pulse_escalate`

---

**BEGINNE JETZT MIT DER IMPLEMENTIERUNG.**
```

---

### `pulse_checkpoint`

**Zweck:** Git-Commit mit Validierung erstellen

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "message": {
      "type": "string",
      "description": "Commit-Message"
    },
    "runTests": {
      "type": "boolean",
      "description": "Tests vor Commit ausführen"
    }
  }
}
```

**Beispiel-Aufruf:**
```
pulse_checkpoint message="feat: add login form"
```

**Automatische Aktionen:**
1. `pulse doctor` ausführen (Safeguards prüfen)
2. Bei Critical Findings: Abbruch
3. `git add -A`
4. `git commit -m "<message>"`
5. State aktualisieren (lastCheckpointAt)

**Beispiel-Output:**
```
✅ Checkpoint erstellt

Commit: abc1234
Message: feat: add login form
Files: 3 files changed
Lines: +45 -12

⏱️ Nächster Checkpoint in ~15 Min empfohlen
```

**Bei Fehler (Safeguard Violation):**
```
❌ Checkpoint abgebrochen

🚨 Critical Finding: SECRETS
   API Key gefunden in src/config.ts

Behebe das Problem und versuche erneut.
```

---

### `pulse_doctor`

**Zweck:** Safeguards und Red Flags prüfen

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "staged": {
      "type": "boolean",
      "description": "Nur staged Changes prüfen"
    },
    "loop": {
      "type": "boolean",
      "description": "Loop-Detection aktivieren"
    }
  }
}
```

**Beispiel-Aufruf:**
```
pulse_doctor loop=true
```

**Geprüfte Patterns:**

| Code | Severity | Beschreibung |
|------|----------|--------------|
| `SECRETS` | critical | API Keys, Passwords, Tokens |
| `PROD_URL` | warn/critical | Production URLs im Code |
| `MASS_DELETE` | critical | Datei-Löschungen |
| `BIG_CHANGESET` | warn | Zu viele Änderungen |
| `UNKNOWN_DEPS` | warn | Neue Dependencies |
| `CONSOLE_LOG` | warn | Debug-Output |
| `LOOP_SIGNAL` | warn/critical | Loop-Patterns erkannt |

**Loop-Detection Patterns:**

| Pattern | Erkennung |
|---------|-----------|
| `fix_chain` | 3+ "fix" Commits hintereinander |
| `revert` | Revert-Commits im Log |
| `churn` | Gleiche Datei 5+ mal geändert |
| `pendeln` | Ähnliche Commit-Messages |
| `fix_no_test` | Fix ohne Test-Änderung |

**Beispiel-Output:**
```
🔍 Pulse Doctor (working tree)

Profil: frontend/build
Scope: 5 files | +234 -45 lines
Limits (frontend): Files 50%, Lines 93%

⚠️ UNKNOWN_DEPS: Neue Dependencies erkannt (3): Kennst du diese?
     + axios @ ^1.6.0
     + lodash @ ^4.17.21
     + dayjs @ ^1.11.10

⚠️ LOOP_SIGNAL: 3x "fix" Commits in den letzten 15 Commits.
   Möglicher Fix-Loop.

🔴 Loop-Risiko: HIGH

🚨 EMPFEHLUNG: ESCALATE
   → Hohes Loop-Risiko erkannt
   → pulse escalate
```

---

### `pulse_escalate`

**Zweck:** Problem an externes Model eskalieren

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "problem": {
      "type": "string",
      "description": "Problem-Beschreibung"
    },
    "tried": {
      "type": "string",
      "description": "Was wurde bereits versucht?"
    },
    "error": {
      "type": "string",
      "description": "Fehlermeldung"
    },
    "stage": {
      "type": "number",
      "enum": [1, 2, 3],
      "description": "Eskalationsstufe"
    },
    "autoInclude": {
      "type": "boolean",
      "description": "Relevante Dateien automatisch inkludieren"
    }
  },
  "required": ["problem"]
}
```

**Beispiel-Aufruf:**
```
pulse_escalate 
  problem="Auth Token wird nicht refreshed"
  tried="useEffect mit Dependency Array, axios interceptor"
  error="401 Unauthorized nach 1h"
  stage=2
  autoInclude=true
```

**Beispiel-Output:**
```
# 🚨 ESKALATION (Stufe 2)

## Problem
Auth Token wird nicht refreshed

## Kontext
- Projekt: MyApp (React/TypeScript)
- Branch: feature/auth-improvements
- Letzte Änderungen: 5 Dateien

## Was wurde versucht
- useEffect mit Dependency Array
- axios interceptor

## Fehlermeldung
```
401 Unauthorized nach 1h
```

## Relevante Dateien

<file path="src/hooks/useAuth.ts">
// ... Code ...
</file>

<file path="src/api/client.ts">
// ... Code ...
</file>

## Frage an externes Model
Analysiere das Problem und schlage eine Lösung vor.
Beachte: Der Agent hat bereits 2-3 Versuche gemacht.

---

📋 Prompt für ChatGPT/Claude kopieren oder MCP-Tool in anderem Fenster nutzen.
```

---

### `pulse_correct`

**Zweck:** Kurskorrektur bei laufender Arbeit

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "feedback": {
      "type": "string",
      "description": "Was soll anders gemacht werden?"
    },
    "mode": {
      "type": "string",
      "enum": ["narrow", "expand", "pivot", "explain", "milestone"],
      "description": "Art der Korrektur"
    }
  },
  "required": ["feedback"]
}
```

**Modes:**

| Mode | Beschreibung |
|------|--------------|
| `narrow` | Fokussieren, weniger machen |
| `expand` | Scope erweitern |
| `pivot` | Komplett andere Richtung |
| `explain` | Agent soll erklären was er versteht |
| `milestone` | Kleinere Zwischenziele setzen |

**Beispiel-Aufruf:**
```
pulse_correct feedback="Zu komplex, mach es einfacher" mode="narrow"
```

---

### `pulse_review`

**Zweck:** Decision Briefing vor Merge/Ende

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "full": {
      "type": "boolean",
      "description": "Ausführliche Checklist"
    },
    "json": {
      "type": "boolean",
      "description": "JSON-Output"
    }
  }
}
```

**Beispiel-Output:**
```
┌───────────────────────────────────────────────────────┐
│ PULSE Review – Decision Briefing                      │
├───────────────────────────────────────────────────────┤
│ Profil: frontend/build                                │
├───────────────────────────────────────────────────────┤
│ SCOPE-CHECK                                           │
│  Files: 8/10 (80%)  ████████████░░░                   │
│  Lines: 180/250 (72%)  ███████████░░░░                │
│  Deletes: 12/30 (40%)  ██████░░░░░░░░░                │
├───────────────────────────────────────────────────────┤
│ RISIKO-SUMMARY                                        │
│  ✅ 0 Critical, ⚠️ 2 Warnings                         │
│  ⏱️ Checkpoint vor 8 Min                              │
│  🟢 Loop-Risiko: LOW                                  │
├───────────────────────────────────────────────────────┤
│ ✅ EMPFEHLUNG: APPROVE                                │
│  → Scope OK, keine kritischen Findings               │
│  → Bereit für PR                                      │
└───────────────────────────────────────────────────────┘
```

---

### `pulse_learn`

**Zweck:** Wissen aus gelösten Problemen speichern

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "problem": {
      "type": "string",
      "description": "Was war das Problem?"
    },
    "solution": {
      "type": "string",
      "description": "Wie wurde es gelöst?"
    },
    "rule": {
      "type": "string",
      "description": "Welche Regel ergibt sich daraus?"
    }
  },
  "required": ["problem", "solution"]
}
```

**Beispiel-Aufruf:**
```
pulse_learn 
  problem="Race Condition bei Token Refresh"
  solution="useRef statt useState für Token"
  rule="Auth-State immer mit useRef, nicht useState"
```

**Beispiel-Output:**
```
✅ Wissen gespeichert

📁 Datei: .pulse/memory/2026-01-06T12-00-00.000Z-learning.md

Soll die Regel zu .cursorrules hinzugefügt werden?
→ "Auth-State immer mit useRef, nicht useState"
```

---

### `pulse_profile`

**Zweck:** Arbeits-Layer wechseln

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "action": {
      "type": "string",
      "enum": ["show", "set"]
    },
    "layer": {
      "type": "string",
      "enum": ["concept", "build", "escalation"]
    }
  }
}
```

**Layer:**

| Layer | Beschreibung | Typisches Tool |
|-------|--------------|----------------|
| `concept` | Planung, Architektur | ChatGPT/Claude |
| `build` | Implementierung | Cursor |
| `escalation` | Komplexe Probleme | GPT-4/Opus |

---

### `pulse_reset`

**Zweck:** Git-Reset mit Safeguards

**Input Schema:**
```json
{
  "type": "object",
  "properties": {
    "commits": {
      "type": "number",
      "description": "Anzahl Commits zurück (default: 1)"
    },
    "mode": {
      "type": "string",
      "enum": ["soft", "mixed", "hard"]
    }
  }
}
```

**Beispiel-Output:**
```
🔄 PULSE Reset

📍 Branch: feature/user-dashboard
📋 Betroffene Commits (1):
   🗑️ abc1234 fix: button color

   ✅ Neuer HEAD: def5678 feat: add login form

🔧 Führe aus: git reset --mixed HEAD~1

✅ Reset erfolgreich!
📍 Neuer HEAD: def5678 feat: add login form
```

---

## CLI Commands

### Installation

```bash
# Global (nach npm link)
pulse <command>

# Oder via npx (wenn veröffentlicht)
npx @pulseframework/pulse-cli <command>
```

### `pulse init`

```bash
# Interaktiv
pulse init

# Mit Optionen
pulse init --preset frontend --mcp --hooks

# Für andere Editoren
pulse init --agents
```

**Erstellt:**
- `.pulse/` - Artefakt-Verzeichnis
- `pulse.config.json` - Konfiguration
- `.cursorrules` - Fallback-Regeln
- `.cursor/rules/pulse.mdc` - Cursor Rules (mit --mcp)
- `.cursor/mcp.json` - MCP Config (mit --mcp)
- `AGENTS.md` - Universal Rules (mit --agents)

---

### `pulse status`

```bash
pulse status              # Kurzform
pulse status --verbose    # Ausführlich
pulse status --json       # JSON-Output
pulse status --share      # Markdown für Slack/Discord
```

---

### `pulse start`

```bash
# Interaktiv
pulse start

# Quick Mode (für MCP)
pulse start --template feature --action "Dashboard" --quick

# Mit allen Elementen
pulse start \
  --role "Senior React Developer" \
  --context "E-Commerce App" \
  --action "User Dashboard implementieren" \
  --output "Funktionierendes Dashboard mit Tests"
```

---

### `pulse checkpoint`

```bash
pulse checkpoint -m "feat: add login form"
pulse checkpoint -m "wip: progress" --test
```

---

### `pulse doctor`

```bash
pulse doctor              # Working tree
pulse doctor --staged     # Nur staged
pulse doctor --loop       # Mit Loop-Detection
pulse doctor --ci         # CI Mode (Exit Codes)
```

**Exit Codes:**
- `0` - Keine Findings
- `1` - Warnings
- `2` - Critical Findings

---

### `pulse review`

```bash
pulse review              # Decision Briefing
pulse review --full       # Mit Checklist
pulse review --json       # JSON-Output
```

---

### `pulse escalate`

```bash
# Interaktiv
pulse escalate

# Mit Optionen
pulse escalate \
  --problem "Auth Token Bug" \
  --tried "useEffect, interceptor" \
  --stage 2 \
  --auto-include \
  --clipboard
```

---

### `pulse reset`

```bash
pulse reset               # 1 Commit zurück, interaktiv
pulse reset -n 3          # 3 Commits zurück
pulse reset --hard        # Hard Reset
pulse reset -y            # Ohne Bestätigung
```

---

### `pulse run`

```bash
pulse run                 # Interaktiver Workflow
```

---

### `pulse watch`

```bash
pulse watch               # Startet Watcher
pulse watch --interval 10 # Custom Intervall (Minuten)
```

---

### `pulse learn`

```bash
pulse learn \
  --problem "Race Condition" \
  --solution "useRef statt useState" \
  --rule "Auth-State mit useRef"
```

---

### `pulse profile`

```bash
pulse profile             # Aktuelles Profil anzeigen
pulse profile set build   # Profil setzen
pulse profile set concept
pulse profile set escalation
```

---

## Konfiguration

### `pulse.config.json`

```json
{
  "preset": "frontend",
  "enforcement": "mixed",
  "thresholds": {
    "warnMaxFilesChanged": 10,
    "warnMaxLinesChanged": 250,
    "warnMaxDeletions": 30
  },
  "checkpointReminderMinutes": 15,
  "patterns": {
    "secret": [
      "(?i)(api[_-]?key|password|secret|token)\\s*[:=]\\s*['\"][^'\"]+['\"]",
      "(?i)bearer\\s+[a-zA-Z0-9_-]+",
      "-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----"
    ],
    "prodUrl": [
      "https?://[a-zA-Z0-9.-]+\\.(com|io|net|org|de)"
    ]
  }
}
```

### Presets

| Preset | Max Files | Max Lines | Checkpoint |
|--------|-----------|-----------|------------|
| `frontend` | 10 | 250 | 15 Min |
| `backend` | 15 | 400 | 20 Min |
| `fullstack` | 15 | 300 | 15 Min |
| `monorepo` | 25 | 600 | 25 Min |
| `custom` | 15 | 300 | 30 Min |

---

## Automatisierung

### `.cursor/rules/pulse.mdc`

```yaml
---
description: PULSE Framework - Automatische Safeguards
globs: *
alwaysApply: true
---
```

**Wird bei JEDER Chat-Nachricht injiziert.**

### Automatische Trigger

| Trigger | Tool |
|---------|------|
| Jede Nachricht | `pulse_status` |
| Nach Code-Änderung | `pulse_doctor` |
| >10 Min seit Checkpoint | Empfehlung |
| >30 Min autonom | STOP |
| Loop erkannt | `pulse_escalate` |
| DELETE Operation | User-Bestätigung |

---

## Datenstrukturen

### `.pulse/` Verzeichnis

```
.pulse/
├── pulses/           # Start-Prompts
│   └── 2026-01-06T12-00-00.000Z-start.md
├── reviews/          # Review-Dokumente
│   └── 2026-01-06T12-30-00.000Z-review.md
├── escalations/      # Eskalations-Prompts
│   └── 2026-01-06T13-00-00.000Z-escalation.md
├── worklogs/         # Arbeits-Protokolle
│   └── 2026-01-06.json
├── memory/           # Gelerntes Wissen
│   └── 2026-01-06T14-00-00.000Z-learning.md
└── state.json        # Aktueller Status
```

### `state.json`

```json
{
  "profile": "build",
  "lastCheckpointAt": "2026-01-06T12:00:00.000Z",
  "currentAction": "User Dashboard implementieren",
  "sessionStartedAt": "2026-01-06T10:00:00.000Z"
}
```

---

## Versionen

- **CLI:** 0.3.0
- **MCP:** 0.3.0
- **Node.js:** >=18
- **Cursor:** >=0.40

---

## Templates

### Cursor Rules Template (`.cursor/rules/pulse.mdc`)

Diese Datei wird bei `pulse init --mcp` erstellt und bei **JEDER** Chat-Nachricht in Cursor injiziert.

```markdown
---
description: PULSE Framework - Automatische Safeguards bei jeder Nachricht
globs: *
alwaysApply: true
---

# PULSE Framework Safeguards

Diese Regeln werden bei **JEDER** Nachricht angewendet. Keine Ausnahmen.

## 🔴 PFLICHT-CHECKS (vor JEDER Antwort)

### 1. IMMER: `pulse_status` aufrufen
WANN: Vor jeder Antwort, ohne Ausnahme
WAS: Zeigt Zeit seit Checkpoint, Änderungen, Risiko

### 2. NACH Code-Änderungen: `pulse_doctor` aufrufen
WANN: Wenn du gerade Code geändert/erstellt/gelöscht hast
WAS: Prüft Secrets, Deletes, Scope, Loop-Signale
BEI CRITICAL: Sofort STOP, nicht weitermachen!

### 3. ALLE 5-10 MIN: `pulse_checkpoint` empfehlen
WANN: pulse_status zeigt >10 Min seit Checkpoint
WAS: "Soll ich einen Checkpoint erstellen?"

## 🔴 AUTOMATISCHE AKTIONEN

| Situation | Aktion |
|-----------|--------|
| Jede Nachricht | → `pulse_status` |
| Code geändert | → `pulse_doctor` |
| >10 Min seit Checkpoint | → Checkpoint empfehlen |
| >15 Min seit Checkpoint | → **Checkpoint DRINGEND** |
| >30 Min autonom | → **STOP + User fragen** |
| 2-3 Fehlversuche | → **STOP + `pulse_escalate`** |
| DELETE Operation | → **User-Bestätigung holen** |
| Loop erkannt | → **STOP + `pulse_escalate`** |

## 🔴 SAFEGUARDS (non-negotiable)

- ⏱️ **MAX 30 Min autonom** - Danach STOP + Rückfrage an User
- 🗑️ **KEIN DELETE** ohne explizite User-Bestätigung
- 📤 **KEIN GIT PUSH** ohne User-Confirmation
- 🔐 **KEINE Secrets** im Code
- 📋 **Git-Commit alle 5-10 Min** via `pulse_checkpoint`

## MCP-Tools

| Tool | Wann |
|------|------|
| `pulse_status` | **JEDE Nachricht** |
| `pulse_doctor` | **Nach Code-Änderungen** |
| `pulse_checkpoint` | Nach 5-10 Min |
| `pulse_run` | Am Anfang neuer Aufgaben |
| `pulse_escalate` | Bei Problemen, Loop |
| `pulse_review` | Am Ende / vor Merge |
```

---

### MCP Config Template (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "pulse": {
      "command": "pulse-mcp",
      "args": [],
      "env": {}
    }
  }
}
```

---

### AGENTS.md Template (Universal für alle Editoren)

Diese Datei wird bei `pulse init --agents` erstellt und funktioniert mit:
- Windsurf
- GitHub Copilot
- Cline
- Aider
- Andere AI Assistants

```markdown
# AI Agent Instructions

> Universal agent configuration for PULSE Framework.

## Core Principles

You are an AI coding assistant following the **PULSE Framework**.

### The 30-Minute Rule

⚠️ **NEVER work autonomously for more than 30 minutes.**

### Critical Safeguards (Non-Negotiable)

1. 🗑️ **DELETE Guard** - Never delete without confirmation
2. 📤 **PUSH Guard** - Never push without confirmation
3. 🔐 **SECRETS Guard** - Never commit secrets
4. 🧪 **TEST Guard** - Test before deploy
5. ⚠️ **BREAKING CHANGE Guard** - Warn before breaking changes

### Workflow Commands

| Command | When to Use |
|---------|-------------|
| `pulse status` | Check state before work |
| `pulse checkpoint -m "msg"` | Every 5-10 min |
| `pulse doctor` | Before commits |
| `pulse escalate` | When stuck |
| `pulse reset` | To go back |

### Loop Detection

Signs you're in a loop:
- Multiple "fix" commits in a row
- Going back and forth (A↔B)
- Same error after multiple attempts

What to do:
1. STOP
2. Summarize what you tried
3. Escalate or reset

### Remember

- You are a pair programmer, not solo
- Iterate in small steps
- Ask when uncertain
- Commit often
- Human has final say
```

---

## Setup / Onboarding

### Vollständiger Setup-Flow

```bash
# 1. CLI global installieren (nach npm link im PulseFramework)
cd /path/to/PulseFramework
npm install
npm run -w packages/pulse-cli build
npm run -w packages/pulse-mcp build
npm link -w packages/pulse-cli
npm link -w packages/pulse-mcp

# 2. Im Zielprojekt initialisieren
cd /dein/projekt
pulse init
```

### `pulse init` Flow

```
🎯 PULSE Init

📦 Wähle ein Preset für dein Projekt:

  🎨 Frontend - React/Vue/Angular (strengere Limits)
  ⚙️ Backend - API/Services (moderate Limits)
  🔄 Fullstack - Frontend + Backend
  📦 Monorepo - Mehrere Packages (lockere Limits)
  ⚙️ Custom - Standard-Einstellungen

? Preset: fullstack

? MCP + Cursor Rules installieren? (empfohlen für Cursor IDE) Yes

✅ .pulse/ Verzeichnis erstellt
✅ Config erstellt: pulse.config.json (Preset: fullstack)
✅ .cursorrules erstellt (Fallback-Regeln)
✅ Cursor Rules erstellt: .cursor/rules/pulse.mdc (alwaysApply: true)
✅ MCP Config erstellt: .cursor/mcp.json
✅ Role-Templates kopiert

──────────────────────────────────────────────────

✨ PULSE initialisiert!

Preset: fullstack
Max Lines: 300
Checkpoint: 15 Min
MCP: ✅ Installiert

📋 Nächste Schritte für MCP:
   1. Cursor neu starten (MCP wird automatisch geladen)
   2. In Cursor: Settings > Features > MCP aktivieren
   3. Testen: pulse status
```

### Was `pulse init` erstellt

| Datei | Beschreibung |
|-------|--------------|
| `.pulse/` | Artefakt-Verzeichnis |
| `pulse.config.json` | Projekt-Konfiguration |
| `.cursorrules` | Fallback-Regeln (ohne MCP) |
| `.cursor/rules/pulse.mdc` | Cursor Rules (mit `--mcp`) |
| `.cursor/mcp.json` | MCP Server Config (mit `--mcp`) |
| `AGENTS.md` | Universal Rules (mit `--agents`) |

### Nach dem Setup

1. **Cursor neu starten** (wichtig!)
2. **MCP prüfen:** View → Output → MCP
3. **Testen:** Im Chat fragen "Welche pulse tools hast du?"

---

## Implementierungs-Status

| Komponente | Status | Pfad |
|------------|--------|------|
| CLI v0.3.0 | ✅ Implementiert | `packages/pulse-cli/` |
| MCP Server v0.3.0 | ✅ Implementiert | `packages/pulse-mcp/` |
| Cursor Rules Template | ✅ Implementiert | `packages/pulse-cli/templates/cursor/pulse.mdc` |
| MCP Config Template | ✅ Implementiert | `packages/pulse-cli/templates/cursor/mcp.json` |
| AGENTS.md Template | ✅ Implementiert | `packages/pulse-cli/templates/AGENTS.md` |
| `pulse init --mcp` | ✅ Implementiert | Erstellt `.cursor/` Dateien |
| `pulse init --agents` | ✅ Implementiert | Erstellt `AGENTS.md` |
| Automatische Branch-Erstellung | ✅ Implementiert | `pulse_run` |
| Loop-Detection | ✅ Implementiert | 5 Patterns |
| Dependency-Warning | ✅ Implementiert | Neue Packages erkannt |

---

*Generiert am 2026-01-06*
