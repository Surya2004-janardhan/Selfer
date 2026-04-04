/**
 * CommandRegistry.ts
 * Manages all slash commands (Actions) in Selfer.
 * (Ported and renamed from src-reference commands system)
 */

export interface SelferAction {
  name: string;
  description: string;
  execute: (args: string[]) => Promise<string>;
}

export class CommandRegistry {
  private actions: Map<string, SelferAction> = new Map();

  register(action: SelferAction) {
    this.actions.set(action.name, action);
  }

  async run(input: string): Promise<string | null> {
    if (!input.startsWith('/')) return null;

    const [cmdName, ...args] = input.slice(1).split(' ');
    const action = this.actions.get(cmdName);

    if (action) {
      return await action.execute(args);
    }

    return `Unknown action: /${cmdName}. Type /help for assistance.`;
  }

  getActions(): SelferAction[] {
    return Array.from(this.actions.values());
  }
}
