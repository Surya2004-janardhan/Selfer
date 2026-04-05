import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export interface CostRecord {
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  timestamp: string;
}

/**
 * CostTracker.ts
 * Robust tracking of tokens and estimated USD cost.
 * Mirrors Claude Code's cost-tracker.ts architecture.
 */
export class CostTracker {
  private statsFile: string;
  private totalInput: number = 0;
  private totalOutput: number = 0;
  private totalCost: number = 0;

  constructor() {
    this.statsFile = path.join(os.homedir(), '.selfer', 'costs.json');
  }

  async initialize(): Promise<void> {
    try {
      if (await this.fileExists(this.statsFile)) {
        const data = await fs.readFile(this.statsFile, 'utf8');
        const parsed = JSON.parse(data);
        this.totalInput = parsed.totalInput || 0;
        this.totalOutput = parsed.totalOutput || 0;
        this.totalCost = parsed.totalCost || 0;
      }
    } catch (error) {
      console.error('Failed to initialize CostTracker:', error);
    }
  }

  async record(provider: string, model: string, input: number, output: number): Promise<void> {
    this.totalInput += input;
    this.totalOutput += output;
    
    // Simple estimation (e.g., Sonnet 3.5: $3/$15 per million)
    let rateIn = 0;
    let rateOut = 0;
    if (model.includes('sonnet')) {
      rateIn = 3 / 1_000_000;
      rateOut = 15 / 1_000_000;
    } else if (model.includes('gpt-4o')) {
      rateIn = 5 / 1_000_000;
      rateOut = 15 / 1_000_000;
    }

    const sessionCost = (input * rateIn) + (output * rateOut);
    this.totalCost += sessionCost;
    
    await this.save();
  }

  getStats() {
    return {
      totalInput: this.totalInput,
      totalOutput: this.totalOutput,
      totalCost: this.totalCost.toFixed(4)
    };
  }

  private async save(): Promise<void> {
    try {
      const dir = path.dirname(this.statsFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.statsFile, JSON.stringify({ 
        totalInput: this.totalInput, 
        totalOutput: this.totalOutput, 
        totalCost: this.totalCost 
      }, null, 2));
    } catch (error) {
      console.error('Failed to save costs:', error);
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
