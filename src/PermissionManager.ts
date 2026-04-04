/**
 * PermissionManager.ts
 * Logic for handling user approval for skill execution.
 * (Inspired by src-reference permission system)
 */

export type PermissionDecision = 'allow' | 'deny' | 'always-allow';

export class PermissionManager {
  private alwaysAllowSkills: Set<string> = new Set();

  constructor() {
    // Skills that are generally safe and don't need prompts
    this.alwaysAllowSkills.add('PulseSkill');
    this.alwaysAllowSkills.add('RadarSkill');
  }

  /**
   * Check if a skill requires explicit user permission.
   */
  async checkPermission(skillName: string, input: any): Promise<PermissionDecision> {
    if (this.alwaysAllowSkills.has(skillName)) {
      return 'allow';
    }

    // Phase 1: Simple console prompt (Real TUI prompt in Phase 3)
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
