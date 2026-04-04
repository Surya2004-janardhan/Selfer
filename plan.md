# Selfer - Implementation Plan

`selfer` is a high-performance, self-learning, and self-improving CLI AI agent. It uses the `src-reference` (Claude Code) as a technical blueprint but implements a completely unique, renamed, and reorganized architecture. It supports both **Ollama** (local) and frontier cloud models.

---

## Architecture Mapping (Reference -> Selfer)

To ensure originality, Selfer uses a completely renamed internal structure:

| Original (Claude Code) | Selfer Implementation |
| :--- | :--- |
| `main.tsx` | `selfer.tsx` (The CLI Entrypoint) |
| `QueryEngine.ts` | `ThinkingCore.ts` (The AI Orchestrator) |
| `tools/` | `skills/` (The Model Capabilities) |
| `commands/` | `actions/` (Slash Commands like `/commit`) |
| `services/` | `providers/` (External API Integrations) |
| `components/` | `view/` (Ink-based UI Components) |
| `coordinator/` | `swarm/` (Multi-agent Coordination) |
| `buddy/` | `mascot/` (Terminal Animations & Feedback) |

---

## Phase 1: Foundation & Thinking Core
**Goal**: Establish the base project structure and the primary AI orchestration loop.

1.  **Project Initialization**:
    *   Setup Bun environment with TypeScript, React, and Ink.
    *   Initialize `selfer.tsx` as the main entry point with Linux-themed styling (Blue/Green palette).
2.  **`ThinkingCore.ts` Implementation**:
    *   Develop the core conversation loop (inspired by `QueryEngine.ts`) but with a new internal logic flow.
    *   Implement state management for messages and conversation history.
3.  **Universal Provider Layer**:
    *   Build `providers/` to support **Ollama** natively.
    *   Integrate cloud Fallbacks (Anthropic/OpenAI) for hybrid operation.
4.  **TUI Base**:
    *   Create the basic terminal frame with the requested green-on-blue aesthetic.

## Phase 2: Skills & Agent Intelligence
**Goal**: Port advanced agentic tools and implement self-learning capabilities.

1.  **Capability Porting (Renamed)**:
    *   `FileSystemSkill`: Advanced file operations (Read/Write/Edit).
    *   `ShellSkill`: Secure bash command execution with permission layers.
    *   `SearchSkill`: Optimized grep/glob searching.
2.  **Self-Improvement Mechanisms**:
    *   Implement a "Reflection" loop where Selfer analyzes successful/failed tool calls to improve future accuracy.
    *   Create a local memory store (`memories/`) to persist project-specific context.
3.  **Context & Token Management**:
    *   Build a custom token estimation system.
    *   Implement a git-aware context collector to feed project status to the model.

## Phase 3: Visual Polish & Experience
**Goal**: Premium Terminal UI with animations and mascot integration.

1.  **Interactive Mascot (`mascot/`)**:
    *   Create a custom terminal animation system (like the reference's "buddy") but themed for Selfer.
2.  **Advanced UI Components**:
    *   Implement typing simulations and smooth transitions between UI states.
    *   Build `Pulse` (diagnostic tool) to verify system health and API connections.
3.  **Optimization & Release**:
    *   Shrink the binary size and optimize startup time via parallel pre-fetching.
    *   Finalize documentation and "Project Onboarding" flows.

---

## Strict Notes
- **DO NOT** edit `src-reference/` at any time.
- **DO NOT** reuse function names or variable names from the reference directly.
- **THEME**: Always maintain the Linux Green/Blue aesthetic with premium animations.
- **LOCALS FIRST**: Prioritize Ollama for tasks that can be handled locally to save cost.