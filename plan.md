# SELFER PROJECT IMPLEMENTATION PLAN

================================================================================
INTRODUCTION
================================================================================
This 15-phase implementation plan outlines the structural, logic, integration, and polishing stages required to build Selfer—the local-first, multi-agent orchestration bot functioning via CLI and Telegram.

---

### Phase 1: Core System Scaffolding & CLI Setup
- **Objective:** Establish the foundational Python architecture.
- **Tasks:**
  - Setup virtual environment (`.venv`) and core dependencies (`click`, `rich`, `python-dotenv`).
  - Implement base CLI commands: `selfer start`, `selfer init`, `selfer mode`.
  - Design the `click` command group decorators structure.
  - Setup fundamental logging utility (writing to `/var/log` or equivalent `.selfer/logs/`).

### Phase 2: Project `.selfer` Initialization & Memory Structure
- **Objective:** Enable repository isolation and context mapping.
- **Tasks:**
  - Build logic for `selfer init` to generate a hidden `.selfer` subdirectory in the target repository.
  - Develop `config.json` baseline generation (storing allowed modes, preferred LLM).
  - Scaffold `session.json` to keep track of paused states.
  - Setup dummy SQLite database `memory.db` schemas for future chat histories.

### Phase 3: Hardware LLM Intefaces (Ollama & Cloud APIs)
- **Objective:** Implement uniform Language Model wrappers using LangChain.
- **Tasks:**
  - Incorporate `langchain` and setup polymorphic LLM callers.
  - Ensure Ollama API (`localhost:11434`) calls work out-of-the-box.
  - Ensure fallback or advanced hooks via OpenAI/Anthropic SDKs.
  - Write test scripts querying local models for simple summaries to verify latency.

### Phase 4: Directory Mapping Agent & System Prompts
- **Objective:** Enable Selfer to "see" the environment.
- **Tasks:**
  - Write Tree generation logic that traverses the local Git repo (ignoring `.git`, `node_modules`, `.venv`).
  - Compress structure into `map.json` payload inside `.selfer`.
  - Integrate baseline System Prompts dictating the "BAT/Master" persona framework.

### Phase 5: Telegram Bot Webhook & Async Threading
- **Objective:** Open the secondary communication gateway.
- **Tasks:**
  - Integrate `python-telegram-bot` strictly using async paradigms.
  - Establish ID-based whitelist logic in `.selfer_global/config.json` preventing unauthorized pings.
  - Map Telegram messaging inputs back into the shared queue used by the CLI.

### Phase 6: Basic LangGraph State & Router Foundations
- **Objective:** Transition from linear LangChain to cyclical LangGraph orchestration.
- **Tasks:**
  - Define the primary `TypedDict` Graph State (`{messages, current_plan, current_step, repository_state, variables}`).
  - Create the root "Router Node" (The Master Supervisor Agent).
  - Setup simple conditional edges to decide if a query is informational or requires execution.

### Phase 7: The Planner Agent
- **Objective:** Develop strategic multi-step execution.
- **Tasks:**
  - Develop prompt logic instructing an LLM to output rigid JSON arrays identifying Step-by-Step execution paths.
  - Route user intents through the Planner node and store the output array in the LangGraph State object.

### Phase 8: File Creator & Editor Agents
- **Objective:** Grant Selfer safe OS write capabilities.
- **Tasks:**
  - Implement File Creation Agent with Pydantic Schema validations (restricting paths to `os.path.abspath` inside repo).
  - Implement Surgical Editor Agent allowing AST/Regex partial line replacements.
  - Execute a test where Selfer modifies a dummy file successfully.

### Phase 9: Retrieval Augmented Generation (RAG) Setup
- **Objective:** Grant the system searching power over the codebase.
- **Tasks:**
  - Implement the Retrievers agent.
  - Use simple semantic indexing (`nomic-embed-text`) or Regex parsing to allow Planner/Execution nodes to find specific function locations.
  - Save indexed embeddings to `memory.db`.

### Phase 10: CMD Runnable Agent & Security Sandboxing
- **Objective:** Safe terminal execution.
- **Tasks:**
  - Develop `subprocess.run` wrappers to execute Git commands, tests, or scripts.
  - Impose heuristic security warnings (prompting "Y/N" over Telegram/CLI before deleting or risky network outbounds).
  - Capture `stderr` / `stdout` correctly and append to State object.

### Phase 11: The Git & Summary Agents
- **Objective:** Wrap operations succinctly and track state limits.
- **Tasks:**
  - Implement the Git Agent focusing on `status`, `diff`, creating branches, and staged commits.
  - Implement the Summary Agent used at task completion to reduce thousands of token histories into brief 4-line recaps for the Router.

### Phase 12: Cycle Loops & Error Self-Correction
- **Objective:** Enable autonomous resilience.
- **Tasks:**
  - Tie the `CMD Runnable`, `Execution`, and `Planner` nodes into circular graphs.
  - Write test failing code natively and verify that the Router catches stack traces, sends to Execution to fix, and retries.
  - Implement global loop counters (`max_retries=3`) to prevent infinite looping.

### Phase 13: Persona Modes & User Interrogation
- **Objective:** Finalize how Selfer interacts dynamically with the Master.
- **Tasks:**
  - Connect the `selfer mode` CLI option directly to the System Prompt pipeline injection.
  - Create the User Interrogation node: A node that detects ambiguity, halts the execution loop, pings Telegram/CLI, and waits indefinitely for user unblocking logic.

### Phase 14: Polishing, Aesthetics, & Unified Logging
- **Objective:** Perfect the `rich` UI elements and audits.
- **Tasks:**
  - Ensure CLI terminal renders beautiful markdown layout, code boxes, dynamic spin-loaders.
  - Ensure all internal operations print cleanly into `.selfer/logs/audit.log` instead of cluttering user terminals.
  - Setup Telegram notification webhooks for "Heavy Task Completed" events.

### Phase 15: Global Deployment & End-to-End Testing
- **Objective:** Prepare systems for packaging and usage.
- **Tasks:**
  - Setup Python `setup.py` / `pyproject.toml` globally linking `selfer` command across OS environments.
  - Conduct full integration tests starting from a blank directory, typing `selfer init`, setting up Telegram, and commanding a complex code generation exclusively via phone.
  - Finalize documentation.
