import fs from 'fs';
import path from 'path';
import os from 'os';

export interface SelferConfig {
  provider: 'ollama' | 'anthropic' | 'openai' | 'gemini' | 'mock';
  model: string;
  anthropicKey?: string;
  openaiKey?: string;
  geminiKey?: string;
  ollamaEndpoint?: string;
}

export class ConfigManager {
  private configPath: string;

  constructor() {
    this.configPath = path.join(os.homedir(), '.selfer', 'config.json');
  }

  async loadConfig(): Promise<SelferConfig | null> {
    try {
      if (!fs.existsSync(this.configPath)) return null;
      const data = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading config:', error);
      return null;
    }
  }

  async saveConfig(config: SelferConfig): Promise<void> {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }
}
