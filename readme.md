# Selfer

Selfer is a robust, autonomous AI coding assistant designed for advanced repository management and task execution.

## 🚀 Key Features

- **Unified Orchestration**: Moves beyond static planning to a dynamic "Think-Act-Observe" loop (inspired by Cline).
- **MCP Integration**: Fully compatible with the Model Context Protocol (MCP), allowing seamless extension with external tools (Brave Search, Postgres, etc.).
- **Native Tool Support**: Includes a suite of native tools for File I/O, Git operations, Code analysis (Aider-style SEARCH/REPLACE), and more.
- **Provider Agnostic**: Supports OpenAI, Gemini, Claude, and local models via Ollama.

## 🛠️ Getting Started

### Installation
```bash
npm install
npm run build
npm install -g .
```

### Configuration
1. Initialize the project: `selfer init`
2. Configure LLM API keys in `.selfer/config.json`.
3. (Optional) Add MCP servers to `.selfer/mcp_settings.json`.

### Usage
Run `selfer start` to enter the interactive chat interface.

## 🏗️ Architecture

Selfer's core is the **Orchestrator**, which manages a continuous loop of reasoning and tool execution. All agents are registered as tools in a central **ToolRegistry**, making the system highly extensible and resilient to execution errors.
