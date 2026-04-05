import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'blocked';
  createdAt: string;
  updatedAt: string;
}

/**
 * TaskManager.ts
 * Core service for persistent task management.
 * Mirrors Claude Code's Task.js and tasks.ts architecture.
 */
export class TaskManager {
  private tasksFile: string;
  private tasks: Map<string, Task>;

  constructor() {
    this.tasksFile = path.join(os.homedir(), '.selfer', 'tasks.json');
    this.tasks = new Map();
  }

  async initialize(): Promise<void> {
    try {
      if (await this.fileExists(this.tasksFile)) {
        const data = await fs.readFile(this.tasksFile, 'utf8');
        const parsed = JSON.parse(data);
        for (const task of parsed) {
          this.tasks.set(task.id, task);
        }
      }
    } catch (error) {
      console.error('Failed to initialize TaskManager:', error);
    }
  }

  async createTask(title: string, description: string): Promise<Task> {
    const task: Task = {
      id: `task_${Math.random().toString(36).substring(7)}`,
      title,
      description,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.tasks.set(task.id, task);
    await this.save();
    return task;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    const task = this.tasks.get(id);
    if (!task) return null;
    const updated = { ...task, ...updates, updatedAt: new Date().toISOString() };
    this.tasks.set(id, updated);
    await this.save();
    return updated;
  }

  getTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  private async save(): Promise<void> {
    try {
      const dir = path.dirname(this.tasksFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.tasksFile, JSON.stringify(this.getTasks(), null, 2));
    } catch (error) {
      console.error('Failed to save tasks:', error);
    }
  }

  private async fileExists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }
}
