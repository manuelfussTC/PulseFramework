# Pulse Project Blueprint: Standard Folder Structure
# This structure ensures that "Layer 1" (Strategy) is always visible and protected.

```text
my-pulse-project/
├── .cursorrules          # The Global Pulse Enforcer
├── docs/                 # LAYER 1: The Brain
│   ├── context.md        # Why are we building this?
│   ├── architecture/     # System diagrams and decisions
│   └── roadmap.md        # Future pulses
├── spec/                 # LAYER 1: The Constraints
│   ├── tech-spec.md      # Detailed technical requirements
│   └── api-design.md     # Interface definitions
├── src/                  # LAYER 2: The Build
│   ├── ...               # Your production code
├── tests/                # LAYER 2: The Verification
├── logs/                 # LAYER 3: The History
│   └── pulse_history.md  # Decisions, fails, and escalations
└── .gitignore            # Git Safety Net config
```

## Why this structure?
- **Visibility:** The `docs/` and `spec/` folders are at the root, making it easy to pin them in Cursor context.
- **Traceability:** The `logs/` folder captures the "soul" of the development process, not just the code.
- **Separation:** It keeps the "How" (src) strictly separated from the "What" (spec).

