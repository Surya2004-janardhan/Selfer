# Selfer — Autonomous AI Coding Agent for Your Terminal

Selfer is a TypeScript-based autonomous AI coding agent that lives in your terminal. Give it a task in plain English and it will read files, write code, run commands, and iterate until the job is done.

---

## Features

- **Multi-agent architecture** – Specialised agents for file ops, code edits, git, subprocess, and more
- **Multiple LLM providers** – OpenAI, Anthropic Claude, Google Gemini, and local Ollama models
- **Automatic fallback** – If the primary provider fails, Selfer tries the next one automatically
- **SEARCH/REPLACE editing** – Aider-style surgical edits with fuzzy matching
- **Error recovery & reflection** – When a tool fails, Selfer adds a targeted recovery hint and retries
- **Context budget management** – Token counting and automatic message trimming to stay within model limits
- **MCP support** – Connect to Model Context Protocol servers for additional tools
- **Retry with backoff** – Transient API failures are retried with exponential backoff
- **Graceful shutdown** – Ctrl+C is handled cleanly; no lost state
- **Structured logging** – JSON-lines log files in `.selfer/logs/`

---

## Installation

```bash
git clone https://github.com/Surya2004-janardhan/Selfer.git
cd Selfer
npm install
npm run build
npm link          # makes `selfer` available globally
```

---

## Quick Start

### 1. Initialise a project

```bash
cd /path/to/your-project
selfer init
```

This creates a `.selfer/` directory containing `config.json` and `memory.json`.

### 2. Configure your LLM provider

Edit `.selfer/config.json`:

```json
{
  "openai": { "apiKey": "sk-...", "model": "gpt-4o" },
  "claude": { "apiKey": "sk-ant-...", "model": "claude-3-5-sonnet-20241022" },
  "gemini": { "apiKey": "AIza...", "model": "gemini-1.5-pro" },
  "ollama": { "model": "llama3:8b", "baseUrl": "http://localhost:11434" }
}
```

You only need to fill in the providers you want to use. Selfer will try them in the order they appear and fall back to the next if one fails.

### 3. Start Selfer

```bash
selfer start
```

Then type your task:

```
What can I help you with? add input validation to the login function in src/auth.ts
```

---

## Commands

| Input | Description |
|-------|-------------|
| Any natural language | Executes an autonomous coding task |
| `/skills` | Lists available skills |
| `/<skill-name>` | Loads a specific skill context |
| `exit` / `quit` | Exits Selfer gracefully |
| Ctrl+C | Also exits gracefully |

---

## Available Tools

Selfer exposes these tools to the LLM:

| Tool | Agent | Description |
|------|-------|-------------|
| `list_files` | FileAgent | List files recursively |
| `read_file` | FileAgent | Read a file's content |
| `write_file` | FileAgent | Write/create a file |
| `execute_command` | FileAgent | Run a shell command (60s timeout) |
| `delete_path` | FileAgent | Delete a file or directory |
| `apply_search_replace` | EditsAgent | Apply SEARCH/REPLACE blocks |
| `read_file_for_edit` | EditsAgent | Read a file before editing |
| `write_file_full` | EditsAgent | Full-file write/rewrite |
| `git_status` | GitAgent | Show git status |
| `git_diff` | GitAgent | Show staged diff |
| `git_commit` | GitAgent | Stage tracked changes and commit |
| `git_push` | GitAgent | Push to remote |
| `execute` | SubProcessAgent | Run a command in a custom directory |

---

## Configuration Reference

`.selfer/config.json` options:

```json
{
  "openai":   { "apiKey": "", "model": "gpt-4o" },
  "gemini":   { "apiKey": "", "model": "gemini-1.5-pro" },
  "claude":   { "apiKey": "", "model": "claude-3-5-sonnet-20241022" },
  "ollama":   { "model": "llama3:8b", "baseUrl": "http://localhost:11434" },
  "telegram": { "enabled": false, "botToken": "" },
  "master":   "Master"
}
```

Environment variables (see `.env.example`):
- `LOG_LEVEL` — `debug` | `info` | `warn` | `error` (default: `info`)
- `LOG_DIR` — directory for log files (default: `.selfer/logs`)

---

## Development

```bash
npm run build      # compile TypeScript
npm test           # run all tests
npm run dev        # build + run
```

---

## Project Structure

```
src/
  core/         Orchestrator, Router, LLMProvider, ToolRegistry, etc.
  agents/       Specialised agent classes (FileAgent, GitAgent, EditsAgent, ...)
  utils/        CLIGui, EditParser, ContextGuard, TokenCounter, Logger, etc.
tests/          Vitest unit tests
skills/         Markdown skill files
.selfer/        Runtime data (config, memory, logs) — gitignored
```

---

## Licence

ISC
