import { CommandRegistry, SelferAction } from './CommandRegistry.js';
import { ThinkingCore } from '../ThinkingCore.js';

/**
 * Register all core actions for Selfer.
 * (Ported and renamed from src-reference/commands/)
 */
export function registerCoreActions(registry: CommandRegistry, core: ThinkingCore) {
  const unavailable = (name: string, reason: string) => {
    registry.register({
      name,
      description: `${name} compatibility command.`,
      execute: async () => `${name} is not fully wired in this build. ${reason}`
    });
  };

  // /pulse - Environment check
  registry.register({
    name: 'pulse',
    description: 'Selfer performance and environment diagnostics.',
    execute: async () => {
      const result = await core.executeSkillDirect('PulseSkill', {});
      return result.content;
    }
  });

  // /radar - File content search
  registry.register({
    name: 'radar',
    description: 'Perform a deep code search across the workspace.',
    execute: async (args) => {
      if (!args[0]) return 'Usage: /radar <query>';
      const result = await core.executeSkillDirect('Grep', { query: args[0], directory: '.' });
      return result.content;
    }
  });

  // /disk - Fast file read
  registry.register({
    name: 'disk',
    description: 'Quickly read workspace files.',
    execute: async (args) => {
      if (!args[0]) return 'Usage: /disk <file_path>';
      const result = await core.executeSkillDirect('FileRead', { absolute_path: args[0] });
      return result.content;
    }
  });

  // /help - List all actions and skills
  registry.register({
    name: 'help',
    description: 'Show all available Selfer actions and AI capabilities.',
    execute: async () => {
      const actions = registry.getActions();
      const skills = core.getSkillList();
      
      let help = '🚀 Selfer v3.0.0 - Deep Architectural Parity\n\n';
      help += '--- Manual Slash Commands ---\n';
      help += actions.map(a => `/${a.name.padEnd(8)} - ${a.description}`).join('\n');
      
      help += '\n\n--- Autonomous AI Skills (What I can do for you) ---\n';
      help += skills.map(s => `${s.name.padEnd(16)}: ${s.description}`).join('\n');
      
      return help;
    }
  });

  // /config - System diagnostics
  registry.register({
    name: 'config',
    description: 'Show active provider and model configuration.',
    execute: async (args) => {
      if (args[0] === 'get' && args[1]) {
        const result = await core.executeSkillDirect('Config', { action: 'read', key: args[1] });
        return result.content;
      }
      if (args[0] === 'set' && args[1]) {
        const value = args.slice(2).join(' ');
        if (!value) return 'Usage: /config set <key> <value>';
        const result = await core.executeSkillDirect('Config', { action: 'update', key: args[1], value });
        return result.content;
      }

      const skills = core.getSkillList();
      const stats = core.getCostStats();
      return `🛠️ Selfer Environment Config [v3.0.0]\n` +
             `-----------------------------------\n` +
             `Provider : ${core.getProviderName()}\n` +
             `Model    : ${core.getModelName()}\n` +
             `Session  : ${core.getCurrentSessionId()}\n` +
             `Skills   : ${skills.length} active\n` +
             `Usage    : ${stats.totalCost} USD estimated\n` +
             `CWD      : ${process.cwd()}\n\n` +
             `Usage:\n/config get <key>\n/config set <key> <value>`;
    }
  });

  // /tasks - Persistent Goal list
  registry.register({
    name: 'tasks',
    description: 'List all persistent agentic goals.',
    execute: async (args) => {
      const action = (args[0] || 'list').toLowerCase();
      if (action === 'create') {
        const title = args[1];
        const description = args.slice(2).join(' ');
        if (!title || !description) return 'Usage: /tasks create <title> <description>';
        const result = await core.executeSkillDirect('TaskSkill', { title, description, status: 'active' });
        return result.content;
      }

      if (action === 'update') {
        const id = args[1];
        const status = args[2] as 'active' | 'completed' | 'blocked' | undefined;
        const description = args.slice(3).join(' ');
        if (!id || !status) return 'Usage: /tasks update <id> <active|completed|blocked> [description]';
        const result = await core.executeSkillDirect('TaskSkill', {
          id,
          title: 'updated-task',
          description: description || 'No description update provided.',
          status
        });
        return result.content;
      }

      const tasks = core.getTaskManager().getTasks();
      if (tasks.length === 0) return 'No persistent tasks found.';
      return '📋 Persistent Selfer Goals:\n' + 
             tasks.map(t => `${t.id.padEnd(12)} [${t.status.toUpperCase()}] ${t.title}`).join('\n');
    }
  });

  // /costs - Usage diagnostics
  registry.register({
    name: 'costs',
    description: 'Show detailed token and USD cost stats.',
    execute: async () => {
      const stats = core.getCostStats();
      return `💰 Selfer Usage Metrics:\n` +
             `-----------------------\n` +
             `Input Tokens  : ${stats.totalInput}\n` +
             `Output Tokens : ${stats.totalOutput}\n` +
             `Estimated USD : $${stats.totalCost}`;
    }
  });

  // /cost - Alias for /costs
  registry.register({
    name: 'cost',
    description: 'Alias for /costs.',
    execute: async () => registry.run('/costs') as Promise<string>
  });

  // /doctor - Alias for /pulse
  registry.register({
    name: 'doctor',
    description: 'Run environment diagnostics (alias of /pulse).',
    execute: async () => registry.run('/pulse') as Promise<string>
  });

  // /skills - List all registered skills
  registry.register({
    name: 'skills',
    description: 'List all autonomous skills currently registered.',
    execute: async () => {
      const skills = core.getSkillList();
      if (skills.length === 0) return 'No skills are currently registered.';
      return `Available skills (${skills.length}):\n` +
        skills.map(s => `- ${s.name}: ${s.description}`).join('\n');
    }
  });

  // /memory - Read/write persistent insight memory
  registry.register({
    name: 'memory',
    description: 'Read or update persistent insights. Usage: /memory read <key> OR /memory write <key> <text>',
    execute: async (args) => {
      const action = args[0];
      const key = args[1] || 'main';
      if (action === 'list') {
        const items = await core.listDetailedMemories(100);
        if (items.length === 0) return 'No persistent memories found.';
        return `Memories (${items.length}):\n` + items.map(i => `- ${i.key} @ ${i.timestamp}`).join('\n');
      }
      if (action === 'read') {
        const value = await core.readMemory(key);
        return value ? `Memory[${key}]\n${value}` : `No memory found for key: ${key}`;
      }
      if (action === 'write' || action === 'update') {
        const summary = args.slice(2).join(' ').trim();
        if (!summary) return 'Usage: /memory write <key> <summary text>';
        if (action === 'write') {
          await core.writeMemory(key, summary);
          return `Memory key ${key} written.`;
        }
        const existing = await core.readMemory(key);
        const next = existing
          ? `${existing}\n\n[Update ${new Date().toISOString()}]\n${summary}`
          : summary;
        await core.writeMemory(key, next);
        return `Memory key ${key} updated.`;
      }
      if (action === 'delete') {
        const ok = await core.deleteMemory(key);
        return ok ? `Memory key ${key} deleted.` : `Memory key ${key} not found.`;
      }
      return 'Usage: /memory list | /memory read <key> | /memory write <key> <text> | /memory update <key> <text> | /memory delete <key>';
    }
  });

  // /sessions - list recent sessions
  registry.register({
    name: 'sessions',
    description: 'List recent conversation sessions.',
    execute: async () => {
      const sessions = await core.getRecentSessions(20);
      if (sessions.length === 0) return 'No previous sessions found.';
      return 'Recent sessions:\n' + sessions
        .map(s => `- ${s.sessionId} (${new Date(s.timestamp).toLocaleString()})`)
        .join('\n');
    }
  });

  // /session - alias for /sessions
  registry.register({
    name: 'session',
    description: 'Alias for /sessions.',
    execute: async () => registry.run('/sessions') as Promise<string>
  });

  // /resume - load previous session into context
  registry.register({
    name: 'resume',
    description: 'Resume a previous session. Usage: /resume <sessionId>',
    execute: async (args) => {
      const sessionId = args[0];
      if (!sessionId) return 'Usage: /resume <sessionId> (Tip: run /sessions first)';
      const result = await core.resumeSession(sessionId);
      if (result.loaded === 0) return `Session ${sessionId} not found or empty.`;
      return `Resumed ${sessionId}. Loaded ${result.loaded} historical messages.`;
    }
  });

  // /context - display generated context prompt
  registry.register({
    name: 'context',
    description: 'Show the active project and git context summary.',
    execute: async () => {
      return core.getContextSummary();
    }
  });

  // /mcp - Connect to MCP server
  registry.register({
    name: 'mcp',
    description: 'Connect to MCP server. Usage: /mcp <command> [args...]',
    execute: async (args) => {
      if (!args[0]) return 'Usage: /mcp <command> [args...]';
      const result = await core.executeSkillDirect('ConnectMcpSkill', {
        serverCommand: args[0],
        serverArgs: args.slice(1)
      });
      return result.content;
    }
  });

  // /review - Quick diagnostics review for a file
  registry.register({
    name: 'review',
    description: 'Run diagnostics for a file. Usage: /review <file_path>',
    execute: async (args) => {
      if (!args[0]) {
        const result = await core.executeSkillDirect('Bash', { command: 'npx tsc --noEmit' });
        return result.content;
      }

      const diagnostics = await core.executeSkillDirect('CodeAwarenessSkill', {
        action: 'diagnostics',
        filePath: args[0]
      });
      const refs = await core.executeSkillDirect('LSP', {
        action: 'references',
        filePath: args[0],
        line: 0,
        character: 0
      });

      return `${diagnostics.content}\n\n---\n${refs.content}`;
    }
  });

  // /status - project status overview
  registry.register({
    name: 'status',
    description: 'Show project + git status details.',
    execute: async () => {
      const result = await core.executeSkillDirect('Bash', {
        command: "git rev-parse --abbrev-ref HEAD 2>/dev/null && git --no-pager status --short && echo '---' && pwd"
      });
      return result.content;
    }
  });

  // /files - quick workspace file inventory
  registry.register({
    name: 'files',
    description: 'List key files in the workspace. Usage: /files [pattern]',
    execute: async (args) => {
      const pattern = args[0] || '**/*.{ts,tsx,md,json}';
      const result = await core.executeSkillDirect('Glob', { pattern, cwd: '.' });
      return result.content;
    }
  });

  // /branch - show branch details
  registry.register({
    name: 'branch',
    description: 'Show current branch and recent commits.',
    execute: async () => {
      const result = await core.executeSkillDirect('Bash', {
        command: 'git rev-parse --abbrev-ref HEAD && git --no-pager log --oneline -5'
      });
      return result.content;
    }
  });

  // /summary - summarize active operational context
  registry.register({
    name: 'summary',
    description: 'Show concise summary of current run state.',
    execute: async () => {
      const stats = core.getCostStats();
      const skills = core.getSkillList();
      const sessions = await core.getRecentSessions(3);
      return [
        'Selfer Summary',
        `Provider: ${core.getProviderName()}`,
        `Model: ${core.getModelName()}`,
        `Session: ${core.getCurrentSessionId()}`,
        `Skills: ${skills.length}`,
        `Tokens: ${stats.totalInput + stats.totalOutput}`,
        `Recent sessions: ${sessions.map(s => s.sessionId).join(', ') || 'none'}`
      ].join('\n');
    }
  });

  // /stats - alias for /summary
  registry.register({
    name: 'stats',
    description: 'Alias for /summary.',
    execute: async () => registry.run('/summary') as Promise<string>
  });

  // /usage - alias for /costs
  registry.register({
    name: 'usage',
    description: 'Alias for /costs.',
    execute: async () => registry.run('/costs') as Promise<string>
  });

  // /version - show app/runtime version metadata
  registry.register({
    name: 'version',
    description: 'Show Selfer and runtime versions.',
    execute: async () => {
      const result = await core.executeSkillDirect('Bash', {
        command: 'node -v && npm -v'
      });
      return `Selfer v3.1.0\n${result.content}`;
    }
  });

  // /model - inspect or switch model in persisted config
  registry.register({
    name: 'model',
    description: 'Get or set model in config. Usage: /model [newModel]',
    execute: async (args) => {
      if (!args[0]) {
        const read = await core.executeSkillDirect('Config', { action: 'read', key: 'model' });
        return `Current configured model: ${read.content}`;
      }
      const update = await core.executeSkillDirect('Config', {
        action: 'update',
        key: 'model',
        value: args[0]
      });
      return `${update.content}\nRestart /run to use the new model.`;
    }
  });

  // /env - minimal safe env diagnostics
  registry.register({
    name: 'env',
    description: 'Show safe environment diagnostics.',
    execute: async () => {
      const keys = ['HOME', 'SHELL', 'PWD', 'TERM', 'LANG'];
      return keys.map(k => `${k}=${process.env[k] || ''}`).join('\n');
    }
  });

  // /permissions - show permission policy snapshot
  registry.register({
    name: 'permissions',
    description: 'Show current permission model summary.',
    execute: async () => {
      return [
        'Permission Model',
        '- Read/search skills are auto-allowed.',
        '- Write/exec/task skills are logged and policy-checked.',
        '- Dangerous bash patterns are denied.'
      ].join('\n');
    }
  });

  // /plan - Enter/exit plan mode
  registry.register({
    name: 'plan',
    description: 'Plan mode control. Usage: /plan enter <description> | /plan exit',
    execute: async (args) => {
      const mode = (args[0] || '').toLowerCase();
      if (mode === 'enter') {
        const result = await core.executeSkillDirect('PlanMode', {
          action: 'EnterPlanMode',
          planDescription: args.slice(1).join(' ')
        });
        return result.content;
      }
      if (mode === 'exit') {
        const result = await core.executeSkillDirect('PlanMode', { action: 'ExitPlanMode' });
        return result.content;
      }
      return 'Usage: /plan enter <description> | /plan exit';
    }
  });

  // /worktree - Enter or exit worktree mode
  registry.register({
    name: 'worktree',
    description: 'Worktree control. Usage: /worktree enter <branch> | /worktree exit',
    execute: async (args) => {
      const mode = (args[0] || '').toLowerCase();
      if (mode === 'enter') {
        if (!args[1]) return 'Usage: /worktree enter <branch>';
        const result = await core.executeSkillDirect('Worktree', {
          action: 'EnterWorktree',
          branchName: args[1]
        });
        return result.content;
      }
      if (mode === 'exit') {
        const result = await core.executeSkillDirect('Worktree', { action: 'ExitWorktree' });
        return result.content;
      }
      return 'Usage: /worktree enter <branch> | /worktree exit';
    }
  });

  // /search - Alias for /radar
  registry.register({
    name: 'search',
    description: 'Alias for /radar <query>.',
    execute: async (args) => registry.run(`/radar ${args.join(' ')}`) as Promise<string>
  });

  // /diff - Show git diff summary
  registry.register({
    name: 'diff',
    description: 'Show current git diff summary and preview.',
    execute: async () => {
      const result = await core.executeSkillDirect('Bash', {
        command: "git --no-pager diff --stat && echo '---' && git --no-pager diff | head -200"
      });
      return result.content || 'No diff output available.';
    }
  });

  // /commit - Create git commit
  registry.register({
    name: 'commit',
    description: 'Create a git commit. Usage: /commit <message>',
    execute: async (args) => {
      const message = args.join(' ').trim();
      if (!message) return 'Usage: /commit <message>';
      const escaped = message.replace(/"/g, '\\"');
      const result = await core.executeSkillDirect('Bash', {
        command: `git add -A && git commit -m "${escaped}"`
      });
      return result.content;
    }
  });

  // /export - export current transcript view
  registry.register({
    name: 'export',
    description: 'Export a lightweight session snapshot to memory key.',
    execute: async (args) => {
      const key = args[0] || `session_${Date.now()}`;
      const snapshot = await core.getContextSummary();
      await core.writeMemory(key, snapshot);
      return `Exported context snapshot to memory key: ${key}`;
    }
  });

  // /theme - persistent theme preference
  registry.register({
    name: 'theme',
    description: 'Get or set theme preference. Usage: /theme [name]',
    execute: async (args) => {
      if (!args[0]) {
        const read = await core.executeSkillDirect('Config', { action: 'read', key: 'theme' });
        return `Current theme: ${read.content || 'default'}`;
      }
      const update = await core.executeSkillDirect('Config', {
        action: 'update',
        key: 'theme',
        value: args[0]
      });
      return `${update.content}\nTheme preference saved. Restart Selfer to apply UI-level theme changes.`;
    }
  });

  // /vim - persistent vim-mode preference
  registry.register({
    name: 'vim',
    description: 'Get or set vim mode. Usage: /vim [on|off]',
    execute: async (args) => {
      if (!args[0]) {
        const read = await core.executeSkillDirect('Config', { action: 'read', key: 'vimMode' });
        return `vimMode=${read.content || 'off'}`;
      }
      const val = args[0].toLowerCase();
      if (val !== 'on' && val !== 'off') return 'Usage: /vim [on|off]';
      const update = await core.executeSkillDirect('Config', {
        action: 'update',
        key: 'vimMode',
        value: val
      });
      return `${update.content}\nInput layer vim bindings are not yet implemented, but preference is stored.`;
    }
  });

  // Compatibility stubs for external integrations
  unavailable('login', 'Cloud auth flow is not implemented in this CLI variant.');
  unavailable('logout', 'Cloud auth flow is not implemented in this CLI variant.');
  unavailable('desktop', 'Desktop handoff is not available in terminal-only build.');
  unavailable('mobile', 'Mobile handoff is not available in terminal-only build.');
  unavailable('share', 'Session sharing backend is not configured.');
  unavailable('voice', 'Voice mode is not implemented yet.');
  unavailable('pr_comments', 'PR provider integration is not configured.');

  // /clear - Clear conversation history
  registry.register({
    name: 'clear',
    description: 'Clear the current conversation history.',
    execute: async () => {
      core.clearHistory();
      return 'Transcript cleared. Started a new context window.';
    }
  });

  // /compact - Compact conversation history
  registry.register({
    name: 'compact',
    description: 'Manually compact conversation history to save tokens.',
    execute: async () => {
      try {
        const { before, after } = await core.compactHistoryNow();
        return `Successfully compacted history from ${before} to ${after} messages.`;
      } catch (err: any) {
        return `Failed to compact history: ${err.message}`;
      }
    }
  });
}

