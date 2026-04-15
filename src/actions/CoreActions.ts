import { CommandRegistry, SelferAction } from './CommandRegistry.js';
import { ThinkingCore } from '../ThinkingCore.js';

/**
 * Register all core actions for Selfer.
 * (Ported and renamed from src-reference/commands/)
 */
export function registerCoreActions(registry: CommandRegistry, core: ThinkingCore) {
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
    execute: async () => {
      const skills = core.getSkillList();
      const stats = core.getCostStats();
      return `🛠️ Selfer Environment Config [v3.0.0]\n` +
             `-----------------------------------\n` +
             `Provider : ${core.getProviderName()}\n` +
             `Model    : ${core.getModelName()}\n` +
             `Skills   : ${skills.length} active\n` +
             `Usage    : ${stats.totalCost} USD estimated\n` +
             `CWD      : ${process.cwd()}`;
    }
  });

  // /tasks - Persistent Goal list
  registry.register({
    name: 'tasks',
    description: 'List all persistent agentic goals.',
    execute: async () => {
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
      if (action === 'read') {
        const result = await core.executeSkillDirect('SyntheticOutput', { action: 'read', key });
        return result.content;
      }
      if (action === 'write' || action === 'update') {
        const summary = args.slice(2).join(' ').trim();
        if (!summary) return 'Usage: /memory write <key> <summary text>';
        const result = await core.executeSkillDirect('SyntheticOutput', { action, key, summary });
        return result.content;
      }
      return 'Usage: /memory read <key> | /memory write <key> <text> | /memory update <key> <text>';
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
      if (!args[0]) return 'Usage: /review <file_path>';
      const result = await core.executeSkillDirect('CodeAwarenessSkill', {
        action: 'diagnostics',
        filePath: args[0]
      });
      return result.content;
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

