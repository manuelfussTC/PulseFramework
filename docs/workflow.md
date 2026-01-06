# So arbeiten wir mit PULSE + Cursor

> Der empfohlene Workflow für kontrolliertes AI-gestütztes Entwickeln.

---

## Überblick

```
┌─────────────────────────────────────────────────────────────────┐
│  1. SESSION STARTEN                                              │
│     pulse run                                                    │
│     → Template wählen                                           │
│     → ACTION definieren                                         │
│     → Prompt in Cursor einfügen                                 │
├─────────────────────────────────────────────────────────────────┤
│  2. WÄHREND DER ARBEIT                                          │
│     → Alle 5-10 Min: pulse checkpoint                           │
│     → Bei Unsicherheit: pulse status                            │
│     → Bei Problemen: pulse doctor --loop                        │
├─────────────────────────────────────────────────────────────────┤
│  3. BEI PROBLEMEN                                               │
│     pulse escalate                                               │
│     → Problem beschreiben                                       │
│     → Prompt in externes Model (GPT-5/Claude)                   │
│     → Anweisungen zurück an Cursor                              │
├─────────────────────────────────────────────────────────────────┤
│  4. ABSCHLUSS                                                   │
│     pulse review                                                 │
│     → Decision Briefing prüfen                                  │
│     → Approve / Reject / Escalate                               │
├─────────────────────────────────────────────────────────────────┤
│  5. WISSEN SPEICHERN                                            │
│     pulse learn                                                  │
│     → Problem dokumentieren                                     │
│     → Lösung festhalten                                         │
│     → Regel ableiten                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Session starten

### Option A: Kombinierter Workflow (empfohlen)

```bash
pulse run
```

Dieser Befehl:
1. Fragt nach Template (feature, bugfix, refactor, etc.)
2. Sammelt ACTION und KONTEXT
3. Generiert strukturierten Prompt
4. Startet Checkpoint-Watcher
5. Bietet am Ende Review an

### Option B: Einzelner Prompt

```bash
pulse s --action "User-Dashboard implementieren" -C
```

Die `-C` Flag kopiert den Prompt direkt in die Zwischenablage.

### Option C: Quick Bug-Fix

```bash
pulse s --ist "Button funktioniert nicht" --soll "Button soll klickbar sein"
```

---

## 2. Während der Arbeit

### Regelmäßig prüfen

```bash
# Schneller Status
pulse status

# Beispiel-Output:
# 🔨 backend/build | 🟢 8m | 📝 5 files | ✅ ok
```

### Checkpoints setzen (alle 5-10 Min)

```bash
pulse checkpoint -m "feat: Dashboard UI implementiert"

# Oder kurz:
pulse c -m "wip: progress"
```

### Bei Unsicherheit: Doctor

```bash
pulse doctor --loop

# Prüft:
# - Secrets im Code?
# - Zu viele Änderungen?
# - Loop-Signale (fix-chain, reverts)?
```

---

## 3. Bei Problemen

### Wann eskalieren?

- Nach 2-3 erfolglosen Fix-Versuchen
- Wenn Cursor im Kreis läuft
- Bei unklarer Root Cause
- Wenn du eine zweite Meinung brauchst

### Eskalation erstellen

```bash
pulse escalate --auto-include -C
```

**Flow:**
1. Problem beschreiben
2. Was hat Cursor versucht?
3. Fehlermeldung eingeben
4. Relevante Dateien werden automatisch inkludiert
5. Prompt wird generiert und kopiert

**Dann:**
1. Prompt in ChatGPT / Claude / GPT-5 einfügen
2. Analyse und Schritt-für-Schritt Anweisungen lesen
3. Anweisungen an Cursor geben (NICHT blind Code kopieren!)

---

## 4. Abschluss

### Review erstellen

```bash
pulse review
```

**Decision Briefing zeigt:**

```
┌─────────────────────────────────────────────────────────────────┐
│ PULSE Review – Decision Briefing                                 │
├─────────────────────────────────────────────────────────────────┤
│ SCOPE-CHECK (backend preset)                                     │
│   Files: 8/15 (53%)  ████████░░░░░░░                            │
│   Lines: 280/400 (70%)  ██████████████░░                        │
├─────────────────────────────────────────────────────────────────┤
│ RISIKO-SUMMARY                                                   │
│   ⚠️ 2 Warnings                                                  │
│   ⏱️ Checkpoint vor 12 Min                                       │
│   🟢 Loop-Risiko: LOW                                            │
├─────────────────────────────────────────────────────────────────┤
│ ✅ EMPFEHLUNG: APPROVE                                           │
│   → Keine Critical Findings, Scope OK                           │
└─────────────────────────────────────────────────────────────────┘
```

**Entscheidung:**
- **Approve**: Alles gut, kann gemerged werden
- **Reject**: Probleme gefunden, zurück an Cursor
- **Escalate**: Unklar, braucht externe Analyse

---

## 5. Wissen speichern

### Nach gelösten Problemen

```bash
pulse learn
```

**Eingabe:**
- Was war das Problem?
- Was war die Lösung?
- Welche Regel leitest du ab?

**Beispiel:**
```
Problem: Prisma 5 breaking change bei findUnique
Lösung: { rejectOnNotFound: true } durch orThrow() ersetzen
Regel: Bei Prisma-Updates immer Migration Guide prüfen
```

**Auto-Promotion:** Die Regel kann automatisch in `.cursorrules` übernommen werden.

---

## Safeguards (non-negotiable)

Diese Regeln gelten IMMER:

| Safeguard | Beschreibung |
|-----------|--------------|
| ⏱️ 30-Min-Limit | Nach 30 Min autonom → STOP + Rückfrage |
| 🗑️ Delete Guard | KEINE Dateien löschen ohne Bestätigung |
| 📤 Push Guard | KEIN Git Push ohne Bestätigung |
| 🔐 Secrets Guard | KEINE API Keys, Passwörter im Code |
| 📋 Checkpoint | Git-Commit alle 5-10 Min |

---

## Presets

Bei `pulse init` wählst du ein Preset, das die Limits setzt:

| Preset | Max Lines | Max Files | Checkpoint |
|--------|-----------|-----------|------------|
| frontend | 200 | 10 | 20 min |
| backend | 400 | 15 | 30 min |
| fullstack | 500 | 20 | 25 min |
| monorepo | 800 | 30 | 30 min |

Bei Überschreitung warnt `pulse doctor`.

---

## Befehls-Referenz (Quick)

| Was | Befehl |
|-----|--------|
| Status prüfen | `pulse status` |
| Session starten | `pulse run` |
| Einzelner Prompt | `pulse s --action "..." -C` |
| Checkpoint | `pulse c -m "message"` |
| Safeguards prüfen | `pulse d --loop` |
| Eskalieren | `pulse e --auto-include -C` |
| Review | `pulse r` |
| Wissen speichern | `pulse learn` |

---

## Troubleshooting

### "Cursor läuft im Kreis"

```bash
pulse doctor --loop
# Zeigt Loop-Signale

pulse escalate
# Problem extern analysieren lassen
```

### "Zu viele Änderungen"

```bash
pulse status --verbose
# Zeigt Scope-Auslastung

pulse checkpoint -m "wip: split"
# Zwischenstand sichern
```

### "Bin mir unsicher"

```bash
pulse review
# Decision Briefing gibt Empfehlung
```

---

## Checkliste: Vor dem Merge

- [ ] `pulse review` ausgeführt
- [ ] Keine Critical Findings
- [ ] Scope im Limit (oder bewusst überschritten)
- [ ] Loop-Risiko LOW
- [ ] Code verstanden (nicht blind übernommen)
- [ ] Lokal getestet

---

*Workflow-Dokumentation für PULSE Framework v0.3*
