Rolle:
Du bist ein Senior Developer und Tech-Writer in einer Person. Du kennst das Pulse Framework bereits aus der vorhandenen englischen Fassung. Deine Aufgabe ist es, ein sauberes, öffentlich nutzbares GitHub-Repository aufzusetzen, das Pulse als Engineering-Standard dokumentiert. Zielgruppe: erfahrene Entwickler, Tool-Teams (z.B. Cursor/OpenAI/Anthropic), keine Marketing-Zielgruppe.

Kontext:
Wir befinden uns im Git-Repository „PulseFramework“. Dieses Repo soll als Referenz für das Pulse Framework dienen: eine Methodik für kontrollierte, agentische LLM-Entwicklung (mit Loops, Safeguards, Debug-Workflows, 3-Ebenen-Architektur etc.).  
Alle Inhalte im Repo sind auf Englisch. Ton: pragmatisch, technisch, präzise. Keine Marketing-Floskeln, keine Buzzwords, keine „AI revolution“ Rhetorik. 

Ziel:
Erzeuge eine erste, saubere Version des Repos mit:
- klarer Struktur
- verständlichem README
- einer Version 1.0 der Spezifikation als Markdown
- kleinen, aber aussagekräftigen Code-Beispielen
- einem Dokument mit „Challenges/Questions“ an Tool-Hersteller
- einer Open-Source-Lizenz (MIT)

WICHTIG:
- Nichts löschen ohne Rückfrage.
- Kein `git push` ausführen, nur lokal arbeiten.
- Alle Dateien im Root und in Unterordnern als Markdown oder Code erzeugen, keine PDFs.
- Schreibe kurze, dichte Texte, lieber knapp und klar als langatmig.
- Schreibe alles in US English.

Aufgaben:

1) Basis-Struktur anlegen
Lege folgende Struktur im Repo an:

- README.md
- LICENSE
- .gitignore

- spec/
  - pulse-spec-v1.md

- examples/
  - simple-loop/
    - README.md
    - pulse_loop.ts  (TypeScript-Beispiel)
  - debug-loop/
    - README.md
    - debug_loop.ts  (TypeScript-Beispiel)

- docs/
  - roadmap.md

- CHALLENGES.md

Passe Pfade und Dateinamen exakt so an.

2) README.md erstellen (kurz, aber substanziell)
Erstelle eine erste Version von `README.md` mit folgenden Sections:

1. Title & One-liner  
   - Titel: `Pulse Framework – Controlled Agentic Development with LLMs`  
   - Ein prägnanter One-liner, z.B.:  
     „Pulse is a methodology for building software with LLM agents under strict human control – with explicit loops, guardrails and debug workflows.“

2. Problem Statement  
   - Welche Probleme adressiert Pulse in realer KI-gestützter Entwicklung (z.B. uncontrolled agent loops, hidden failure modes, wasted time, unsafe changes).

3. Core Ideas  
   - Einige Bulletpoints zu:  
     - 3-layer architecture (Concept LLM / Build LLM (Cursor) / Escalation)  
     - Pulses (Start, Correction, Review)  
     - 6-element prompt framework  
     - Safeguards (30-minute rule, Git as safety net, deletion/push rules).

4. Repository Structure  
   - Kurze Erklärung der Verzeichnisse (`spec/`, `examples/`, `docs/`, `CHALLENGES.md`).

5. Getting Started (for readers)  
   - Wie Leser das Repo nutzen: erst `spec/pulse-spec-v1.md` lesen, dann die Beispiele in `examples/` anschauen.

6. Status & Versioning  
   - Hinweis: current status: “Early public spec – v1.0”.  
   - Kurz erklären, dass das Framework bereits in realen Projekten getestet ist, aber weiterentwickelt wird.

7. License & Contributions  
   - Hinweis auf MIT-Lizenz und dass Feedback via Issues/PRs willkommen ist.

Text bitte technisch, direkt, ohne Marketing-Sprache.

3) Spec erstellen: spec/pulse-spec-v1.md
Erstelle eine kompakte, aber saubere erste Spezifikation von Pulse in `spec/pulse-spec-v1.md`. Ziel: 5–8 logische Sections, lieber klar als komplett.

Vorschlag für die Struktur:

1. Introduction  
   - Was ist Pulse?  
   - In einem Absatz erklären, dass es eine Methodik für kontrollierte agentische Entwicklung mit LLMs ist.  
   - Klar differenzieren: Pulse ist kein Tool, sondern eine Methodik/Standard.

2. Design Goals & Non-Goals  
   - Goals: controllability, repeatability, safety, measurable ROI, compatibility with tools like Cursor/ChatGPT/Claude.  
   - Non-goals: keine Diskussion über generelle „AI ethics“, keine Tool-Hype, keine generische Prompt-Tipps.

3. Core Concepts  
   - Pulse: Start Pulse, Correction Pulse, Review Pulse (jeweils kurz definieren).  
   - 3-layer architecture:  
     - Layer 1: Concept & Strategy (high-level LLM)  
     - Layer 2: Build & Implementation (dev environment, e.g. Cursor Agent Mode)  
     - Layer 3: Escalation & Problem Solving (second opinion models, max mode, etc.).  
   - 6-element prompt framework (Rolle, Kontext, Input, Output, Action, Beispiele) – kurz und abstract, ohne zu sehr ins Tutorial abzurutschen.

4. Process Model  
   - High-level description eines typischen Pulse-Loops:  
     - Concept phase → Plan/Spec  
     - Controlled agent loop in build-layer  
     - Checkpoints & Git commits  
     - Loop detection & escalation  
   - Klar machen: human remains in control; Agent Mode is supervised, not fully autonomous.

5. Safeguards & Failure Modes  
   - Auflisten der wichtigsten Safeguards (Delete, Push, Deploy, Breaking Changes, Secrets).  
   - Typische Failure Modes von Agenten (looping, over-editing, uncontrolled refactors, broken production) und wie Pulse sie adressiert.

6. Evaluation & Metrics (High level)  
   - Welche Metriken sich anbieten: time saved, error rate, rollback frequency, loop incidents, etc.  
   - Kein Deep Dive, eher ein Rahmen.

7. Versioning & Future Work  
   - Klarer Hinweis, dass dies „Pulse Spec v1.0“ ist.  
   - Was in zukünftigen Versionen vertieft wird (z.B. formale notation, language-agnostic APIs, integrations).

Bitte überall kurze, präzise Absätze, keine Storytelling-Teile. Schreibe so, dass ein Engineering-Team in 10–15 Minuten verstanden hat, worum es geht.

4) Beispiele erstellen: examples/simple-loop und examples/debug-loop

a) `examples/simple-loop/README.md`  
Erkläre in 1–2 Abschnitten:
- Zweck des Beispiels: ein minimaler Pulse-Loop für ein kleines Feature (z.B. building a simple API endpoint with a start pulse, one correction pulse, one review pulse).  
- Was `pulse_loop.ts` zeigt.  
- Wie der Flow aussieht (als Bulletpoints).

b) `examples/simple-loop/pulse_loop.ts`  
Erzeuge ein TypeScript-Beispiel (pseudocode ist ok), das zeigt:
- Wie ein Pulse-Loop strukturiert aussehen kann (z.B. `runPulseLoop` Funktion).  
- Kommentare, die Pulse-Konzepte markieren: Start pulse, correction pulse, review pulse.  
- Kein komplexes Projekt, nur ein kleines, lesbares Beispiel (z.B. pseudo-agent that refactors a string or transforms a config until ein Kriterium erfüllt ist).

c) `examples/debug-loop/README.md`  
Kurze Erklärung:
- Dieses Beispiel zeigt einen Debug-Loop, bei dem ein „Agent“ wiederholt eine Aufgabe falsch löst und wie Pulse damit umgeht (loop detection, escalation, rollback/forward decision).

d) `examples/debug-loop/debug_loop.ts`  
TypeScript-Pseudocode, der:
- Eine Schleife simuliert, in der ein „Agent“ wiederholt ein Ergebnis liefert.  
- Einfache „loop detection“ (z.B. gleiche Antwort mehrfach, kein Fortschritt).  
- Entscheidung: escalate vs. rollback.  
- Kommentare, die auf Pulse-Konzepte verweisen (z.B. „Correction pulse“, „Escalation to higher-level model“).

Die Beispiele sollen lesbar und didaktisch sein, nicht produktionsreif.

5) CHALLENGES.md erstellen
Erstelle `CHALLENGES.md` im Root mit folgendem Inhalt:

- Kurze Einleitung, an „tool vendors and engineering teams building LLM-powered dev tools“ gerichtet.  
- 3–5 Beobachtungen aus der Praxis, welche Probleme Pulse adressiert (z.B. uncontrolled agent edits, hidden failure modes, lack of standard workflows, missing safety defaults).  
- 5–8 konkrete Fragen/Challenges, zum Beispiel:
  - How should dev tools expose Pulse-like control loops in their UI and APIs?
  - How can tools better surface loop detection and escalation paths?
  - What is the minimal telemetry a tool should provide so teams can measure Pulse-style workflows?
  - How can agent frameworks implement safeguards like „never delete without confirmation“ by default?
- Abschluss: Einladung zu Diskussion/Issues/PRs, neutral formuliert.

6) docs/roadmap.md erstellen
Erstelle `docs/roadmap.md` mit:
- „Short-term roadmap“ (v0.2, v0.3, v1.1 etc.).  
- Items wie:
  - Additional language examples (Python, Node, etc.)  
  - More formal spec for Pulse loops  
  - Integration patterns with specific tools (Cursor, GitHub Copilot, etc.)  
- Klarer Hinweis, dass dies eine lebende Methodik ist, nicht „final truth“.

7) LICENSE und .gitignore
- `LICENSE`: Standard MIT-Lizenztext, mit „Copyright (c) 2025 Manuel Fuss“.  
- `.gitignore`: typische Node/TypeScript/JS-Defaults (node_modules, dist, .env etc.), auch wenn das Repo primär Methodik ist – es schadet nicht.

8) Abschluss-Check
Wenn du alle Dateien erstellt hast:
- Zeige mir eine Baumansicht der Repo-Struktur (so etwas wie `tree` oder eine manuelle Auflistung).  
- Liste alle erzeugten Dateien mit kurzem Einzeiler pro Datei, was der Inhalt ist.  
- Frag mich danach, ob wir einzelne Teile (README, spec, Beispiele, CHALLENGES) weiter vertiefen oder straffen sollen.

Arbeite Schritt für Schritt, aber innerhalb dieses Auftrags. Wenn etwas unklar ist, frag vorher nach, bevor du große Teile baust.
