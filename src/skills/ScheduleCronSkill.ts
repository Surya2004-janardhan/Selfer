import { z } from 'zod';
import { BaseSkill, SkillResult } from './BaseSkill.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * TemporalSyncSkill.ts
 * Logic for scheduling recurring or delayed tasks.
 * (Ported and renamed from ScheduleCronTool)
 */
export class ScheduleCronSkill extends BaseSkill {
  name = 'ScheduleCron';
  description = 'Skill for scheduling future or recurring Selfer tasks/commands.';
 
  schema = z.object({
    action: z.enum(['create', 'list', 'delete']).default('create'),
    cron: z.string().optional().describe('The cron expression for scheduling.'),
    command: z.string().optional().describe('The command to execute.'),
    label: z.string().optional().describe('Label for the scheduled task.'),
    id: z.string().optional().describe('Schedule ID for delete action.')
  });

  private schedulesPath = path.join(os.homedir(), '.selfer', 'schedules.json');

  private async loadSchedules(): Promise<any[]> {
    try {
      const raw = await fs.readFile(this.schedulesPath, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async saveSchedules(items: any[]): Promise<void> {
    await fs.mkdir(path.dirname(this.schedulesPath), { recursive: true });
    await fs.writeFile(this.schedulesPath, JSON.stringify(items, null, 2), 'utf8');
  }

  async execute(input: z.infer<typeof this.schema>): Promise<SkillResult> {
    try {
      const schedules = await this.loadSchedules();

      if (input.action === 'list') {
        if (schedules.length === 0) {
          return { content: 'No schedules registered.', isError: false };
        }
        const lines = schedules.map(s => `- ${s.id} | ${s.cron} | ${s.label || s.command}`);
        return { content: `Registered schedules:\n${lines.join('\n')}`, isError: false };
      }

      if (input.action === 'delete') {
        if (!input.id) {
          return { content: 'Schedule delete requires id.', isError: true };
        }
        const next = schedules.filter(s => s.id !== input.id);
        if (next.length === schedules.length) {
          return { content: `Schedule ${input.id} not found.`, isError: true };
        }
        await this.saveSchedules(next);
        return { content: `Deleted schedule ${input.id}.`, isError: false };
      }

      if (!input.cron || !input.command) {
        return { content: 'Schedule create requires cron and command.', isError: true };
      }

      const item = {
        id: `sched_${Math.random().toString(36).slice(2, 10)}`,
        cron: input.cron,
        command: input.command,
        label: input.label || input.command,
        createdAt: new Date().toISOString()
      };
      schedules.push(item);
      await this.saveSchedules(schedules);
      return { content: `Scheduled ${item.label} (${item.id}) with cron: ${item.cron}.`, isError: false };
    } catch (error: any) {
      return { content: `Temporal Sync Error: ${error.message}`, isError: true };
    }
  }
}
