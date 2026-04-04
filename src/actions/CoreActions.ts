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
      const result = await core.executeSkillDirect('RadarSkill', { query: args[0] });
      return result.content;
    }
  });

  // /disk - Fast file read
  registry.register({
    name: 'disk',
    description: 'Quickly read workspace files.',
    execute: async (args) => {
      if (!args[0]) return 'Usage: /disk <file_path>';
      const result = await core.executeSkillDirect('DiskSkill', { action: 'read', filePath: args[0] });
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
      
      let help = '🚀 Selfer v2.1.0 - Interactive Help\n\n';
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
      return `🛠️ Selfer Environment Config:\n` +
             `--------------------------\n` +
             `Provider : ${core.getProviderName()}\n` +
             `Model    : ${core.getModelName()}\n` +
             `Skills   : ${skills.length} active\n` +
             `CWD      : ${process.cwd()}`;
    }
  });
}
