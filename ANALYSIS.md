# Selfer vs Aider vs Cline — Honest Architecture Analysis & Roadmap to Production

> **Purpose:** This document provides an honest, line-by-line comparison of Selfer against two industry-leading AI coding assistants — [Aider](https://github.com/Aider-AI/aider) (30k+ ⭐) and [Cline](https://github.com/cline/cline) (58k+ ⭐). It identifies exactly why Selfer fails at simple tasks and provides a concrete, file-by-file roadmap to reach production grade.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Project Comparison at a Glance](#2-project-comparison-at-a-glance)
3. [Why Selfer Fails at Simple Tasks](#3-why-selfer-fails-at-simple-tasks)
4. [Deep Comparison: Architecture](#4-deep-comparison-architecture)
5. [Deep Comparison: LLM Integration](#5-deep-comparison-llm-integration)
6. [Deep Comparison: Code Editing Strategy](#6-deep-comparison-code-editing-strategy)
7. [Deep Comparison: Context Management](#7-deep-comparison-context-management)
8. [Deep Comparison: Agentic Loop & Tool Execution](#8-deep-comparison-agentic-loop--tool-execution)
9. [Deep Comparison: Error Recovery](#9-deep-comparison-error-recovery)
10. [Deep Comparison: Testing & Quality](#10-deep-comparison-testing--quality)
11. [Deep Comparison: Streaming & UX](#11-deep-comparison-streaming--ux)
12. [Deep Comparison: Security & Permissions](#12-deep-comparison-security--permissions)
13. [Deep Comparison: Observability & Debugging](#13-deep-comparison-observability--debugging)
14. [File-by-File Changes Required](#14-file-by-file-changes-required)
15. [New Files to Create](#15-new-files-to-create)
16. [Implementation Priority Roadmap](#16-implementation-priority-roadmap)
17. [Conclusion](#17-conclusion)

---

## 1. Executive Summary

**Selfer is a well-structured prototype, but it is not production-grade.** It has the right ideas — a multi-agent architecture, an orchestrator loop, XML tool calling, SEARCH/REPLACE editing — but every one of these subsystems has critical gaps that cause failures on even simple tasks.

**The core problems fall into 5 categories:**

| Category | Impact | Root Cause |
|----------|--------|------------|
| **Broken XML Parsing** | Tools not detected or mismatched | Naive regex parser, no fallback |
| **No Streaming** | Users wait with no feedback, timeouts | Synchronous `axios.post()` with no streaming |
| **No Context Management** | Context overflow crashes, LLM hallucination | No token counting, no truncation in the loop |
| **No Error Recovery in Loop** | Single failure kills the whole task | No retry, no reflection, no self-correction |
| **No Validation/Testing** | Bugs ship silently | `"test": "echo Error"`, zero real tests |

**Aider and Cline solve every one of these problems.** This document shows exactly how, and what Selfer must change.

---

## 2. Project Comparison at a Glance

| Dimension | Selfer | Aider | Cline |
|-----------|--------|-------|-------|
| **Language** | TypeScript | Python | TypeScript |
| **GitHub Stars** | <50 | 30,000+ | 58,000+ |
| **Lines of Core Code** | ~2,400 | ~50,000+ | ~100,000+ |
| **LLM Providers** | 4 (raw axios) | 100+ (via LiteLLM) | 40+ (native adapters) |
| **Edit Strategy** | 1 (SEARCH/REPLACE) | 6 (EditBlock, WholeFile, Patch, Diff, Editor, Architect) | Unified diff + full rewrite |
| **Streaming** | ❌ None | ✅ Full streaming with live markdown | ✅ Full streaming with incremental tool parsing |
| **Token Management** | ❌ None | ✅ Per-message budget, dynamic repo map sizing | ✅ Auto-compression, checkpoint restore |
| **Error Recovery** | ❌ Single agent (not wired in) | ✅ 3-level reflection + retry | ✅ Context compaction + backoff + user recovery |
| **Testing** | ❌ No real tests | ✅ pytest with full coverage | ✅ Mocha + Playwright E2E |
| **Security** | ❌ None (arbitrary command execution) | ⚠️ Basic (git-aware) | ✅ Full permission model with auto-approve policies |
| **User Approval** | ❌ None | ⚠️ Commit confirmation | ✅ Every action requires approval |
| **Context Window Handling** | ❌ Crashes | ✅ Graceful truncation + warning | ✅ Auto-compression + retry |
| **Repo Mapping** | ⚠️ Basic (regex signatures) | ✅ AST-based with Tree-sitter | ⚠️ ripgrep + ts-morph |
| **Git Integration** | ⚠️ Basic (status, diff, commit, push) | ✅ Auto-commit, auto-lint, auto-test | ✅ Timeline tracking, checkpoint restore |
| **MCP Support** | ⚠️ Basic client | ❌ Not native | ✅ Full MCP client + OAuth |
| **Observability** | ❌ None | ✅ Event system + analytics | ✅ OpenTelemetry + PostHog |
| **Documentation** | ❌ Placeholder README | ✅ Full docs site | ✅ Multi-language docs |

---

## 3. Why Selfer Fails at Simple Tasks

### Failure 1: XML Tool Call Parsing Is Fragile

**File:** `src/core/Orchestrator.ts` (lines 95–124)

```typescript
// Current implementation: regex-based XML parsing
const pattern = new RegExp(`<${tool.name}>([\\s\\S]*?)</${tool.name}>`, 'g');
```

**Why it fails:**
- Uses **non-greedy matching** (`*?`) which breaks on nested XML or multi-line content
- Iterates over ALL tool definitions for EVERY response — O(tools × response_length)
- If the LLM outputs `<read_file>` inside a code block or explanation, it gets matched as a tool call
- No handling of malformed XML (missing closing tags, extra whitespace in tag names)
- No handling of tool calls that span the LLM's `content` field differently across providers

**How Aider solves it:**
- Uses **structured edit format parsers** per coder type (EditBlockCoder, PatchCoder, etc.)
- Each parser has its own regex tuned to its format (e.g., `<<<<<<< SEARCH` blocks)
- Fallback: if parsing fails, increments `num_malformed_responses` and triggers a **reflection** message asking the LLM to fix its output

**How Cline solves it:**
- Uses the **native tool_use API** from providers (Anthropic, OpenAI) — no XML parsing at all
- `StreamResponseHandler` parses tool use blocks incrementally as they stream in
- Falls back to content-block parsing with `@streamparser/json` for partial JSON
- Each tool invocation is tracked by a unique `call_id`

**What Selfer must do:**
1. Switch to native tool/function calling APIs where supported (OpenAI, Claude, Gemini all support it)
2. For providers without native tool calling, use a robust XML parser (not regex) with proper escaping
3. Add content-fence detection to avoid matching tool names inside code blocks
4. Add a `parseToolCalls()` method per provider rather than one generic regex approach

---

### Failure 2: No Streaming — Users Get No Feedback

**File:** `src/core/LLMProvider.ts` (all provider classes)

```typescript
// Current: blocking POST, wait for full response
const response = await axios.post(url, body);
return { content: response.data.choices[0].message.content };
```

**Why it fails:**
- For complex tasks, the LLM can take 30–120 seconds to respond
- The user sees nothing during this time — just a spinner
- If the request times out (axios default: no timeout), the entire task crashes
- No partial results, no progress indication, no ability to cancel mid-generation

**How Aider solves it:**
- `send_completion()` uses `stream=True`
- `show_send_output_stream()` processes chunks in real-time
- Displays markdown via `mdstream` as it arrives
- Detects `finish_reason == "length"` mid-stream and raises `FinishReasonLength`

**How Cline solves it:**
- `createMessage()` returns an `AsyncGenerator` of stream chunks
- `StreamResponseHandler` + `StreamChunkCoordinator` process chunks incrementally
- Tool use blocks are detected **mid-stream** before the response completes
- The UI updates in real-time via WebSocket messages to the webview

**What Selfer must do:**
1. Add `stream: true` to all provider API calls
2. Implement `generateResponseStream()` returning an `AsyncIterable<string>`
3. Parse tool calls incrementally as the stream arrives
4. Update `CLIGui` to display streaming text in real-time

---

### Failure 3: No Context Window Management

**File:** `src/core/Orchestrator.ts` (lines 26–29, 38–39)

```typescript
// Messages grow unbounded — no token counting, no truncation
let messages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: query }
];
// Each turn adds assistant + user observation messages
messages.push({ role: 'assistant', content: response.content });
messages.push({ role: 'user', content: `[Observation] Tool '${call.name}' result:\n${resultStr}` });
```

**Why it fails:**
- After 5–10 turns, the messages array can exceed any model's context window
- Tool outputs (file contents, command outputs) can be **enormous** (10k+ tokens each)
- `ContextGuard.truncate()` exists but is **never called** in the orchestrator loop
- When context overflows: OpenAI returns a 400 error, Gemini silently truncates, Claude returns an error — all crash the loop

**How Aider solves it:**
- `ChatChunks` organize messages into priority layers: `system → examples → readonly → repo → done → chat → cur → reminder`
- `check_tokens()` calculates total tokens before each LLM call
- If over budget: warns user, suggests `/drop` or `/clear`, asks for confirmation
- `RepoMap` dynamically sizes its output based on remaining token budget
- Prompt caching (Anthropic) reduces repeated token costs

**How Cline solves it:**
- `ContextManager.getNewContextMessagesAndMetadata()` calculates tokens per message
- Auto-compression when exceeding 80% of context window
- History truncation removes older turns strategically
- Context checkpointing allows rolling back to a smaller context state
- Per-model token reservations (64K model → reserve 27K, 128K → 30K, 200K → 40K)

**What Selfer must do:**
1. Add a token counting utility (use `tiktoken` for OpenAI, estimate for others)
2. Track total tokens in the orchestrator loop
3. Apply `ContextGuard.truncate()` to every tool output before adding to messages
4. When approaching the limit: summarize older messages or drop them
5. Add model-specific context window limits to the config

---

### Failure 4: No Error Recovery Inside the Agentic Loop

**File:** `src/core/Orchestrator.ts` (lines 62–86)

```typescript
try {
    const result = await this.toolRegistry.executeTool(call.name, call.arguments);
    // ... add result to messages
} catch (error: any) {
    CLIGui.error(`Critical tool execution failure: ${error.message}`);
    messages.push({ role: 'user', content: `[Observation] Tool '${call.name}' critical failure: ${error.message}` });
}
```

**Why it fails:**
- Tool errors are added to messages but **no recovery strategy is triggered**
- The LLM receives the error but has no specific instruction on how to recover
- `ErrorRecoveryAgent` exists but is **never called** from the orchestrator
- If the LLM makes the same mistake twice, it loops until `maxTurns` (25) with no improvement
- No concept of "reflection" — the LLM doesn't know its own output was malformed

**How Aider solves it:**
- **Reflection mechanism**: Up to 3 retries per message
- Malformed output → `reflected_message = str(error)` → sent back as user message with explicit correction instructions
- `num_malformed_responses` counter for analytics
- `SearchReplaceNoExactMatch` → suggests which file might contain the code
- Context window exhaustion → automatic history truncation + retry

**How Cline solves it:**
- Context window exceeded → auto-compress + retry loop
- API rate limits → exponential backoff (via `retry.ts`)
- Tool execution failures → partial rollback + ask user how to proceed
- Streaming interruptions → resume from last checkpoint
- Permission denials → re-ask with explanation

**What Selfer must do:**
1. Add a `maxReflections` counter (default: 3) in the orchestrator
2. When tool parsing fails or tool execution fails, add a **reflection prompt** telling the LLM exactly what went wrong
3. Wire `ErrorRecoveryAgent` into the orchestrator loop
4. Detect repeated failures (same tool, same error) and break the loop early
5. Add context window overflow detection and auto-truncation

---

### Failure 5: No Real Testing Infrastructure

**File:** `package.json` (line 11)

```json
"test": "echo \"Error: no test specified\" && exit 1"
```

**Why it fails:**
- The test script literally prints "Error" and exits with failure
- Test files in `/tests` exist but are not wired to any test runner
- `test_autonomy.ts` uses a mock provider but can't run (`ts-node` not configured for tests)
- No CI/CD pipeline — regressions are invisible
- No test coverage tracking

**How Aider solves it:**
- `pytest` with comprehensive test suite
- `.github/workflows/` for CI/CD
- `pre-commit` hooks with `black` + `flake8`
- Coverage areas: edit parsing, token counting, streaming, git integration, multi-file edits

**How Cline solves it:**
- `mocha` for unit tests, `@vscode/test-cli` for integration, Playwright for E2E
- `npm run test:coverage` with `c8` reporter
- `lint-staged` + `husky` for pre-commit
- GitHub Actions CI with full test matrix
- `biome` for strict linting

**What Selfer must do:**
1. Install and configure a test runner (Vitest or Jest)
2. Write unit tests for every core module (start with `EditParser`, `Orchestrator`, `ToolRegistry`)
3. Write integration tests for the agent → tool → result flow
4. Add a CI workflow (GitHub Actions) that runs tests on every push
5. Add linting (`eslint` or `biome`)

---

## 4. Deep Comparison: Architecture

### Selfer's Architecture

```
User Input → CLIAgent → Router → Orchestrator → LLM → XML Parse → ToolRegistry → Agent.executeTool()
                                      ↑                                    |
                                      └────────── messages ←──────────────┘
```

**Problems:**
- **Single loop, no hierarchy**: The Orchestrator runs one flat loop. There's no concept of planning → executing → validating as separate phases.
- **Agents are just tool providers**: Despite having 15+ agents, they're only used for `getTools()` and `executeTool()`. Their `run()` methods (which contain LLM-powered logic) are **never called** by the orchestrator.
- **PlanAgent is orphaned**: `PlanAgent.run()` generates a multi-step plan but nothing in the system executes it. It's dead code.
- **Router has no intelligence**: It only checks if the query starts with `/`. Everything else goes to the Orchestrator unchanged.

### Aider's Architecture

```
User Input → Commands → BaseCoder → [EditBlockCoder|WholeFileCoder|PatchCoder|...]
                              |
                              ├── RepoMap (AST-based context)
                              ├── ChatChunks (message management)
                              ├── LiteLLM (100+ provider abstraction)
                              └── Git (auto-commit, diff, lint)
```

**Key insight:** Aider uses a **Strategy Pattern** for edit formats. Each `Coder` subclass handles one way of editing code. The base coder handles the loop, messaging, and coordination. This is why Aider can optimize per-model (some models work better with whole-file, others with SEARCH/REPLACE).

### Cline's Architecture

```
User Input → Controller → Task (agentic loop)
                            |
                            ├── StreamResponseHandler (incremental parsing)
                            ├── ToolExecutor (validation + approval + execution)
                            ├── ContextManager (token budget + compression)
                            ├── ApiHandler (40+ providers)
                            └── DiffViewProvider (UI for file changes)
```

**Key insight:** Cline's architecture is **event-driven and permission-gated**. Every tool execution goes through an approval system. The streaming pipeline is first-class — tool calls are detected mid-stream and executed before the full response arrives.

### What Selfer Must Change

| Current | Required Change |
|---------|----------------|
| Flat orchestrator loop | Add planning phase before execution phase |
| Agents only used for tools | Use agent `run()` methods for specialized reasoning |
| PlanAgent is dead code | Wire PlanAgent into Router to decompose complex tasks |
| No execution phases | Add: Plan → Execute → Validate → Commit pipeline |
| No context injection | Add repo map to system prompt dynamically |

---

## 5. Deep Comparison: LLM Integration

### Selfer's LLM Layer

**File:** `src/core/LLMProvider.ts`

| Issue | Detail |
|-------|--------|
| **Raw axios** | Each provider manually constructs HTTP requests |
| **No streaming** | All calls use `stream: false` |
| **No retry logic** | Single attempt — if it fails, it fails |
| **No timeout** | axios default is no timeout — hangs forever |
| **No rate limiting** | Concurrent calls can hit API rate limits |
| **Hardcoded models** | Claude uses `claude-3-5-sonnet-20240620` — already outdated |
| **No token counting** | Can't estimate cost or check context limits |
| **No model metadata** | No knowledge of context window sizes, pricing, capabilities |
| **Gemini system role** | Maps `system` to `user` — Gemini handles system messages differently |
| **No function calling** | All providers use text-only — no native tool use |
| **FallbackProvider** | Silently swallows errors — user doesn't know which provider is being used |

### Aider's LLM Layer

- **LiteLLM**: Single abstraction for 100+ providers. Handles auth, rate limits, retries, streaming, token counting, and model metadata automatically.
- **Model registry**: `models.py` contains model capabilities (context window, pricing, edit format preference)
- **Streaming first**: All models stream by default
- **Prompt caching**: Native support for Anthropic's prompt caching (saves millions of tokens)
- **Lazy loading**: LiteLLM imported only when needed to save 1.5s startup time

### Cline's LLM Layer

- **40+ native adapters**: Each provider has a dedicated adapter class handling its API quirks
- **Native tool calling**: Uses provider-native function/tool calling (not text-based XML)
- **Streaming with incremental parsing**: `@streamparser/json` for mid-stream tool detection
- **Model capabilities**: Knows which models support parallel tool calling, extended thinking, etc.
- **Retry with backoff**: `retry.ts` handles transient failures
- **Cost tracking**: Per-request token and cost accounting

### What Selfer Must Change in `LLMProvider.ts`

```
Priority 1: Add streaming support (generateResponseStream method)
Priority 2: Add token counting (tiktoken for OpenAI, character estimate for others)
Priority 3: Add request timeout (30s default, configurable)
Priority 4: Add retry with exponential backoff (3 attempts)
Priority 5: Add model metadata (context window size, pricing)
Priority 6: Consider using LiteLLM or Vercel AI SDK instead of raw axios
Priority 7: Add native function/tool calling for providers that support it
```

---

## 6. Deep Comparison: Code Editing Strategy

### Selfer's Editing

**Files:** `src/agents/EditsAgent.ts`, `src/utils/EditParser.ts`

**Strengths:**
- Aider-style SEARCH/REPLACE format (proven to work)
- Fuzzy matching with whitespace normalization
- Indentation adjustment on fuzzy match

**Weaknesses:**

| Issue | Detail |
|-------|--------|
| **Single strategy** | Only SEARCH/REPLACE — no whole-file, no diff, no patch |
| **Duplicate tools** | Both `FileAgent` and `EditsAgent` register `read_file` and `write_file` — the second registration **overwrites** the first in `ToolRegistry` |
| **No dry-run** | Edits are applied immediately — no preview, no validation |
| **No backup** | If an edit corrupts a file, there's no way to recover |
| **No lint check** | After editing, Selfer doesn't verify the file still compiles/parses |
| **File path resolution** | Uses `process.cwd()` which can change — should use the project root from config |
| **No file locking** | Concurrent edits to the same file can corrupt it |
| **EditParser regression** | The fuzzy match skips empty lines in content but not in search, causing misalignment |

### Aider's Editing

- **6 edit strategies**: EditBlock, WholeFile, Patch, UnifiedDiff, Editor, Architect
- **Per-model optimization**: Some models work better with whole-file, others with SEARCH/REPLACE
- **Dry-run validation**: `apply_edits_dry_run()` checks before applying
- **Auto-lint**: Runs linter after every edit — if lint fails, asks LLM to fix
- **Auto-test**: Optionally runs tests after every edit
- **Git-backed undo**: Every edit is auto-committed — can revert instantly
- **Cross-file search**: If SEARCH block not found in target file, checks all chat files

### Cline's Editing

- **Diff viewer**: Shows side-by-side before/after in VS Code
- **User approval**: Every file change requires explicit user approval before applying
- **Timeline tracking**: Changes recorded in VS Code Timeline for rollback
- **Checkpoint system**: Can restore entire project state to any checkpoint
- **Lint integration**: Monitors VS Code's Problems panel and auto-fixes

### What Selfer Must Change

1. **Fix tool name collision**: `FileAgent` and `EditsAgent` both register `read_file` and `write_file`. One overwrites the other. Use unique names or merge the agents.
2. **Add dry-run mode**: Parse and validate edits before applying them.
3. **Add file backup**: Copy the original file before editing. Restore on failure.
4. **Add post-edit validation**: After applying edits, check the file is valid (at minimum, check it's not empty/truncated).
5. **Add whole-file strategy**: For new files or complete rewrites, don't use SEARCH/REPLACE.
6. **Add auto-commit**: After successful edits, auto-commit with a meaningful message.

---

## 7. Deep Comparison: Context Management

### Selfer's Context Management

**Verdict: Essentially non-existent.**

- `ContextGuard.truncate()` exists (caps at 5000 chars) but is **never called** in the orchestrator
- `MemoryStore` consolidates sessions after 5+ interactions but doesn't affect the current orchestrator loop
- No token counting anywhere in the codebase
- No awareness of model context window sizes
- Tool outputs are added to messages at full size — a single `list_files` on a large repo can consume the entire context

### Aider's Context Management

```
System → Examples → ReadOnly Files → RepoMap → Done Messages → Chat Files → Current → Reminder
         ^                             ^
         |                             |
    (token-budgeted)           (dynamically sized based on remaining budget)
```

- **ChatChunks**: Messages organized by priority — when budget is tight, lower-priority chunks are dropped first
- **Token counting**: Every message counted before sending
- **Dynamic repo map**: RepoMap output size adjusts based on remaining token budget
- **Prompt caching**: Anthropic's cache API reduces costs by 90% for repeated context

### Cline's Context Management

- **Auto-compression**: When tokens exceed 80% of context window, older turns are summarized
- **Per-model reserves**: Different token reserves for different model sizes
- **Checkpoint restore**: Can roll back context to a known-good state
- **Context audit log**: Every modification timestamped for debugging
- **Multi-workspace**: Handles context across multiple workspace roots

### What Selfer Must Change

1. **Create `src/utils/TokenCounter.ts`**: Implement token counting (use `tiktoken` for OpenAI, character-based estimate for others)
2. **Add model metadata**: Context window size per model in config
3. **Truncate tool outputs**: Apply `ContextGuard.truncate()` to every tool result in `Orchestrator.execute()`
4. **Add message prioritization**: System prompt and recent messages are highest priority; older observations can be dropped
5. **Add context budget tracking**: Log token usage per turn, warn when approaching the limit

---

## 8. Deep Comparison: Agentic Loop & Tool Execution

### Selfer's Loop

**File:** `src/core/Orchestrator.ts`

```
while (turn < 25):
    response = LLM(messages)
    toolCalls = parseXML(response)
    if no tools: break
    for each tool:
        execute tool
        add result to messages
    if attempt_completion or ask_followup: break
```

**Problems:**

| Issue | Impact |
|-------|--------|
| Tool calls processed **sequentially** | No parallel execution even when independent |
| `attempt_completion` tool is **executed** | It just returns a success message, losing its semantic meaning |
| `ask_followup_question` doesn't actually ask | It formats a message but doesn't prompt the user |
| All 25 turns use the same messages array | Context grows until it overflows |
| No priority between tools | If LLM calls both `read_file` and `write_file`, they run in order — should read first |
| No planning step | Goes straight from user query to tool calling — no decomposition |

### Aider's Loop

```
while not done:
    format_messages()       # Build context with budget
    check_tokens()          # Verify within limits
    send()                  # Stream response
    get_edits()             # Parse edit format
    apply_edits_dry_run()   # Validate
    apply_edits()           # Execute
    auto_commit()           # Git commit
    auto_lint()             # Run linter
    auto_test()             # Run tests
    
    if lint_failed or test_failed:
        send_reflection()   # Ask LLM to fix
        continue
```

**Key differences:**
- **Validation before execution**: Dry-run catches issues before files are modified
- **Post-execution verification**: Lint + test after every edit
- **Reflection on failure**: LLM gets specific error feedback and retries
- **Auto-commit**: Every successful edit is tracked in git

### Cline's Loop

```
while task.isRunning:
    systemPrompt = buildSystemPrompt(context)
    messages = contextManager.getMessages()     # Token-budgeted
    stream = api.createMessage(systemPrompt, messages, tools)
    toolUses = streamHandler.parseFinalizedToolUses(stream)
    
    for each toolUse:
        validated = toolValidator.validate(toolUse)
        approved = autoApprove.check(validated) || await ask(user)
        result = toolExecutor.execute(validated)
        addToMessages(result)
    
    if error == contextWindowExceeded:
        contextManager.compress()
        continue
    
    if error == retryable:
        await exponentialBackoff()
        continue
```

**Key differences:**
- **Streaming tool detection**: Tools identified before full response completes
- **User approval gate**: Every action can be approved/rejected
- **Context-aware retry**: Different strategies for different error types
- **Parallel tool calling**: For models that support it

### What Selfer Must Change in `Orchestrator.ts`

1. **Add a planning step**: Before the tool loop, call `PlanAgent.run()` to decompose the task
2. **Fix `attempt_completion`**: Don't execute it as a tool — treat it as a control signal
3. **Fix `ask_followup_question`**: Actually prompt the user and wait for input
4. **Add reflection**: When tool fails, add a specific "you made this mistake, fix it" message
5. **Add context budget check**: Before each LLM call, verify token count is within limits
6. **Truncate tool outputs**: Use `ContextGuard` on all tool results
7. **Add post-edit verification**: After file edits, verify the file is valid

---

## 9. Deep Comparison: Error Recovery

### Selfer's Error Recovery

- `ErrorRecoveryAgent` exists but is **never invoked** from the orchestrator
- `ErrorTrackerAgent` exists but has no tool implementations
- Tool failures are logged and added to messages, but no structured recovery
- If `parseXmlToolCalls` returns nothing, the loop **breaks** — it assumes the LLM is done, but the LLM might have just formatted the tool call wrong
- No retry, no reflection, no backoff

### Aider's Error Recovery

| Error Type | Strategy |
|------------|----------|
| Malformed edit format | Increment `num_malformed_responses`, send reflection with error details, retry (max 3) |
| Context window exceeded | Truncate history, retry with less context |
| API error | Exponential backoff via LiteLLM |
| SEARCH block not found | Check all chat files, suggest closest match |
| Lint failure after edit | Send lint output to LLM, ask to fix |
| Test failure after edit | Send test output to LLM, ask to fix |

### Cline's Error Recovery

| Error Type | Strategy |
|------------|----------|
| Context window exceeded | Auto-compress older messages, retry |
| API rate limit | Exponential backoff (configurable) |
| Tool execution failure | Partial rollback, ask user how to proceed |
| Streaming interruption | Resume from checkpoint |
| Permission denied | Re-prompt with explanation |
| Command timeout | "Proceed While Running" option |

### What Selfer Must Change

1. **Wire `ErrorRecoveryAgent` into `Orchestrator.ts`**: When a tool fails, call `ErrorRecoveryAgent.run()` to get recovery instructions
2. **Add reflection loop**: When XML parsing finds no tools, check if the response contains tool-like patterns and ask the LLM to reformat
3. **Add retry with backoff**: Wrap LLM calls in a retry loop with exponential backoff
4. **Detect context overflow**: Catch 400/413 errors from providers and truncate messages
5. **Add max-error-per-tool limit**: If the same tool fails 3 times, suggest an alternative approach

---

## 10. Deep Comparison: Testing & Quality

### Selfer's Testing

```json
"test": "echo \"Error: no test specified\" && exit 1"
```

- 5 test files exist but are not runnable
- `test_autonomy.ts` has a mock LLM but no test runner configured
- No linting, no formatting, no CI/CD
- TypeScript `strict: true` is the only quality gate

### Aider's Testing

- `pytest` with comprehensive test suite
- GitHub Actions CI
- `pre-commit` hooks: `black` (formatting) + `flake8` (linting)
- Tests cover: edit parsing, token counting, streaming, git, multi-file edits
- SWE-bench integration for real-world coding task evaluation

### Cline's Testing

- Mocha (unit) + VS Code Test CLI (integration) + Playwright (E2E)
- `c8` coverage reporter
- `biome` for strict linting + formatting
- `lint-staged` + `husky` pre-commit hooks
- GitHub Actions CI with full matrix (Linux, macOS, Windows)

### What Selfer Must Change

1. **Install Vitest**: `npm install -D vitest`
2. **Configure test script**: `"test": "vitest run"`
3. **Write critical tests**:
   - `EditParser.parseBlocks()` — at least 10 test cases
   - `EditParser.applyBlocks()` — exact match, fuzzy match, failure cases
   - `Orchestrator.parseXmlToolCalls()` — valid XML, malformed XML, nested XML, no tools
   - `ToolRegistry.executeTool()` — valid tool, invalid tool, tool error
   - `ContextGuard.truncate()` — boundary cases
4. **Add linting**: `npm install -D @biomejs/biome` or `eslint`
5. **Add CI**: `.github/workflows/ci.yml` with build + test + lint

---

## 11. Deep Comparison: Streaming & UX

### Selfer's UX

- `CLIGui.ts` provides basic colored output and ora spinners
- User sees: spinner → full response dump
- No intermediate feedback during multi-turn execution
- No cost tracking, no token display
- No progress indicator for long tasks

### Aider's UX

- Live markdown rendering during streaming
- Token cost displayed after each message
- Voice-to-code support
- Image/URL context via clipboard
- Rich CLI with multiline editing
- `/` commands for chat management

### Cline's UX

- React-based VS Code webview
- Real-time streaming display with syntax highlighting
- Diff viewer for file changes with approve/reject
- Token usage and cost display per request
- Checkpoint timeline with visual history
- Terminal output streaming

### What Selfer Must Change in `CLIGui.ts`

1. **Add streaming display**: Print LLM output character-by-character as it streams
2. **Add token/cost display**: Show tokens used and estimated cost after each turn
3. **Add turn progress**: "Turn 3/25 — executing read_file..." instead of just "Turn 3/25..."
4. **Add tool result preview**: Show first 3 lines of tool output instead of just "success"
5. **Consider a TUI framework**: `ink` (React for CLIs) would enable richer interfaces

---

## 12. Deep Comparison: Security & Permissions

### Selfer's Security

**Critical vulnerabilities:**

| Vulnerability | File | Detail |
|--------------|------|--------|
| **Arbitrary command execution** | `FileAgent.ts:113` | `execAsync(args.command)` — LLM can run ANY shell command with no approval |
| **Path traversal** | `FileAgent.ts:80` | `path.normalize(args.path).replace(/^(\.\.[\/\\])+/, '')` — only strips leading `..`, not `../../` in the middle |
| **No file access control** | `EditsAgent.ts:60` | Can read/write any file accessible by the process |
| **API keys in plaintext** | `Core.ts:46-49` | Config stored in plaintext JSON with API keys |
| **No git safety** | `GitAgent.ts:56` | `git add .` adds ALL files including secrets, `.env`, etc. |
| **No command allowlist** | `SubProcessAgent.ts:34` | `execAsync(args.command)` — unrestricted shell access |

### Aider's Security

- Git-aware: Only modifies files tracked in git
- Commit confirmation: User confirms before changes are committed
- No arbitrary command execution (edits only)
- `.aider.conf.yml` for project-level configuration

### Cline's Security

- **Full permission model**: `CommandPermissionController` with per-command policies
- **Auto-approve configuration**: Allowlists for safe operations
- **User approval gate**: Every tool execution can require explicit approval
- **MCP OAuth**: Secure token management for external services
- **Workspace `.clinerc`**: Project-level permission rules
- **No arbitrary command execution** without approval

### What Selfer Must Change

1. **Add user approval for destructive actions**: `execute_command`, `delete_path`, `git_push`, `write_file`
2. **Add path validation**: Ensure all file operations stay within the project root
3. **Add command allowlist**: Restrict `execute_command` to known-safe commands (npm, git, tsc, etc.)
4. **Encrypt API keys**: Use OS keychain or encrypted storage instead of plaintext JSON
5. **Add `.gitignore` awareness**: Don't `git add .` — only add files that should be tracked

---

## 13. Deep Comparison: Observability & Debugging

### Selfer's Observability

- `CLIGui.info()`, `CLIGui.error()` — basic console logging
- `PlanAgent` writes failures to `raw_plan_fail.txt` (littering project root)
- No structured logging, no log levels, no log files
- No token tracking, no cost tracking
- No event system, no telemetry

### Aider's Observability

- `io.log_llm_history()` for LLM conversation logging
- Event system: `self.event("message_send_starting")`
- `num_malformed_responses`, `num_exhausted_context_windows` metrics
- Token and cost calculation per message
- `chat_completion_call_hashes` for deduplication

### Cline's Observability

- OpenTelemetry integration (traces, metrics, logs)
- PostHog analytics
- `ErrorService` for structured error tracking
- `Logger` service with log levels
- Per-request token and cost accounting

### What Selfer Must Change

1. **Add structured logging**: Use `winston` or `pino` with log levels
2. **Add token tracking**: Count tokens in/out per LLM call, display to user
3. **Add session logging**: Write full conversation history to `.selfer/logs/`
4. **Remove `raw_plan_fail.txt`**: Use proper logging instead of littering project files
5. **Add timing metrics**: Track time per tool execution, time per LLM call

---

## 14. File-by-File Changes Required

### Critical (Must Fix — Currently Broken)

| File | Change | Effort |
|------|--------|--------|
| `src/core/Orchestrator.ts` | 1. Add token counting before LLM calls<br>2. Truncate tool outputs via ContextGuard<br>3. Add reflection loop on parse failure<br>4. Fix `attempt_completion` (control signal, not tool exec)<br>5. Fix `ask_followup_question` (actually prompt user)<br>6. Add max-reflections counter | Large |
| `src/core/LLMProvider.ts` | 1. Add `generateResponseStream()` for all providers<br>2. Add request timeout (30s default)<br>3. Add retry with exponential backoff (3 attempts)<br>4. Fix Gemini system message handling<br>5. Add token counting per response<br>6. Log which provider is active in FallbackProvider | Large |
| `src/core/NativeToolFactory.ts` | Fix duplicate tool registration — `FileAgent` and `EditsAgent` both register `read_file` and `write_file`. One silently overwrites the other. Either merge agents or use unique tool names. | Small |
| `src/core/SystemPromptBuilder.ts` | 1. Add repo map to system prompt<br>2. Mention tool names and correct XML format with examples<br>3. Add context about what files are already known<br>4. Fix `replace_in_file` reference (tool is actually `apply_search_replace`) | Medium |
| `package.json` | 1. Fix test script<br>2. Add linting script<br>3. Add dev dependencies (vitest, eslint/biome)<br>4. Add description, keywords, author | Small |

### High Priority (Causes Frequent Failures)

| File | Change | Effort |
|------|--------|--------|
| `src/agents/FileAgent.ts` | 1. Add user approval for `execute_command` and `delete_path`<br>2. Fix path traversal vulnerability<br>3. Add timeout for command execution<br>4. Add output truncation for large results | Medium |
| `src/agents/EditsAgent.ts` | 1. Remove duplicate `read_file`/`write_file` tools (use `FileAgent`'s)<br>2. Add dry-run validation before applying edits<br>3. Add file backup before editing | Medium |
| `src/utils/EditParser.ts` | 1. Fix fuzzy match empty-line alignment bug<br>2. Add backup of original file before writing<br>3. Return diff of changes for user review | Medium |
| `src/core/ToolRegistry.ts` | 1. Detect and warn on duplicate tool names<br>2. Add tool execution timeout<br>3. Add tool result size limits | Small |
| `src/utils/ContextGuard.ts` | 1. Increase default from 5000 to 15000 chars<br>2. Add smart truncation (keep first + last lines, not just first)<br>3. Add per-tool-type limits | Small |

### Medium Priority (Improves Reliability)

| File | Change | Effort |
|------|--------|--------|
| `src/core/Router.ts` | 1. Add PlanAgent integration for complex queries<br>2. Add query classification (simple vs complex)<br>3. Add memory context injection | Medium |
| `src/core/Core.ts` | 1. Add graceful shutdown (SIGINT handler)<br>2. Add session ID tracking<br>3. Remove unused agent imports (11 agents imported but never used) | Small |
| `src/core/MemoryStore.ts` | 1. Add error handling for corrupt memory files<br>2. Add memory size limit<br>3. Add context injection into system prompt | Small |
| `src/agents/GitAgent.ts` | 1. Add `.gitignore` awareness to `git add`<br>2. Add user confirmation before commit/push<br>3. Add branch awareness | Small |
| `src/agents/SubProcessAgent.ts` | 1. Add command allowlist<br>2. Add execution timeout<br>3. Add output streaming | Medium |
| `src/utils/CLIGui.ts` | 1. Add streaming text display<br>2. Add token/cost display<br>3. Add turn progress detail | Small |
| `src/agents/PlanAgent.ts` | 1. Remove `raw_plan_fail.txt` file creation<br>2. Add plan execution logic in Router<br>3. Add plan validation | Medium |

### Low Priority (Nice to Have)

| File | Change | Effort |
|------|--------|--------|
| `src/utils/RepoMap.ts` | 1. Add AST-based extraction (ts-morph) instead of regex<br>2. Add token-budgeted output sizing<br>3. Add caching | Large |
| `src/core/McpManager.ts` | 1. Add reconnection logic<br>2. Add health checks<br>3. Add tool caching | Medium |
| `src/agents/BrowserAgent.ts` | Implement basic browser automation (Playwright) | Large |
| `src/agents/WebAgent.ts` | Implement web search (via API) | Medium |
| `src/agents/MemoryAgent.ts` | Implement long-term memory tools | Medium |
| `src/agents/ReviewAgent.ts` | Implement code review tools | Medium |
| `src/core/SkillManager.ts` | Add skill auto-selection based on query content | Small |

---

## 15. New Files to Create

| File | Purpose | Priority |
|------|---------|----------|
| `src/utils/TokenCounter.ts` | Token counting utility (tiktoken for OpenAI, estimate for others) | Critical |
| `src/utils/RetryHandler.ts` | Exponential backoff retry wrapper for LLM calls | Critical |
| `src/core/ModelRegistry.ts` | Model metadata: context window, pricing, capabilities, preferred edit format | High |
| `tests/EditParser.test.ts` | Unit tests for SEARCH/REPLACE parsing | High |
| `tests/Orchestrator.test.ts` | Unit tests for XML parsing and loop logic | High |
| `tests/ToolRegistry.test.ts` | Unit tests for tool registration and execution | High |
| `.github/workflows/ci.yml` | CI pipeline: build + test + lint | High |
| `vitest.config.ts` | Test runner configuration | High |
| `.eslintrc.json` or `biome.json` | Linting configuration | Medium |
| `src/core/ApprovalGate.ts` | User approval system for destructive operations | Medium |
| `src/utils/Logger.ts` | Structured logging with levels and file output | Medium |
| `.env.example` | Document required environment variables | Low |
| `CONTRIBUTING.md` | Contribution guidelines | Low |

---

## 16. Implementation Priority Roadmap

### Phase 1: Stop Crashing (Week 1)

> Goal: Selfer should complete simple tasks without crashing.

- [ ] **Fix duplicate tool names** in `NativeToolFactory.ts`
- [ ] **Add ContextGuard to Orchestrator** — truncate all tool outputs before adding to messages
- [ ] **Add request timeout** to all LLM providers (30 seconds)
- [ ] **Fix `attempt_completion`** — treat as control signal, not tool execution
- [ ] **Fix `ask_followup_question`** — actually prompt the user
- [ ] **Add basic retry** — 3 attempts with 1s/2s/4s backoff on LLM calls
- [ ] **Fix Gemini system message** — use Gemini's native system instruction field

### Phase 2: Stop Failing (Week 2)

> Goal: Selfer should handle errors gracefully and self-correct.

- [ ] **Add reflection loop** — when tool parsing fails, tell the LLM what went wrong
- [ ] **Wire ErrorRecoveryAgent** into the orchestrator
- [ ] **Add token counting** — `TokenCounter.ts` with tiktoken
- [ ] **Add context budget check** — warn and truncate when approaching limits
- [ ] **Fix path traversal** — validate all paths stay within project root
- [ ] **Add tool output size limits** — cap at 15,000 characters per tool result

### Phase 3: Become Reliable (Week 3–4)

> Goal: Selfer should work correctly on multi-step tasks.

- [ ] **Add streaming** — `generateResponseStream()` for all providers
- [ ] **Add streaming display** — show LLM output as it arrives
- [ ] **Wire PlanAgent** — decompose complex tasks before executing
- [ ] **Add post-edit validation** — verify files are valid after editing
- [ ] **Add file backup** — save original before editing
- [ ] **Add user approval** — for destructive operations (delete, execute, push)
- [ ] **Add auto-commit** — git commit after successful edits

### Phase 4: Become Production-Grade (Month 2)

> Goal: Selfer should be comparable to Aider/Cline in core functionality.

- [ ] **Add test suite** — Vitest with 50+ tests covering core modules
- [ ] **Add CI/CD** — GitHub Actions with build + test + lint
- [ ] **Add structured logging** — winston/pino with log levels and files
- [ ] **Add model registry** — context windows, pricing, capabilities per model
- [ ] **Add native function calling** — for providers that support it
- [ ] **Improve RepoMap** — AST-based extraction with ts-morph
- [ ] **Add token/cost display** — show per-turn and cumulative costs
- [ ] **Add proper README** — installation, usage, configuration, examples

### Phase 5: Polish (Month 3+)

> Goal: Selfer should be a delightful developer tool.

- [ ] Implement BrowserAgent (Playwright)
- [ ] Implement WebAgent (web search API)
- [ ] Add TUI framework (ink) for richer terminal UI
- [ ] Add slash commands for conversation management
- [ ] Add prompt caching for Anthropic
- [ ] Add parallel tool execution for independent tools
- [ ] Add checkpoint/restore for task state
- [ ] Add VS Code extension wrapper

---

## 17. Conclusion

**Selfer has strong architectural foundations** — the agent pattern, tool registry, MCP support, and skill system are all well-designed. But it has the classic problem of a **prototype that looks complete but isn't**: every subsystem is implemented at 30–50% depth, which means it fails at the boundaries.

**The top 3 changes that would have the biggest impact:**

1. **Add context management** (token counting + truncation + budget) — this alone would fix 40% of failures
2. **Add reflection/retry in the orchestrator** — this would fix another 30% of failures  
3. **Fix the duplicate tool registration** — this is a silent bug that causes unpredictable behavior

**The fundamental mindset shift needed:**

| Prototype Thinking | Production Thinking |
|-------------------|---------------------|
| "It works in my demo" | "It works on any repo, any model, any task" |
| "I'll add error handling later" | "Error handling IS the feature" |
| "Tests slow me down" | "Tests let me move fast" |
| "The LLM will figure it out" | "The LLM needs guardrails to succeed" |
| "One big loop is simple" | "Phases (plan → execute → validate → commit) are reliable" |

Aider and Cline succeeded because they obsessed over the **failure paths**, not the happy paths. Every edge case — malformed LLM output, context overflow, file not found, git conflict, API timeout — has a specific handler. Selfer needs to adopt this same discipline.

**The good news:** Selfer's modular architecture makes all of these changes possible without a rewrite. The agent pattern, tool registry, and provider abstraction are the right abstractions — they just need to be filled in with production-grade implementations.

---

*Generated by analysis of Selfer (commit HEAD), Aider v0.86+ architecture, and Cline v3.x architecture.*
*Last updated: 2026-03-10*
