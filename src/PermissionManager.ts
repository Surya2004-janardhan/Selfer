/**
 * PermissionManager.ts
 * Logic for handling user approval for skill execution.
 * (Inspired by src-reference permission system)
 */

export type PermissionDecision = 'allow' | 'deny' | 'always-allow';

export class PermissionManager {
  private alwaysAllowSkills: Set<string> = new Set();
  private blockedPatterns: RegExp[] = [/rm\s+-rf\s+\//i, /mkfs/i, /\bdd\b/i];

  constructor() {
    // Skills that are generally safe and don't need prompts
    this.alwaysAllowSkills.add('PulseSkill');
    this.alwaysAllowSkills.add('RadarSkill');
    this.alwaysAllowSkills.add('FileRead');
    this.alwaysAllowSkills.add('Glob');
    this.alwaysAllowSkills.add('Grep');
    this.alwaysAllowSkills.add('CodeAwarenessSkill');
    this.alwaysAllowSkills.add('WebFetch');
    this.alwaysAllowSkills.add('LSP');
  }

  /**
   * Check if a skill requires explicit user permission.
   */
  async checkPermission(skillName: string, input: any): Promise<PermissionDecision> {
    if (skillName === 'Bash' && typeof input?.command === 'string') {
      if (this.blockedPatterns.some(p => p.test(input.command))) {
        return 'deny';
      }
    }

    if (this.alwaysAllowSkills.has(skillName)) {
      return 'allow';
    }

    // Phase 1: Simple console prompt (Real TUI prompt in Phase 3)
    if (skillName !== 'TaskSkill' && skillName !== 'FileWrite' && skillName !== 'FileEdit' && skillName !== 'Bash') {
      return 'allow';
    }

    console.log(`\n[SECURITY] Selfer wants to use ${skillName}`);
    console.log(`Input: ${JSON.stringify(input, null, 2)}`);
    
    // For now, in Phase 1/2 headless, we default to allow 
    // unless it's a known dangerous pattern.
    return 'allow'; 
  }

  addAlwaysAllow(skillName: string) {
    this.alwaysAllowSkills.add(skillName);
  }
}
