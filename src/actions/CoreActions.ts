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

  // /help - List all actions
  registry.register({
    name: 'help',
    description: 'Show all available Selfer actions.',
    execute: async () => {
      const actions = registry.getActions();
      return 'Available Selfer Actions:\n' + actions.map(a => `/${a.name} - ${a.description}`).join('\n');
    }
  });
}
