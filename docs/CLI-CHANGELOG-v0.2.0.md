# PULSE CLI v0.2.0 - Changelog

> **Release:** v0.2.0  
> **Datum:** Januar 2026  
> **Vorherige Version:** v0.1.0

---

## Zusammenfassung

Diese Version bringt **6 größere Verbesserungen** basierend auf externem Feedback:

1. Neuer Befehl `pulse status`
2. Neuer Befehl `pulse run`
3. Clipboard-Support (`-C, --clipboard`)
4. Team-Presets bei `pulse init`
5. Erweiterte Loop-Detection
6. Auto-Promotion bei `pulse learn`

---

## Neue Befehle

### 1. `pulse status`

**Einzeiler-Übersicht** über den aktuellen Projektzustand.

```bash
pulse status
# Output: 🔨 build | 🟢 12m ago | 📝 5 files | ⚠️ 2 warnings

pulse status --json
# Output: {"profile":"build","lastCheckpointMinutesAgo":12,...}
```

**Anzeigt:**
- Aktuelles Profil (🧠 concept, 🔨 build, 🚨 escalation)
- Zeit seit letztem Checkpoint (🟢 <15m, 🟡 <30m, 🔴 >30m)
- Anzahl geänderter Dateien
- Anzahl Findings (Warnings/Critical)

**Dateien:**
- `packages/pulse-cli/src/commands/status.ts` (neu)

---

### 2. `pulse run`

**Kombinierter Workflow:** Start → Watch → Checkpoint → Review in einem Befehl.

```bash
pulse run
pulse run -t feature --minutes 20
pulse run --no-watch --action "API implementieren"
```

**Optionen:**
| Option | Beschreibung |
|--------|--------------|
| `-t, --template <id>` | Template: feature, bugfix, refactor, concept, analyze, review |
| `--minutes <n>` | Checkpoint-Intervall (default: 30) |
| `--no-watch` | Watcher nicht starten |
| `--action <text>` | ACTION direkt angeben |

**Flow:**
1. Template-Auswahl (interaktiv oder per Flag)
2. Prompt generieren und ausgeben
3. Watch-Loop starten (Checkpoint-Erinnerungen)
4. Bei Ctrl+C: Checkpoint und Review anbieten

**Dateien:**
- `packages/pulse-cli/src/commands/run.ts` (neu)

---

## Neue Features

### 3. Clipboard-Support (`-C, --clipboard`)

Alle prompt-generierenden Befehle können jetzt den Prompt direkt in die Zwischenablage kopieren.

```bash
pulse start --action "Feature bauen" -C
pulse escalate -C
pulse correct -C
```

**Plattform-Support:**
| OS | Tool |
|----|------|
| macOS | `pbcopy` |
| Windows | `clip` |
| Linux | `xclip` oder `xsel` |

**Dateien:**
- `packages/pulse-cli/src/lib/clipboard.ts` (neu)
- `packages/pulse-cli/src/commands/start.ts` (erweitert)
- `packages/pulse-cli/src/commands/escalate.ts` (erweitert)
- `packages/pulse-cli/src/commands/correct.ts` (erweitert)

---

### 4. Team-Presets bei `pulse init`

Interaktive Preset-Auswahl bei Projekt-Initialisierung.

```bash
pulse init
# Zeigt Auswahl: frontend, backend, fullstack, monorepo, custom

pulse init --preset backend --no-interactive
```

**Verfügbare Presets:**

| Preset | Max Lines | Max Files | Max Deletes | Checkpoint |
|--------|-----------|-----------|-------------|------------|
| `frontend` | 200 | 10 | 30 | 20 min |
| `backend` | 400 | 15 | 50 | 30 min |
| `fullstack` | 500 | 20 | 60 | 25 min |
| `monorepo` | 800 | 30 | 100 | 30 min |
| `custom` | 300 | 15 | 50 | 30 min |

**Neue Config-Felder:**
```json
{
  "preset": "backend",
  "checkpointReminderMinutes": 30
}
```

**Dateien:**
- `packages/pulse-cli/src/lib/config.ts` (erweitert: `PRESETS`, `getPresetNames()`)
- `packages/pulse-cli/src/lib/types.ts` (erweitert: `PresetName`, `PresetConfig`)
- `packages/pulse-cli/src/commands/init.ts` (komplett überarbeitet)

---

### 5. Erweiterte Loop-Detection

`pulse doctor --loop` erkennt jetzt **5 verschiedene Loop-Signale**:

| Signal | Severity | Beschreibung |
|--------|----------|--------------|
| **Fix-Chain** | warn | 3+ "fix" Commits in den letzten 15 Commits |
| **Revert** | critical | Revert-Commits erkannt (A↔B Toggling) |
| **File-Churn** | warn | Gleiche Datei 5+ mal geändert |
| **Pendeln** | critical | Ähnliche Commit-Messages wiederholen sich |
| **Fix-No-Test** | warn | Fix-Commits ohne zugehörige Test-Änderungen |

```bash
pulse doctor --loop

# Beispiel-Output:
# WARN: LOOP_SIGNAL: Loop-Signal: 3x "fix" Commits in den letzten 15 Commits.
# WARN: LOOP_SIGNAL: Loop-Signal: File-Churn - .gitignore (5x)
# CRITICAL: LOOP_SIGNAL: Loop-Signal: Ähnliche Commits wiederholen sich.
```

**Dateien:**
- `packages/pulse-cli/src/lib/scanner.ts` (erweitert: `detectLoopSignals()`, `LoopSignal` type)
- `packages/pulse-cli/src/commands/doctor.ts` (angepasst: nutzt neue Loop-Detection)

---

### 6. Auto-Promotion bei `pulse learn`

Regeln können jetzt automatisch zu `.cursorrules` hinzugefügt werden.

```bash
pulse learn
# Interaktiv: Problem, Lösung, Regel eingeben
# Am Ende: "In .cursorrules übernehmen? (j/n)"
```

**Neue Optionen:**
| Option | Beschreibung |
|--------|--------------|
| `--problem <text>` | Was war das Problem? |
| `--solution <text>` | Was war die Lösung? |
| `--rule <text>` | Abgeleitete Regel |
| `--reason <text>` | Warum diese Regel? |
| `--no-promote` | Nicht nach .cursorrules-Update fragen |

**Generierter .cursorrules-Snippet:**
```
# ┌────────────────────────────────────────────────────────────────────────────┐
# │ GELERNTE REGEL                                                             │
# └────────────────────────────────────────────────────────────────────────────┘
#
# Bei Prisma-Updates immer Migration Guide prüfen
#
# Grund: Breaking Changes in Major Versions
#
# Kontext: Prisma 5 änderte findUnique Verhalten
#
```

**Dateien:**
- `packages/pulse-cli/src/commands/learn.ts` (komplett überarbeitet)

---

## Kleinere Änderungen

### Verbesserte Ausgabe bei `pulse correct`

- Neue Modi: `explain`, `narrow`, `milestone`
- Deutsche Prompts
- Bessere Formatierung

### Version-Bump

- `package.json`: `0.1.0` → `0.2.0`
- `src/index.ts`: `.version("0.2.0")`

---

## Geänderte Dateien (Übersicht)

| Datei | Änderung |
|-------|----------|
| `commands/status.ts` | **NEU** |
| `commands/run.ts` | **NEU** |
| `lib/clipboard.ts` | **NEU** |
| `commands/start.ts` | `-C, --clipboard` hinzugefügt |
| `commands/escalate.ts` | `-C, --clipboard` hinzugefügt |
| `commands/correct.ts` | `-C, --clipboard` + neue Modi |
| `commands/init.ts` | Preset-Auswahl |
| `commands/learn.ts` | Auto-Promotion |
| `commands/doctor.ts` | Erweiterte Loop-Detection |
| `lib/config.ts` | `PRESETS`, `getPresetNames()` |
| `lib/scanner.ts` | `detectLoopSignals()` + 5 Signal-Typen |
| `lib/types.ts` | `PresetName`, `PresetConfig` |
| `index.ts` | `registerStatusCommand`, `registerRunCommand` |
| `package.json` | Version 0.2.0 |

---

## Migration von v0.1.0

Keine Breaking Changes. Alle bestehenden Befehle funktionieren wie zuvor.

**Empfohlen:**
1. `npm run build -w packages/pulse-cli`
2. `npm link -w packages/pulse-cli`
3. In Projekten: `pulse init --preset <type>` für neue Preset-Config

---

## Dokumentation

Die vollständige aktualisierte Dokumentation ist in:
- `docs/tooling/pulse-cli.md` (v0.2.0)

---

*Changelog erstellt: Januar 2026*
