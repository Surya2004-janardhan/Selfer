/**
 * BaseSkill.ts
 * The abstract class for all Selfer skills (formerly Tools).
 * Provides a standardized interface for capability execution.
 */

import { ZodObject } from 'zod';

export interface SkillResult {
  content: string;
  isError: boolean;
  metadata?: Record<string, any>;
}

export abstract class BaseSkill {
  /** The unique identifier for the skill (e.g. 'FileSystemSkill') */
  abstract name: string;
  
  /** A clear description for the AI to understand when to use this skill */
  abstract description: string;
  
  /** Zod schema for input validation */
  abstract schema: ZodObject<any>;

  /**
   * The core execution logic of the skill.
   */
  abstract execute(input: any): Promise<SkillResult>;
}
