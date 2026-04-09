import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import chalk from 'chalk';

export interface ModelUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
  webSearchRequests: number;
  costUSD: number;
}

/**
 * CostTracker.ts
 * Enhanced tracking of tokens, durations, and estimated USD cost.
 * Parity with src-reference/cost-tracker.ts.
 */
export class CostTracker {
  private statsFile: string;
  private totalInput: number = 0;
  private totalOutput: number = 0;
  private totalCost: number = 0;
  private totalAPIDuration: number = 0;
  private totalToolDuration: number = 0;
  private modelUsage: Record<string, ModelUsage> = {};
  private startTime: number;

  constructor() {
    this.statsFile = path.join(os.homedir(), '.selfer', 'costs.json');
    this.startTime = Date.now();
  }

  async initialize(): Promise<void> {
    try {
      if (await this.fileExists(this.statsFile)) {
        const data = await fs.readFile(this.statsFile, 'utf8');
        const parsed = JSON.parse(data);
        this.totalInput = parsed.totalInput || 0;
        this.totalOutput = parsed.totalOutput || 0;
        this.totalCost = parsed.totalCost || 0;
        this.totalAPIDuration = parsed.totalAPIDuration || 0;
        this.totalToolDuration = parsed.totalToolDuration || 0;
        this.modelUsage = parsed.modelUsage || {};
      }
    } catch (error) {
      // Best effort initialization
    }
  }

  async record(provider: string, model: string, input: number, output: number, durationMs: number = 0): Promise<void> {
    this.totalInput += input;
    this.totalOutput += output;
    this.totalAPIDuration += durationMs;
    
    // Model-specific rates (Simplified estimates)
    let rateIn = 0;
    let rateOut = 0;
    
    if (model.includes('claude-3-5-sonnet')) {
      rateIn = 3 / 1_000_000;
      rateOut = 15 / 1_000_000;
    } else if (model.includes('gpt-4o')) {
      rateIn = 5 / 1_000_000;
      rateOut = 15 / 1_000_000;
    } else if (model.includes('gemini-1.5-pro')) {
      rateIn = 3.5 / 1_000_000;
      rateOut = 10.5 / 1_000_000;
    } else if (model.includes('gemini-1.5-flash')) {
      rateIn = 0.075 / 1_000_000;
      rateOut = 0.3 / 1_000_000;
    }

    const sessionCost = (input * rateIn) + (output * rateOut);
    this.totalCost += sessionCost;

    // Update model-specific usage
    if (!this.modelUsage[model]) {
      this.modelUsage[model] = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0
      };
    }

    const usage = this.modelUsage[model];
    usage.inputTokens += input;
    usage.outputTokens += output;
    usage.costUSD += sessionCost;
    
    await this.save();
  }

  async recordToolDuration(durationMs: number) {
    this.totalToolDuration += durationMs;
    await this.save();
  }

  getStats() {
    const totalDuration = Date.now() - this.startTime;
    return {
      totalInput: this.totalInput,
      totalOutput: this.totalOutput,
      totalCost: this.totalCost.toFixed(4),
      totalAPIDuration: this.totalAPIDuration,
      totalToolDuration: this.totalToolDuration,
      totalDuration,
      modelUsage: this.modelUsage
    };
  }

  formatSummary(): string {
    const stats = this.getStats();
    let summary = chalk.bold('\n📊 Session Usage Summary:\n');
    summary += `Total Cost:      ${chalk.green('$' + stats.totalCost)}\n`;
    summary += `Total Tokens:    ${stats.totalInput} in / ${stats.totalOutput} out\n`;
    summary += `Wall Duration:   ${(stats.totalDuration / 1000).toFixed(1)}s\n`;
    summary += `API Duration:    ${(stats.totalAPIDuration / 1000).toFixed(1)}s\n`;
    
    if (Object.keys(stats.modelUsage).length > 0) {
      summary += chalk.dim('\nUsage by Model:');
      for (const [model, usage] of Object.entries(stats.modelUsage)) {
        summary += chalk.dim(`\n  ${model.padEnd(25)} : $${usage.costUSD.toFixed(4)} (${usage.inputTokens} in / ${usage.outputTokens} out)`);
      }
    }
    
    return summary;
  }

  private async save(): Promise<void> {
    try {
      const dir = path.dirname(this.statsFile);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.statsFile, JSON.stringify({ 
        totalInput: this.totalInput, 
        totalOutput: this.totalOutput, 
        totalCost: this.totalCost,
        totalAPIDuration: this.totalAPIDuration,
        totalToolDuration: this.totalToolDuration,
        modelUsage: this.modelUsage
      }, null, 2));
    } catch (error) {
      // Fail silently
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
